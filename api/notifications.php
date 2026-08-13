<?php
require_once __DIR__ . '/helpers.php';

$user = require_login();
$pdo = db();

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
            default => 'Bell',
        },
    ];
}, $stmt->fetchAll());

json_out($out);
