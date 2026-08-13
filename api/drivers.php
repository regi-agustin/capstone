<?php
require_once __DIR__ . '/helpers.php';

$user = require_login();
require_role($user, ['superadmin', 'admin', 'driver_management_head']);

$pdo = db();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Assignment status is derived from active reservations, not stored on the driver
    $rows = $pdo->query(
        'SELECT d.driver_id, d.fullname, d.contact_number, d.is_unavailable,
                EXISTS (
                    SELECT 1 FROM reservations r
                    WHERE r.driver_id = d.driver_id AND r.status IN ("confirmed", "on_trip")
                ) AS has_active_assignment
         FROM drivers d
         ORDER BY d.driver_id'
    )->fetchAll();

    $out = array_map(function ($d) {
        return [
            'id' => (int)$d['driver_id'],
            'name' => $d['fullname'],
            'contact' => $d['contact_number'],
            'status' => (int)$d['is_unavailable'] === 1
                ? 'Unavailable'
                : ((int)$d['has_active_assignment'] === 1 ? 'Assigned' : 'Unassigned'),
        ];
    }, $rows);

    json_out($out);
}

if ($method === 'POST') {
    require_permission($pdo, $user, 'Drivers', 'Add');

    $data = body_json();
    $name = trim((string)($data['name'] ?? ''));
    $contact = trim((string)($data['contact'] ?? ''));

    if ($name === '' || $contact === '') {
        json_error('Name and contact are required.', 422);
    }

    $stmt = $pdo->prepare(
        'INSERT INTO drivers (fullname, contact_number, license_number, license_expiry, status, hire_date)
         VALUES (?, ?, ?, DATE_ADD(CURDATE(), INTERVAL 1 YEAR), "active", CURDATE())'
    );
    $stmt->execute([$name, $contact, 'LIC-PENDING-' . time()]);

    json_out(['id' => (int)$pdo->lastInsertId(), 'name' => $name, 'contact' => $contact, 'status' => 'Unassigned'], 201);
}

if ($method === 'PATCH') {
    require_permission($pdo, $user, 'Drivers', 'Edit');

    $data = body_json();
    $id = (int)($data['id'] ?? 0);
    if ($id <= 0) json_error('Driver id is required.', 422);

    $stmt = $pdo->prepare('UPDATE drivers SET is_unavailable = 1 - is_unavailable WHERE driver_id = ?');
    $stmt->execute([$id]);

    if ($stmt->rowCount() === 0) json_error('Driver not found.', 404);

    $stmt = $pdo->prepare('SELECT is_unavailable FROM drivers WHERE driver_id = ?');
    $stmt->execute([$id]);
    json_out(['id' => $id, 'is_unavailable' => (int)$stmt->fetchColumn() === 1]);
}

json_error('Method not allowed.', 405);
