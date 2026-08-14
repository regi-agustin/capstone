<?php
require_once __DIR__ . '/helpers.php';

$user = require_login();

$pdo = db();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    require_role($user, ['superadmin', 'admin', 'driver_management_head', 'reservation_officer', 'customer']);
    $rows = $pdo->query(
        'SELECT v.vehicle_id, v.plate_number, v.model, v.year, v.vehicle_type, v.owner_id, v.status,
                v.daily_rate, v.seats
         FROM vehicles v
         ORDER BY v.vehicle_id'
    )->fetchAll();

    $out = array_map(function ($v) {
        return [
            'id' => (int)$v['vehicle_id'],
            'carCode' => vehicle_car_code($v),
            'plate' => $v['plate_number'],
            'type' => $v['vehicle_type'],
            'model' => $v['model'],
            'year' => (int)$v['year'],
            'seats' => (int)$v['seats'],
            'dailyRate' => (float)$v['daily_rate'],
            'status' => vehicle_gui_status($v['status']),
        ];
    }, $rows);

    json_out($out);
}

if ($method === 'POST') {
    require_role($user, ['superadmin', 'admin', 'driver_management_head']);
    require_permission($pdo, $user, 'Fleet', 'Add');

    $data = body_json();
    $plate = strtoupper(trim((string)($data['plate'] ?? '')));
    $type = trim((string)($data['type'] ?? 'AUV'));
    $model = trim((string)($data['model'] ?? ''));
    $year = (int)($data['year'] ?? date('Y'));
    $seats = max(1, (int)($data['seats'] ?? 5));
    $dailyRate = max(0, (float)($data['dailyRate'] ?? 0));

    if ($plate === '' || $model === '') {
        json_error('Plate number and model are required.', 422);
    }
    if (!preg_match('/^[A-Z0-9\s-]{3,}$/', $plate)) {
        json_error('Invalid plate number format.', 422);
    }

    $exists = $pdo->prepare('SELECT vehicle_id FROM vehicles WHERE plate_number = ?');
    $exists->execute([$plate]);
    if ($exists->fetch()) {
        json_error('A vehicle with this plate number already exists.', 422);
    }

    $stmt = $pdo->prepare(
        'INSERT INTO vehicles (plate_number, model, year, vehicle_type, daily_rate, seats, status, purchase_date)
         VALUES (?, ?, ?, ?, ?, ?, "available", CURDATE())'
    );
    $stmt->execute([$plate, $model, $year, $type, $dailyRate, $seats]);

    $id = (int)$pdo->lastInsertId();
    $row = $pdo->query("SELECT v.vehicle_id, v.plate_number, v.model, v.year, v.vehicle_type, v.owner_id, v.status, v.daily_rate, v.seats FROM vehicles v WHERE v.vehicle_id = $id")->fetch();

    json_out([
        'id' => $id,
        'carCode' => vehicle_car_code($row),
        'plate' => $row['plate_number'],
        'type' => $row['vehicle_type'],
        'model' => $row['model'],
        'year' => (int)$row['year'],
        'seats' => (int)$row['seats'],
        'dailyRate' => (float)$row['daily_rate'],
        'status' => 'Available',
    ], 201);
}

json_error('Method not allowed.', 405);
