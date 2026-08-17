<?php
require_once __DIR__ . '/helpers.php';

$user = require_login();
$pdo = db();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = body_json();
    $action = (string)($data['action'] ?? '');
    if ($action !== 'mark_read') {
        json_error('Unknown notification action.', 422);
    }
    $pdo->prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?')
        ->execute([$user['user_id']]);
    json_out(['ok' => true]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Method not allowed.', 405);
}

$stmt = $pdo->prepare(
    'SELECT notification_id, type, title, description, is_read, created_at
     FROM notifications
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 50'
);
$stmt->execute([$user['user_id']]);

$out = array_map(function ($n) {
$icon = 'Bell';
        switch ($n['type']) {
            case 'attendance_verified':
                $icon = 'CheckCircle';
                break;
            case 'payroll_released':
                $icon = 'DollarSign';
                break;
            case 'attendance_rejected':
                $icon = 'XCircle';
                break;
            case 'vehicle_updated':
                $icon = 'Truck';
                break;
        }

        return [
        'id' => (int)$n['notification_id'],
        'type' => $n['type'],
        'title' => $n['title'],
        'description' => $n['description'],
        'timestamp' => date('Y-m-d h:i A', strtotime($n['created_at'])),
        'isRead' => (int)$n['is_read'] === 1,
        'icon' => $icon,
    ];
}, $stmt->fetchAll());

json_out($out);
