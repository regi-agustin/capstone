<?php
require_once __DIR__ . '/helpers.php';

$user = require_login();
$pdo = db();

// Driver endpoints operate on the driver record linked to the logged-in user.
// DMH/admin roles may pass ?driver_id= to view a specific driver.
$driverId = null;

if (in_array($user['role'], ['superadmin', 'admin', 'driver_management_head'], true)) {
    $driverId = (int)($_GET['driver_id'] ?? 0);
    if ($driverId <= 0) json_error('driver_id is required.', 422);
} else {
    if ($user['role'] !== 'driver') json_error('Forbidden.', 403);
    $stmt = $pdo->prepare('SELECT driver_id FROM drivers WHERE user_id = ?');
    $stmt->execute([$user['user_id']]);
    $driverId = (int)$stmt->fetchColumn();
    if ($driverId <= 0) json_error('No driver record linked to this account.', 404);
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $rows = $pdo->prepare(
        'SELECT a.attendance_id, a.attendance_date, a.time_in, a.time_out, a.verification_status,
                v.model, v.plate_number
         FROM attendance a
         JOIN vehicles v ON v.vehicle_id = a.vehicle_id
         WHERE a.driver_id = ?
         ORDER BY a.attendance_date DESC'
    );
    $rows->execute([$driverId]);

    $out = array_map(function ($a) {
        return [
            'id' => (int)$a['attendance_id'],
            'date' => $a['attendance_date'],
            'vehicle' => $a['model'],
            'status' => 'Present',
            'timeIn' => fmt_time($a['time_in']),
            'timeOut' => fmt_time($a['time_out']),
            'verificationStatus' => ucfirst($a['verification_status']),
        ];
    }, $rows->fetchAll());

    json_out($out);
}

if ($method === 'POST') {
    $data = body_json();
    $action = $data['action'] ?? 'time_in';

    if ($action === 'time_out') {
        $stmt = $pdo->prepare(
            'UPDATE attendance SET time_out = CURTIME()
             WHERE driver_id = ? AND attendance_date = CURDATE() AND time_out IS NULL'
        );
        $stmt->execute([$driverId]);
        if ($stmt->rowCount() === 0) json_error('No active time-in record for today.', 404);
        json_out(['ok' => true]);
    }

    // time_in with plate-photo upload (OCR verification is pending until approved)
    $res = active_reservation_for_driver($pdo, $driverId);
    if (!$res || !$res['vehicle_id']) {
        json_error('No assigned vehicle found for today.', 422);
    }
    $vehicleId = (int)$res['vehicle_id'];

    // Existing record for today -> reject duplicates
    $stmt = $pdo->prepare('SELECT attendance_id FROM attendance WHERE driver_id = ? AND attendance_date = CURDATE()');
    $stmt->execute([$driverId]);
    if ($stmt->fetch()) json_error('Attendance already recorded for today.', 409);

    $imagePath = null;
    $image = (string)($data['image'] ?? '');
    if (preg_match('#^data:image/(png|jpe?g|webp);base64,(.+)$#i', $image, $m)) {
        $dir = __DIR__ . '/uploads/attendance';
        if (!is_dir($dir)) mkdir($dir, 0777, true);
        $imagePath = '/fleetops/api/uploads/attendance/' . date('Ymd_His') . '_' . $driverId . '.' . strtolower($m[1]);
        file_put_contents($dir . '/' . basename($imagePath), base64_decode($m[2]));
    }

    $stmt = $pdo->prepare(
        'INSERT INTO attendance (driver_id, vehicle_id, attendance_date, time_in, vehicle_image, verification_status)
         VALUES (?, ?, CURDATE(), CURTIME(), ?, "pending")'
    );
    $stmt->execute([$driverId, $vehicleId, $imagePath]);

    json_out([
        'id' => (int)$pdo->lastInsertId(),
        'verificationStatus' => 'Pending',
    ], 201);
}

json_error('Method not allowed.', 405);
