<?php
require_once __DIR__ . '/helpers.php';

$user = require_login();
$pdo = db();

// Expose the account's RBAC permissions so the GUI can enable/disable
// actions per button (CenSys: HasPermission(scope, action) per control).
$permissions = [];
if (strcasecmp($user['role'], 'superadmin') !== 0) {
    $stmt = $pdo->prepare('SELECT scope, action FROM user_permissions WHERE user_id = ? AND is_allowed = 1');
    $stmt->execute([$user['user_id']]);
    foreach ($stmt->fetchAll() as $p) {
        $permissions[] = ['scope' => $p['scope'], 'action' => $p['action']];
    }
}

json_out([
    'user_id' => (int)$user['user_id'],
    'username' => $user['username'],
    'fullname' => $user['fullname'],
    'role' => $user['role'],
    'permissions' => $permissions,
]);
