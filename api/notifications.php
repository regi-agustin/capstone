<?php
require_once __DIR__ . '/helpers.php';

$user = require_login();
$pdo = db();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = body_json();
    $action = (string)($data['action'] ?? '');
    
    if ($action === 'mark_read') {
        $pdo->prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?')
            ->execute([$user['user_id']]);
        json_out(['ok' => true]);
    }
    
    if ($action === 'clear_read') {
        $stmt = $pdo->prepare('DELETE FROM notifications WHERE user_id = ? AND is_read = 1');
        $stmt->execute([$user['user_id']]);
        $deleted = $stmt->rowCount();
        json_out(['ok' => true, 'deleted' => $deleted]);
    }
    
    json_error('Unknown notification action.', 422);
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

$notifications = $stmt->fetchAll();

$out = array_map(function ($n) {
    return [
        'id' => (int)$n['notification_id'],
        'type' => $n['type'],
        'title' => $n['title'],
        'description' => $n['description'],
        'timestamp' => date('Y-m-d h:i A', strtotime($n['created_at'])),
        'isRead' => (int)$n['is_read'] === 1,
        'icon' => match ($n['type']) {
            'attendance_verified' => 'CheckCircle',
            'payroll_released' => 'DollarSign',
            'attendance_rejected' => 'XCircle',
            'vehicle_updated' => 'Truck',
            'reservation_confirmed' => 'Calendar',
            'system_alert' => 'AlertCircle',
            'system_announcement' => 'Bell',
            default => 'Bell',
        },
    ];
}, $notifications);

json_out($out);
