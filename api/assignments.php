<?php
require_once __DIR__ . '/helpers.php';

$user = require_login();
require_role($user, ['superadmin', 'admin', 'driver_management_head']);

$pdo = db();
$method = $_SERVER['REQUEST_METHOD'];

function assignment_shape(PDO $pdo, array $r): array
{
    return [
        'id' => (int)$r['reservation_id'],
        'status' => $r['status'],
        'driverId' => $r['driver_id'] ? (int)$r['driver_id'] : null,
        'client' => [
            'name' => $r['client_name'],
            'contact' => $r['contact_number'],
        ],
        'trip' => [
            'tripCode' => $r['trip_code'],
            'schedule' => $r['trip_code'] ? date('Y-m-d H:i', strtotime($r['start_date'] . ($r['start_time'] ? ' ' . $r['start_time'] : ''))) : '',
            'destination' => $r['destination'],
            'passengers' => (int)$r['passengers'],
            'lugSize' => $r['luggage'] ?? '',
            'purpose' => $r['trip_purpose'],
        ],
        'vehicleId' => (int)$r['vehicle_id'],
    ];
}

if ($method === 'GET') {
    $rows = $pdo->query(
        'SELECT r.reservation_id, r.status, r.driver_id, r.vehicle_id, r.trip_code, r.start_date,
                r.destination, r.passengers, r.luggage, r.trip_purpose,
                c.company_name AS client_name, c.contact_number,
                tl.start_time
         FROM reservations r
         JOIN clients c ON c.client_id = r.client_id
         LEFT JOIN trip_logs tl ON tl.reservation_id = r.reservation_id
         WHERE r.status IN ("confirmed", "on_trip", "pricing_approved")
         ORDER BY r.start_date DESC, r.reservation_id DESC'
    )->fetchAll();

    json_out(array_map(fn($r) => assignment_shape($pdo, $r), $rows));
}

