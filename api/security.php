<?php
require_once __DIR__ . '/helpers.php';

$user = require_login();
$pdo = db();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Method not allowed.', 405);
}

$userId = (int)$user['user_id'];

json_out([
    'settings' => security_settings_for($pdo, $userId),
    'sessions' => login_sessions_for($pdo, $userId),
    'activity' => user_activity_for($pdo, $userId),
    'preferences' => preferences_for($pdo, $userId),
]);