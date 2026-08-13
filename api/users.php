<?php
require_once __DIR__ . '/helpers.php';

$user = require_login();
$pdo = db();

// Accounts are managed from the Super Admin console. Only superadmin and
// admin (with the Accounts permission) may touch them — mirroring CenSys,
// where buttons are enabled only when HasPermission("Accounts", action).
if (!in_array($user['role'], ['superadmin', 'admin'], true)) json_error('Forbidden.', 403);

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    require_permission($pdo, $user, 'Accounts', 'View');

    $rows = $pdo->query(
        'SELECT u.user_id, u.username, u.fullname, u.email, u.contact_number,
                u.role, u.status, u.created_at,
                d.driver_id, d.license_number, d.license_expiry
         FROM users u
         LEFT JOIN drivers d ON d.user_id = u.user_id
         ORDER BY u.created_at DESC'
    )->fetchAll();

    $permsByUser = [];
    foreach ($pdo->query('SELECT user_id, scope, action FROM user_permissions WHERE is_allowed = 1') as $p) {
        $permsByUser[(int)$p['user_id']][] = ['scope' => $p['scope'], 'action' => $p['action']];
    }

    $out = array_map(function ($r) use ($permsByUser) {
        return [
            'id' => (int)$r['user_id'],
            'username' => $r['username'],
            'fullname' => $r['fullname'],
            'email' => $r['email'],
            'contactNumber' => $r['contact_number'],
            'role' => $r['role'],
            'status' => $r['status'],
            'createdAt' => date('Y-m-d', strtotime($r['created_at'])),
            'permissions' => $permsByUser[(int)$r['user_id']] ?? [],
            'linkedDriver' => $r['driver_id'] ? [
                'id' => 'DRV-' . str_pad((string)$r['driver_id'], 3, '0', STR_PAD_LEFT),
                'licenseNumber' => $r['license_number'],
                'licenseExpiry' => $r['license_expiry'],
            ] : null,
        ];
    }, $rows);

    json_out([
        'users' => $out,
        'matrix' => permission_matrix(),
    ]);
}

