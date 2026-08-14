<?php
require_once __DIR__ . '/helpers.php';

$user = require_login();
require_role($user, ['superadmin', 'admin', 'driver_management_head', 'payroll_officer']);

$pdo = db();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $driverId = (int)($_GET['driver_id'] ?? 0);

    $sql = 'SELECT tl.log_id, tl.driver_id, tl.vehicle_id, tl.reservation_id, tl.trip_date,
                   tl.start_time, tl.end_time, tl.start_location, tl.end_location,
                   tl.trip_distance, tl.expenses, tl.remarks,
                   d.fullname AS driver_name, v.model, v.plate_number, r.trip_code
            FROM trip_logs tl
            JOIN drivers d ON d.driver_id = tl.driver_id
            JOIN vehicles v ON v.vehicle_id = tl.vehicle_id
            LEFT JOIN reservations r ON r.reservation_id = tl.reservation_id';
    $params = [];
    if ($driverId > 0) {
        $sql .= ' WHERE tl.driver_id = ?';
        $params[] = $driverId;
    }
    $sql .= ' ORDER BY tl.trip_date DESC, tl.log_id DESC';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $out = array_map(function ($t) {
        $hours = null;
        if ($t['start_time'] && $t['end_time']) {
            $hours = round(
                (strtotime($t['end_time']) - strtotime($t['start_time'])) / 3600,
                2
            );
        }
        return [
            'id' => (int)$t['log_id'],
            'driverId' => (int)$t['driver_id'],
            'driverName' => $t['driver_name'],
            'vehicle' => $t['model'],
            'plateNumber' => $t['plate_number'],
            'tripCode' => $t['trip_code'] ?? '',
            'date' => $t['trip_date'],
            'startTime' => fmt_time($t['start_time']),
            'endTime' => fmt_time($t['end_time']),
            'hours' => $hours,
            'startLocation' => $t['start_location'] ?? '',
            'endLocation' => $t['end_location'] ?? '',
            'distance' => $t['trip_distance'] !== null ? (float)$t['trip_distance'] : null,
            'expenses' => (float)$t['expenses'],
            'remarks' => $t['remarks'] ?? '',
        ];
    }, $stmt->fetchAll());

    json_out($out);
}

json_error('Method not allowed.', 405);
