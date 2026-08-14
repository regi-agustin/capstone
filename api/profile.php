<?php
require_once __DIR__ . '/helpers.php';

$user = require_login();
$pdo = db();

// Non-driver roles get their basic account profile.
if ($user['role'] !== 'driver') {
    $stmt = $pdo->prepare('SELECT username, fullname, email, contact_number, role, status, is_verified, created_at FROM users WHERE user_id = ?');
    $stmt->execute([$user['user_id']]);
    $u = $stmt->fetch();
    if (!$u) json_error('Account not found.', 404);

    $userId = (int)$user['user_id'];

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

$stmt = $pdo->prepare('SELECT * FROM drivers WHERE user_id = ?');
$stmt->execute([$user['user_id']]);
$driver = $stmt->fetch();
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
    ];
}

// Attendance stats for the current month
$monthStart = date('Y-m-01');
$monthRows = $pdo->prepare(
    'SELECT COUNT(*) AS total, SUM(time_out IS NOT NULL) AS with_timeout FROM attendance
     WHERE driver_id = ? AND attendance_date >= ?'
);
$monthRows->execute([$driverId, $monthStart]);
$m = $monthRows->fetch();

$totalHours = $pdo->prepare(
    'SELECT COALESCE(SUM(TIMESTAMPDIFF(HOUR, time_in, COALESCE(time_out, time_in))), 0)
     FROM attendance WHERE driver_id = ? AND attendance_date >= ?'
);
$totalHours->execute([$driverId, $monthStart]);
$hours = (float)$totalHours->fetchColumn();

$avgRating = $pdo->prepare('SELECT COALESCE(AVG(rating), 0) FROM feedback f JOIN reservations r ON r.reservation_id = f.reservation_id WHERE r.driver_id = ?');
$avgRating->execute([$driverId]);
$rating = (float)$avgRating->fetchColumn();

$onTime = $pdo->prepare(
    'SELECT COALESCE(SUM(time_in <= "08:00:00"), 0) AS on_time, COUNT(*) AS total FROM attendance WHERE driver_id = ?'
);
$onTime->execute([$driverId]);
$onTimeRow = $onTime->fetch();
$onTimeCount = (int)($onTimeRow['on_time'] ?? 0);
$totalCount = (int)($onTimeRow['total'] ?? 0);

$latestPayroll = $pdo->prepare('SELECT status FROM payroll WHERE driver_id = ? ORDER BY payroll_date DESC LIMIT 1');
$latestPayroll->execute([$driverId]);
$payrollStatus = ucfirst((string)$latestPayroll->fetchColumn());

// Currently clocked in (today's record without a time out)
$clocked = $pdo->prepare(
    'SELECT attendance_id FROM attendance
     WHERE driver_id = ? AND attendance_date = CURDATE() AND time_out IS NULL'
);
$clocked->execute([$driverId]);

$presentDays = (int)($m['total'] ?? 0);

json_out([
    'clockedIn' => (bool)$clocked->fetchColumn(),
    'driver' => [
        'id' => 'DRV-' . str_pad((string)$driverId, 3, '0', STR_PAD_LEFT),
        'name' => $driver['fullname'],
        'email' => '',
        'status' => ucfirst($driver['status']),
        'licenseNumber' => $driver['license_number'],
        'licenseExpiry' => $driver['license_expiry'],
        'department' => '',
        'contactNumber' => $driver['contact_number'],
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
    ],
]);