if ($method === 'POST') {
    require_permission($pdo, $user, 'Assignments', 'Add');

    $data = body_json();
    $action = trim((string)($data['action'] ?? ''));

    // DMH picks a driver for a booking whose pricing the billing desk already approved.
    if ($action === 'assign_driver') {
        $id = (int)($data['id'] ?? 0);
        $driverId = (int)($data['driverId'] ?? 0);
        if ($id <= 0 || $driverId <= 0) {
            json_error('Booking id and driver id are required.', 422);
        }

        $stmt = $pdo->prepare(
            'SELECT r.*, c.user_id AS client_user_id, v.plate_number, v.status AS vehicle_status
             FROM reservations r
             JOIN clients c ON c.client_id = r.client_id
             LEFT JOIN vehicles v ON v.vehicle_id = r.vehicle_id
             WHERE r.reservation_id = ?'
        );
        $stmt->execute([$id]);
        $res = $stmt->fetch();
        if (!$res) json_error('Booking not found.', 404);
        if ($res['status'] !== 'pricing_approved') {
            json_error('Only bookings with approved pricing can be dispatched.', 422);
        }
        if (!$res['vehicle_id']) {
            json_error('No vehicle selected on this booking.', 422);
        }
        if ($res['vehicle_status'] !== 'available') {
            json_error('The requested vehicle is not available for dispatch.', 422);
        }

        $driver = $pdo->prepare(
            'SELECT driver_id FROM drivers d
             WHERE d.driver_id = ? AND d.is_unavailable = 0
               AND NOT EXISTS (
                   SELECT 1 FROM reservations r
                   WHERE r.driver_id = d.driver_id AND r.status IN ("confirmed", "on_trip")
               )'
        );
        $driver->execute([$driverId]);
        if (!$driver->fetch()) {
            json_error('Driver not found or already has an active assignment.', 422);
        }

        $pdo->beginTransaction();
        try {
            $pdo->prepare('UPDATE vehicles SET status = "on_trip" WHERE vehicle_id = ?')->execute([$res['vehicle_id']]);
            $pdo->prepare(
                'UPDATE reservations SET status = "confirmed", driver_id = ? WHERE reservation_id = ?'
            )->execute([$driverId, $id]);
            $pdo->prepare(
                'INSERT INTO trip_logs (driver_id, vehicle_id, reservation_id, trip_date, start_time, start_location)
                 VALUES (?, ?, ?, ?, ?, "Hollydot Depot, Pasig")'
            )->execute([
                $driverId,
                $res['vehicle_id'],
                $id,
                $res['start_date'],
                $res['pickup_time'] ?: date('H:i:s'),
            ]);

            $driverUserId = get_user_id_by_driver($pdo, $driverId);
            if ($driverUserId) {
                create_notification(
                    $pdo,
                    $driverUserId,
                    'reservation_confirmed',
                    'New Trip Assigned',
                    'You have been assigned to a new trip. Destination: ' . $res['destination'] . ', Date: ' . $res['start_date'] .
                    ', Booking: ' . $res['trip_code'] . '.'
                );
            }

            if ($res['client_user_id'] > 0) {
                $pdo->prepare(
                    'INSERT INTO notifications (user_id, type, title, description) VALUES (?, ?, ?, ?)'
                )->execute([
                    (int)$res['client_user_id'],
                    'reservation_confirmed',
                    'Driver Assigned',
                    'Your booking ' . ($res['trip_code'] ?: '#' . $id) . ' has been dispatched. A driver is on the way.',
                ]);
            }

            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            json_error('Failed to assign driver: ' . $e->getMessage(), 500);
        }

        json_out(['ok' => true, 'id' => $id, 'status' => 'confirmed'], 200);
    }

    $driverId = (int)($data['driverId'] ?? 0);
    $vehicleId = (int)($data['vehicleId'] ?? 0);
    $clientName = trim((string)($data['client']['name'] ?? ''));
    $clientContact = trim((string)($data['client']['contact'] ?? ''));
    $trip = $data['trip'] ?? [];

    if ($driverId <= 0 || $vehicleId <= 0 || $clientName === '' || $clientContact === '') {
        json_error('Driver, vehicle, and client credentials are required.', 422);
    }

    $tripCode = trim((string)($trip['tripCode'] ?? ''));
    $schedule = trim((string)($trip['schedule'] ?? ''));
    if ($tripCode === '' || $schedule === '') {
        json_error('Trip code and schedule are required.', 422);
    }

    // Ensure the driver exists and has no active assignment
    $driver = $pdo->prepare('SELECT driver_id FROM drivers WHERE driver_id = ? AND is_unavailable = 0');
    $driver->execute([$driverId]);
    if (!$driver->fetch()) {
        json_error('Driver not found or is unavailable.', 422);
    }

    // Ensure the vehicle exists and is available
    $vehicle = $pdo->prepare('SELECT vehicle_id, status FROM vehicles WHERE vehicle_id = ?');
    $vehicle->execute([$vehicleId]);
    $v = $vehicle->fetch();
    if (!$v || $v['status'] !== 'available') {
        json_error('Vehicle is not available for assignment.', 422);
    }

    // Find or create the client
    $client = $pdo->prepare('SELECT client_id FROM clients WHERE company_name = ?');
    $client->execute([$clientName]);
    $clientId = $client->fetchColumn();
    if (!$clientId) {
        $ins = $pdo->prepare('INSERT INTO clients (company_name, contact_number, client_type, registration_date, status) VALUES (?, ?, "corporate", CURDATE(), "active")');
        $ins->execute([$clientName, $clientContact]);
        $clientId = (int)$pdo->lastInsertId();
    } else {
        $upd = $pdo->prepare('UPDATE clients SET contact_number = ? WHERE client_id = ?');
        $upd->execute([$clientContact, $clientId]);
    }

    $start = substr($schedule, 0, 10);
    $time = substr($schedule, 11, 5) . ':00';
    $destination = trim((string)($trip['destination'] ?? ''));
    $passengers = max(1, (int)($trip['passengers'] ?? 1));
    $luggage = trim((string)($trip['lugSize'] ?? ''));
    $purpose = trim((string)($trip['purpose'] ?? ''));

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare(
            'INSERT INTO reservations (client_id, driver_id, vehicle_id, trip_code, start_date, end_date,
                                       trip_purpose, destination, passengers, luggage, status, total_amount)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "confirmed", 0)'
        );
        $stmt->execute([$clientId, $driverId, $vehicleId, $tripCode, $start, $start, $purpose, $destination, $passengers, $luggage]);
        $reservationId = (int)$pdo->lastInsertId();

        $stmt = $pdo->prepare(
            'INSERT INTO trip_logs (driver_id, vehicle_id, reservation_id, trip_date, start_time, start_location, remarks)
             VALUES (?, ?, ?, ?, ?, "Hollydot Depot, Pasig", NULL)'
        );
        $stmt->execute([$driverId, $vehicleId, $reservationId, $start, $time]);

        $pdo->prepare('UPDATE vehicles SET status = "on_trip" WHERE vehicle_id = ?')->execute([$vehicleId]);
        
        // Create notification for the assigned driver within the transaction
        $assignedUserId = get_user_id_by_driver($pdo, $driverId);
        if ($assignedUserId) {
            create_notification($pdo, $assignedUserId, 'reservation_confirmed', 
                'New Trip Assigned', 
                'You have been assigned a new trip to ' . $destination . '. Trip code: ' . $tripCode);
        }

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error('Failed to create assignment: ' . $e->getMessage(), 500);
    }

    json_out(['id' => $reservationId], 201);
}

if ($method === 'DELETE') {
    require_permission($pdo, $user, 'Assignments', 'Delete');

    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) json_error('Assignment id is required.', 422);

    $stmt = $pdo->prepare(
        'SELECT reservation_id, start_date FROM reservations
         WHERE reservation_id = ? AND status IN ("confirmed", "on_trip")'
    );
    $stmt->execute([$id]);
    $res = $stmt->fetch();
    if (!$res) json_error('Assignment not found.', 404);

    // Can't complete a trip that hasn't started yet
    if ($res['start_date'] > date('Y-m-d')) {
        json_error('This trip has not started yet.', 422);
    }

    $pdo->beginTransaction();
    try {
        complete_reservation($pdo, $id);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error('Failed to release assignment: ' . $e->getMessage(), 500);
    }

    json_out(['ok' => true]);
}

json_error('Method not allowed.', 405);