if ($method === 'POST') {
    require_permission($pdo, $user, 'Accounts', 'Add');

    $b = body_json();

    $username = trim((string)($b['username'] ?? ''));
    $fullname = trim((string)($b['fullname'] ?? ''));
    $password = (string)($b['password'] ?? '');
    $role = (string)($b['role'] ?? '');
    $email = trim((string)($b['email'] ?? ''));
    $contact = trim((string)($b['contactNumber'] ?? ''));
    $permissions = $b['permissions'] ?? [];

    $allowedRoles = ['superadmin', 'admin', 'reservation_officer', 'driver_management_head',
                     'payroll_officer', 'billing_officer', 'driver', 'auditor', 'customer'];

    // CenSys validation rules
    if ($username === '' || $fullname === '') json_error('Username and full name are required.');
    if (strlen($username) < 3) json_error('Username must be at least 3 characters.');
    if (strlen($username) > 50) json_error('Username cannot exceed 50 characters.');
    if (!in_array($role, $allowedRoles, true)) json_error('Invalid role.');
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) json_error('Invalid email format.');
    if ($password === '') json_error('Password is required.');
    if (!preg_match('/^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};:\x27",.\/<>?]).{8,}$/', $password)) {
        json_error('Password must be 8+ chars with uppercase, lowercase, number, and symbol.');
    }

    $exists = $pdo->prepare('SELECT user_id FROM users WHERE username = ?');
    $exists->execute([$username]);
    if ($exists->fetch()) json_error('This username is already taken.');

    $validMatrix = permission_matrix();
    $cleanPerms = [];
    foreach ($permissions as $perm) {
        $scope = (string)($perm['scope'] ?? '');
        $action = (string)($perm['action'] ?? '');
        if (isset($validMatrix[$scope]) && in_array($action, $validMatrix[$scope], true)) {
            $cleanPerms[] = [$scope, $action];
        }
    }

    $pdo->beginTransaction();
    try {
        $pdo->prepare(
            'INSERT INTO users (username, password_hash, fullname, email, contact_number, role, status)
             VALUES (?, ?, ?, ?, ?, ?, "active")'
        )->execute([$username, hash('sha256', $password), $fullname, $email ?: null, $contact ?: null, $role]);

        $userId = (int)$pdo->lastInsertId();

        // CenSys: Home/View is always granted
        if (!in_array(['Home', 'View'], $cleanPerms, true)) {
            $cleanPerms[] = ['Home', 'View'];
        }

        $driverId = null;
        if ($role === 'driver') {
            $license = trim((string)($b['licenseNumber'] ?? ''));
            $licenseExpiry = trim((string)($b['licenseExpiry'] ?? ''));
            if ($license !== '' && $licenseExpiry !== '') {
                $licCheck = $pdo->prepare('SELECT driver_id FROM drivers WHERE license_number = ?');
                $licCheck->execute([$license]);
                if ($licCheck->fetch()) {
                    throw new RuntimeException('A driver with license number ' . $license . ' already exists.');
                }
                $pdo->prepare(
                    'INSERT INTO drivers (user_id, fullname, contact_number, license_number, license_expiry, hire_date, status)
                     VALUES (?, ?, ?, ?, ?, CURDATE(), "active")'
                )->execute([$userId, $fullname, $contact ?: '-', $license, $licenseExpiry]);
                $driverId = (int)$pdo->lastInsertId();
            }
        }

        $ins = $pdo->prepare('INSERT INTO user_permissions (user_id, scope, action) VALUES (?, ?, ?)');
        foreach ($cleanPerms as [$scope, $action]) {
            $ins->execute([$userId, $scope, $action]);
        }

        log_action($pdo, (int)$user['user_id'], 'CREATE_ACCOUNT',
            'Created user account: ' . $username . ' (Role: ' . $role . ', Email: ' . ($email ?: 'none') . ')');

        $pdo->commit();
        json_out(['id' => $userId, 'driverId' => $driverId, 'message' => 'Account created successfully.'], 201);
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error($e->getMessage());
    }
}

