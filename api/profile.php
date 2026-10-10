<?php
require_once __DIR__ . '/helpers.php';

$user = require_login();
$pdo = db();
$method = $_SERVER['REQUEST_METHOD'];
$userId = (int)$user['user_id'];

function driver_for_user(PDO $pdo, int $userId): ?array
{
    $stmt = $pdo->prepare(
        'SELECT d.*, u.email AS user_email, u.contact_number AS user_contact
         FROM drivers d
         JOIN users u ON u.user_id = d.user_id
         WHERE d.user_id = ?'
    );
    $stmt->execute([$userId]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function validate_contact_number(string $contact): ?string
{
    $contact = trim($contact);
    if ($contact === '') {
        return 'Contact number is required.';
    }
    if (mb_strlen($contact) > 20) {
        return 'Contact number must be 20 characters or fewer.';
    }
    $digits = preg_replace('/\D/', '', $contact);
    if ($digits === null || strlen($digits) < 7 || strlen($digits) > 15) {
        return 'Please provide a valid contact number (7–15 digits).';
    }
    return null;
}

function validate_email_field(string $email): ?string
{
    $email = trim($email);
    if ($email === '') {
        return 'Email address is required.';
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return 'Please provide a valid email address.';
    }
    if (mb_strlen($email) > 100) {
        return 'Email address must be 100 characters or fewer.';
    }
    return null;
}

function driver_has_profile_image_column(PDO $pdo): bool
{
    static $has = null;
    if ($has === null) {
        $has = (bool)$pdo->query("SHOW COLUMNS FROM drivers LIKE 'profile_image'")->fetch();
    }
    return $has;
}

function save_profile_image(PDO $pdo, int $driverId, string $image, ?string $existingPath): ?string
{
    if (!preg_match('#^data:image/(png|jpe?g|webp);base64,(.+)$#i', $image, $m)) {
        json_error('Profile image must be a PNG, JPEG, or WebP file.', 422);
    }

    $raw = base64_decode($m[2], true);
    if ($raw === false || strlen($raw) > 5 * 1024 * 1024) {
        json_error('Profile image must be 5 MB or smaller.', 422);
    }

    $dir = __DIR__ . '/uploads/profile';
    if (!is_dir($dir)) {
        mkdir($dir, 0777, true);
    }

    $filename = date('Ymd_His') . '_' . $driverId . '.' . strtolower($m[1]);
    $fullPath = $dir . '/' . $filename;
    if (file_put_contents($fullPath, $raw) === false) {
        json_error('Failed to save profile image.', 500);
    }

    $publicPath = '/fleetops/api/uploads/profile/' . $filename;
    if ($existingPath) {
        $oldFile = __DIR__ . '/uploads/profile/' . basename($existingPath);
        if (is_file($oldFile)) {
            @unlink($oldFile);
        }
    }

    return $publicPath;
}

if ($method === 'POST') {
    $data = body_json();
    $action = trim((string)($data['action'] ?? ''));

    if ($action === 'update_profile') {
        $email = trim((string)($data['email'] ?? ''));
        $contactNumber = trim((string)($data['contactNumber'] ?? ''));

        if ($err = validate_email_field($email)) {
            json_error($err, 422);
        }
        if ($err = validate_contact_number($contactNumber)) {
            json_error($err, 422);
        }

        if ($user['role'] === 'driver') {
            $driver = driver_for_user($pdo, $userId);
            if (!$driver) {
                json_error('No driver record linked to this account.', 404);
            }

            $pdo->beginTransaction();
            try {
                $pdo->prepare(
                    'UPDATE users SET email = ?, contact_number = ? WHERE user_id = ?'
                )->execute([$email, $contactNumber, $userId]);

                $pdo->prepare(
                    'UPDATE drivers SET contact_number = ? WHERE driver_id = ? AND user_id = ?'
                )->execute([$contactNumber, (int)$driver['driver_id'], $userId]);

                $pdo->commit();
            } catch (Throwable $e) {
                $pdo->rollBack();
                json_error('Failed to update profile.', 500);
            }

            log_action($pdo, $userId, 'UPDATE_PROFILE', 'Driver updated contact details');
            json_out(['ok' => true]);
        }

        // Optional identity fields (customer edit-profile). Keys that are absent
        // are left unchanged, so older callers sending only email/contact still work.
        $fullname = array_key_exists('fullname', $data) ? trim((string)$data['fullname']) : null;
        $username = array_key_exists('username', $data) ? trim((string)$data['username']) : null;

        if ($fullname !== null) {
            if ($fullname === '') {
                json_error('Full name is required.', 422);
            }
            if (mb_strlen($fullname) > 100) {
                json_error('Full name must be 100 characters or fewer.', 422);
            }
        }
        if ($username !== null) {
            if ($username === '') {
                json_error('Username is required.', 422);
            }
            if (mb_strlen($username) < 3 || mb_strlen($username) > 50) {
                json_error('Username must be 3 to 50 characters.', 422);
            }
            $taken = $pdo->prepare('SELECT user_id FROM users WHERE username = ? AND user_id <> ?');
            $taken->execute([$username, $userId]);
            if ($taken->fetch()) {
                json_error('This username is already taken.', 422);
            }
        }

        $fields = ['email = ?', 'contact_number = ?'];
        $args = [$email, $contactNumber];
        if ($fullname !== null) {
            $fields[] = 'fullname = ?';
            $args[] = $fullname;
        }
        if ($username !== null) {
            $fields[] = 'username = ?';
            $args[] = $username;
        }
        $args[] = $userId;

        $stmt = $pdo->prepare('UPDATE users SET ' . implode(', ', $fields) . ' WHERE user_id = ?');
        $stmt->execute($args);
        log_action($pdo, $userId, 'UPDATE_PROFILE', 'Updated profile details');
        json_out(['ok' => true]);
    }

    if ($action === 'upload_profile_image') {
        if ($user['role'] !== 'driver') {
            json_error('Profile image upload is only available for driver accounts.', 403);
        }
        if (!driver_has_profile_image_column($pdo)) {
            json_error('Profile image upload is not available on this system.', 501);
        }

        $driver = driver_for_user($pdo, $userId);
        if (!$driver) {
            json_error('No driver record linked to this account.', 404);
        }

        $image = (string)($data['image'] ?? '');
        if ($image === '') {
            json_error('Profile image is required.', 422);
        }

        $driverId = (int)$driver['driver_id'];
        $existing = $driver['profile_image'] ?? null;
        $publicPath = save_profile_image($pdo, $driverId, $image, $existing);

        $pdo->prepare(
            'UPDATE drivers SET profile_image = ? WHERE driver_id = ? AND user_id = ?'
        )->execute([$publicPath, $driverId, $userId]);

        log_action($pdo, $userId, 'UPDATE_PROFILE', 'Driver updated profile image');
        json_out(['ok' => true, 'profileImage' => $publicPath]);
    }

    if ($action === 'change_password') {
        $current = (string)($data['currentPassword'] ?? '');
        $new = (string)($data['newPassword'] ?? '');
        $confirm = (string)($data['confirmPassword'] ?? '');

        if ($current === '' || $new === '') {
            json_error('Current and new passwords are required.', 422);
        }
        if ($new !== $confirm) {
            json_error('New password and confirmation do not match.', 422);
        }
        if (strlen($new) < 8) {
            json_error('Password must be at least 8 characters.', 422);
        }

        $stmt = $pdo->prepare('SELECT password_hash FROM users WHERE user_id = ?');
        $stmt->execute([$userId]);
        $hash = (string)$stmt->fetchColumn();
        if ($hash === '' || !hash_equals($hash, hash('sha256', $current))) {
            json_error('Current password is incorrect.', 422);
        }

        $pdo->prepare('UPDATE users SET password_hash = ? WHERE user_id = ?')
            ->execute([hash('sha256', $new), $userId]);
        $pdo->prepare(
            'UPDATE security_settings SET password_strength = "Strong", last_security_check = CURDATE() WHERE user_id = ?'
        )->execute([$userId]);
        log_action($pdo, $userId, 'CHANGE_PASSWORD', 'Password changed');
        json_out(['ok' => true]);
    }

    json_error('Action must be one of: update_profile, upload_profile_image, change_password.', 422);
}

// Non-driver roles get their basic account profile.
if ($user['role'] !== 'driver') {
    $stmt = $pdo->prepare('SELECT username, fullname, email, contact_number, role, status, is_verified, created_at FROM users WHERE user_id = ?');
    $stmt->execute([$user['user_id']]);
    $u = $stmt->fetch();
    if (!$u) json_error('Account not found.', 404);

    json_out([
        'role' => $u['role'],
        'isVerified' => (bool)($u['is_verified'] ?? 1),
        'account' => [
            'name' => $u['fullname'],
            'username' => $u['username'],
            'email' => $u['email'] ?? '',
            'contactNumber' => $u['contact_number'] ?? '',
            'memberSince' => $u['created_at'] ? substr($u['created_at'], 0, 10) : '',
            'status' => ucfirst($u['status'] ?? 'active'),
        ],
        'preferences' => preferences_for($pdo, $userId),
        'security' => [
            'settings' => security_settings_for($pdo, $userId),
            'activity' => user_activity_for($pdo, $userId),
        ],
    ]);
}

$driver = driver_for_user($pdo, $userId);
if (!$driver) json_error('No driver record linked to this account.', 404);

$driverId = (int)$driver['driver_id'];

// Assigned vehicle from the driver's active reservation
$vehicle = null;
$res = active_reservation_for_driver($pdo, $driverId);
if ($res) {
    $vehicle = [
        'id' => 'VH-' . str_pad((string)$res['vehicle_id'], 3, '0', STR_PAD_LEFT),
        'name' => $res['model'],
        'plateNumber' => $res['plate_number'],
        'type' => $res['vehicle_type'],
        'assignedDate' => $res['start_date'],
        'vehicleId' => (int)$res['vehicle_id'],
    ];
}

// Attendance stats for the current month
$monthStart = date('Y-m-01');
$monthRows = $pdo->prepare(
    'SELECT COUNT(*) AS total, SUM(time_out IS NOT NULL) AS with_timeout FROM attendance
     WHERE driver_id = ? AND attendance_date >= ? AND verification_status = "verified"'
);
$monthRows->execute([$driverId, $monthStart]);
$m = $monthRows->fetch();

$totalHours = $pdo->prepare(
    'SELECT COALESCE(SUM(TIMESTAMPDIFF(HOUR, time_in, COALESCE(time_out, time_in))), 0)
     FROM attendance WHERE driver_id = ? AND attendance_date >= ? AND verification_status = "verified"'
);
$totalHours->execute([$driverId, $monthStart]);
$hours = (float)$totalHours->fetchColumn();

$avgRating = $pdo->prepare('SELECT COALESCE(AVG(rating), 0) FROM feedback f JOIN reservations r ON r.reservation_id = f.reservation_id WHERE r.driver_id = ?');
$avgRating->execute([$driverId]);
$rating = (float)$avgRating->fetchColumn();

$onTime = $pdo->prepare(
    'SELECT COALESCE(SUM(time_in <= "08:00:00"), 0) AS on_time, COUNT(*) AS total FROM attendance WHERE driver_id = ? AND verification_status = "verified"'
);
$onTime->execute([$driverId]);
$onTimeRow = $onTime->fetch();
$onTimeCount = (int)($onTimeRow['on_time'] ?? 0);
$totalCount = (int)($onTimeRow['total'] ?? 0);

$latestPayroll = $pdo->prepare('SELECT status FROM payroll WHERE driver_id = ? ORDER BY payroll_date DESC LIMIT 1');
$latestPayroll->execute([$driverId]);
$payrollStatus = ucfirst((string)$latestPayroll->fetchColumn());

// Currently clocked in (today's record without a time out - accept both verified and pending)
$clocked = $pdo->prepare(
    'SELECT attendance_id FROM attendance
     WHERE driver_id = ? AND attendance_date = CURDATE() AND time_out IS NULL AND verification_status IN ("verified", "pending")'
);
$clocked->execute([$driverId]);

$unread = $pdo->prepare('SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0');
$unread->execute([$userId]);
$unreadCount = (int)$unread->fetchColumn();

$presentDays = (int)($m['total'] ?? 0);
$profileImage = null;
if (driver_has_profile_image_column($pdo) && !empty($driver['profile_image'])) {
    $profileImage = $driver['profile_image'];
}

json_out([
    'clockedIn' => (bool)$clocked->fetchColumn(),
    'driver' => [
        'id' => 'DRV-' . str_pad((string)$driverId, 3, '0', STR_PAD_LEFT),
        'name' => $driver['fullname'],
        'email' => $driver['user_email'] ?? '',
        'status' => ucfirst($driver['status']),
        'employmentStatus' => ucfirst($driver['status']),
        'licenseNumber' => $driver['license_number'],
        'licenseExpiry' => $driver['license_expiry'],
        'department' => '',
        'contactNumber' => $driver['contact_number'],
        'profileImage' => $profileImage,
        'rating' => round($rating, 1),
        'onTimeAttendance' => $totalCount > 0 ? round($onTimeCount / $totalCount * 100) . '%' : '0%',
    ],
    'vehicle' => $vehicle,
    'stats' => [
        'totalAttendanceThisMonth' => $presentDays,
        'presentDays' => $presentDays,
        'absentDays' => 0,
        'latestPayrollStatus' => $payrollStatus ?: 'None',
        'totalHoursThisMonth' => (int)$hours,
        'averageRating' => round($rating, 1),
        'onTimeAttendance' => $totalCount > 0 ? round($onTimeCount / $totalCount * 100) . '%' : '0%',
        'unreadNotifications' => $unreadCount,
    ],
]);