if ($method === 'PATCH') {
    $b = body_json();
    $targetId = (int)($b['id'] ?? 0);
    if ($targetId <= 0) json_error('Missing account id.');

    $target = $pdo->prepare('SELECT user_id, username, role, status, fullname FROM users WHERE user_id = ?');
    $target->execute([$targetId]);
    $row = $target->fetch();
    if (!$row) json_error('Account not found.', 404);
    if ((int)$row['user_id'] === (int)$user['user_id']) {
        json_error('You cannot modify your own account here.');
    }

    // Status toggle (activate / suspend)
    if (isset($b['status'])) {
        require_permission($pdo, $user, 'Accounts', 'Edit');
        $newStatus = (string)$b['status'];
        if (!in_array($newStatus, ['active', 'suspended', 'inactive'], true)) json_error('Invalid status.');
        $pdo->prepare('UPDATE users SET status = ? WHERE user_id = ?')->execute([$newStatus, $targetId]);

        if ($row['role'] === 'driver' && $newStatus !== 'active') {
            $pdo->prepare('UPDATE drivers SET status = ? WHERE user_id = ?')->execute([$newStatus, $targetId]);
        }
        log_action($pdo, (int)$user['user_id'], 'UPDATE_ACCOUNT',
            'Set account status to ' . $newStatus . ' (user id ' . $targetId . ').');
        json_out(['message' => 'Account ' . $newStatus . '.']);
    }

    // Password reset
    if (isset($b['password'])) {
        require_permission($pdo, $user, 'Accounts', 'Edit');
        $password = (string)$b['password'];
        if (!preg_match('/^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};:\x27",.\/<>?]).{8,}$/', $password)) {
            json_error('Password must be 8+ chars with uppercase, lowercase, number, and symbol.');
        }
        $pdo->prepare('UPDATE users SET password_hash = ? WHERE user_id = ?')
            ->execute([hash('sha256', $password), $targetId]);
        log_action($pdo, (int)$user['user_id'], 'UPDATE_ACCOUNT',
            'Reset password for user id ' . $targetId . '.');
        json_out(['message' => 'Password reset successfully.']);
    }

    // Full edit (CenSys UpdateAccount): fields + role + permission matrix.
    // Password optional — only replaced when a new one is provided.
    if (isset($b['edit'])) {
        require_permission($pdo, $user, 'Accounts', 'Edit');

        $fullname = trim((string)($b['edit']['fullname'] ?? $row['fullname'] ?? ''));
        $role = (string)($b['edit']['role'] ?? $row['role']);
        $email = trim((string)($b['edit']['email'] ?? ''));
        $contact = trim((string)($b['edit']['contactNumber'] ?? ''));

        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) json_error('Invalid email format.');

        $sql = 'UPDATE users SET fullname = ?, email = ?, contact_number = ?, role = ?';
        $args = [$fullname, $email ?: null, $contact ?: null, $role];
        $password = (string)($b['edit']['password'] ?? '');
        if ($password !== '') {
            if (!preg_match('/^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};:\x27",.\/<>?]).{8,}$/', $password)) {
                json_error('Password must be 8+ chars with uppercase, lowercase, number, and symbol.');
            }
            $sql .= ', password_hash = ?';
            $args[] = hash('sha256', $password);
        }
        $sql .= ' WHERE user_id = ?';
        $args[] = $targetId;
        $pdo->prepare($sql)->execute($args);

        // Replace permission rows (CenSys ReplaceSelectedPermissions)
        if (isset($b['edit']['permissions'])) {
            $validMatrix = permission_matrix();
            $cleanPerms = [];
            foreach ($b['edit']['permissions'] as $perm) {
                $scope = (string)($perm['scope'] ?? '');
                $action = (string)($perm['action'] ?? '');
                if (isset($validMatrix[$scope]) && in_array($action, $validMatrix[$scope], true)) {
                    $cleanPerms[] = [$scope, $action];
                }
            }
            if (!in_array(['Home', 'View'], $cleanPerms, true)) {
                $cleanPerms[] = ['Home', 'View'];
            }

            $pdo->prepare('DELETE FROM user_permissions WHERE user_id = ?')->execute([$targetId]);
            $ins = $pdo->prepare('INSERT INTO user_permissions (user_id, scope, action) VALUES (?, ?, ?)');
            foreach ($cleanPerms as [$scope, $action]) {
                $ins->execute([$targetId, $scope, $action]);
            }
        }

        log_action($pdo, (int)$user['user_id'], 'UPDATE_ACCOUNT',
            'Updated user account (user id ' . $targetId . ', Role: ' . $role . ').');
        json_out(['message' => 'Account updated successfully.']);
    }

    json_error('Nothing to update.');
}

if ($method === 'DELETE') {
    // CenSys soft delete: archive instead of hard delete
    require_permission($pdo, $user, 'Accounts', 'Delete');

    $targetId = (int)($_GET['id'] ?? 0);
    if ($targetId <= 0) json_error('Missing account id.');
    if ($targetId === (int)$user['user_id']) json_error('You cannot archive your own account.');

    $target = $pdo->prepare('SELECT user_id, username, role FROM users WHERE user_id = ?');
    $target->execute([$targetId]);
    $row = $target->fetch();
    if (!$row) json_error('Account not found.', 404);

    $pdo->prepare('UPDATE users SET status = "inactive" WHERE user_id = ?')->execute([$targetId]);
    if ($row['role'] === 'driver') {
        $pdo->prepare('UPDATE drivers SET status = "inactive" WHERE user_id = ?')->execute([$targetId]);
    }
    log_action($pdo, (int)$user['user_id'], 'ARCHIVE_ACCOUNT',
        'Archived user account: ' . $row['username'] . ' (Role: ' . $row['role'] . ')');

    json_out(['message' => 'Account archived successfully.']);
}

json_error('Method not allowed.', 405);
