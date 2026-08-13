<?php
require_once __DIR__ . '/helpers.php';

$user = require_login();
require_role($user, ['superadmin', 'admin', 'reservation_officer']);

$pdo = db();
$method = $_SERVER['REQUEST_METHOD'];

function booking_shape(array $r): array
{
    $days = max(1, (int)ceil((strtotime($r['end_date']) - strtotime($r['start_date'])) / 86400));
    $durationLabel = $days === 1 ? '1 Day' : $days . ' Days';
    $baseRate = (float)($r['daily_rate'] ?? 0);
    $additional = (float)($r['additional_charges'] ?? 0);
    $rentalFee = $baseRate * $days;

    return [
        'id' => 'BK-' . substr($r['start_date'], 0, 4) . '-' . str_pad((string)$r['reservation_id'], 4, '0', STR_PAD_LEFT),
        'createdAt' => $r['reservation_date'] ? substr($r['reservation_date'], 0, 10) : '',
        'status' => ucwords(str_replace('_', ' ', (string)$r['status'])),
        'denialReason' => $r['denial_reason'] ?? '',
        'client' => [
            'name' => $r['company_name'],
            'contact' => $r['contact_number'],
            'email' => $r['email_address'],
            'company' => $r['company_name'],
        ],
        'trip' => [
            'destination' => $r['destination'],
            'pickupDate' => $r['start_date'],
            'pickupTime' => $r['pickup_time'] ? date('H:i', strtotime($r['pickup_time'])) : '',
            'returnDate' => $r['end_date'],
            'returnTime' => $r['return_time'] ? date('H:i', strtotime($r['return_time'])) : '',
            'specialRequests' => $r['special_requests'] ?? '',
            'days' => $days,
            'durationLabel' => $durationLabel,
        ],
        'vehicleId' => $r['vehicle_id'] ? (int)$r['vehicle_id'] : null,
        'vehicleLabel' => $r['vehicle_id']
            ? [
                'type' => $r['vehicle_type'],
                'plateNumber' => $r['plate_number'],
                'model' => $r['model'],
                'rate' => $baseRate,
                'seats' => (int)$r['seats'],
            ]
            : null,
        'driver' => $r['driver_id']
            ? ['name' => $r['driver_name'], 'contact' => $r['driver_contact']]
            : null,
        'preBilling' => [
            'baseRate' => $baseRate,
            'tripDuration' => $durationLabel,
            'rentalFee' => $rentalFee,
            'additionalCharges' => $additional,
            'estimatedTotal' => $rentalFee + $additional,
        ],
    ];
}

function booking_select(): string
{
    return 'SELECT r.reservation_id, r.vehicle_id, r.driver_id, r.reservation_date, r.start_date, r.end_date,
                   r.pickup_time, r.return_time, r.special_requests, r.denial_reason, r.status,
                   r.destination, r.additional_charges, r.total_amount,
                   c.company_name, c.contact_person, c.contact_number, c.email_address,
                   d.fullname AS driver_name, d.contact_number AS driver_contact,
                   v.plate_number, v.model, v.vehicle_type, v.daily_rate, v.seats
            FROM reservations r
            JOIN clients c ON c.client_id = r.client_id
            LEFT JOIN drivers d ON d.driver_id = r.driver_id
            LEFT JOIN vehicles v ON v.vehicle_id = r.vehicle_id';
}

function find_booking(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare(booking_select() . ' WHERE r.reservation_id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

if ($method === 'GET') {
    $rows = $pdo->query(
        booking_select() . '
        ORDER BY FIELD(r.status, "pending", "denied", "confirmed", "on_trip", "completed", "cancelled"),
                 r.start_date DESC, r.reservation_id DESC'
    )->fetchAll();

    json_out(array_map('booking_shape', $rows));
}

if ($method === 'POST') {
    $data = body_json();
    $action = trim((string)($data['action'] ?? ''));

    if ($action === 'create') {
        require_permission($pdo, $user, 'Reservations', 'Add');

        $client = $data['client'] ?? [];
        $trip = $data['trip'] ?? [];
        $vehicleId = (int)($data['vehicleId'] ?? 0);
        $additionalCharges = max(0, (float)($data['additionalCharges'] ?? 0));
        $estimatedTotal = max(0, (float)($data['estimatedTotal'] ?? 0));

        $clientName = trim((string)($client['name'] ?? ''));
        $contact = trim((string)($client['contact'] ?? ''));
        $email = trim((string)($client['email'] ?? ''));
        $company = trim((string)($client['company'] ?? ''));
        $destination = trim((string)($trip['destination'] ?? ''));
        $pickupDate = trim((string)($trip['pickupDate'] ?? ''));
        $returnDate = trim((string)($trip['returnDate'] ?? ''));

        if ($clientName === '' || $contact === '' || $email === '') {
            json_error('Client name, contact, and email are required.', 422);
        }
        if ($destination === '' || $pickupDate === '' || $returnDate === '') {
            json_error('Destination and trip dates are required.', 422);
        }
        if ($returnDate < $pickupDate) {
            json_error('Return date cannot be earlier than pickup date.', 422);
        }

        if ($vehicleId > 0) {
            $stmt = $pdo->prepare('SELECT vehicle_id FROM vehicles WHERE vehicle_id = ?');
            $stmt->execute([$vehicleId]);
            if (!$stmt->fetch()) {
                json_error('Selected vehicle does not exist.', 422);
            }
        } else {
            $vehicleId = null;
        }

        $companyName = $company !== '' ? $company : $clientName;

        $clientStmt = $pdo->prepare('SELECT client_id FROM clients WHERE company_name = ?');
        $clientStmt->execute([$companyName]);
        $clientId = $clientStmt->fetchColumn();
        if (!$clientId) {
            $ins = $pdo->prepare(
                'INSERT INTO clients (company_name, contact_person, contact_number, email_address, client_type, registration_date, status)
                 VALUES (?, ?, ?, ?, "corporate", CURDATE(), "active")'
            );
            $ins->execute([$companyName, $clientName, $contact, $email]);
            $clientId = (int)$pdo->lastInsertId();
        } else {
            $upd = $pdo->prepare(
                'UPDATE clients SET contact_person = ?, contact_number = ?, email_address = ? WHERE client_id = ?'
            );
            $upd->execute([$clientName, $contact, $email, $clientId]);
        }

        $passengers = isset($trip['passengers']) ? max(0, (int)$trip['passengers']) : 0;
        $pickupTime = trim((string)($trip['pickupTime'] ?? ''));
        $returnTime = trim((string)($trip['returnTime'] ?? ''));
        $specialRequests = trim((string)($trip['specialRequests'] ?? ''));

        $stmt = $pdo->prepare(
            'INSERT INTO reservations (client_id, vehicle_id, start_date, end_date, pickup_time, return_time,
                                       trip_purpose, destination, passengers, special_requests, status,
                                       total_amount, additional_charges)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "pending", ?, ?)'
        );
        $stmt->execute([
            $clientId, $vehicleId, $pickupDate, $returnDate,
            $pickupTime !== '' ? $pickupTime . ':00' : null,
            $returnTime !== '' ? $returnTime . ':00' : null,
            $destination, $destination, $passengers > 0 ? $passengers : null,
            $specialRequests !== '' ? $specialRequests : null,
            $estimatedTotal, $additionalCharges,
        ]);
        $reservationId = (int)$pdo->lastInsertId();

        $pdo->prepare('UPDATE reservations SET trip_code = CONCAT("BK-", YEAR(start_date), "-", LPAD(?, 4, "0")) WHERE reservation_id = ?')
            ->execute([$reservationId, $reservationId]);

        json_out(booking_shape(find_booking($pdo, $reservationId)), 201);
    }

    if ($action === 'confirm') {
        require_permission($pdo, $user, 'Reservations', 'Edit');

        $id = (int)($data['id'] ?? 0);
        $res = find_booking($pdo, $id);
        if (!$res || $res['status'] !== 'pending') {
            json_error('Booking not found or already processed.', 422);
        }

        if ($res['vehicle_id']) {
            $stmt = $pdo->prepare('SELECT status FROM vehicles WHERE vehicle_id = ?');
            $stmt->execute([$res['vehicle_id']]);
            $vStatus = $stmt->fetchColumn();
            if ($vStatus !== 'available') {
                json_error('The selected vehicle is no longer available.', 422);
            }
        } else {
            json_error('No vehicle selected for this booking.', 422);
        }

        $drv = $pdo->prepare(
            'SELECT d.driver_id FROM drivers d
             WHERE d.is_unavailable = 0
               AND NOT EXISTS (
                   SELECT 1 FROM reservations r
                   WHERE r.driver_id = d.driver_id AND r.status IN ("confirmed", "on_trip")
               )
             ORDER BY d.driver_id LIMIT 1'
        );
        $drv->execute();
        $driverId = (int)$drv->fetchColumn();
        if ($driverId <= 0) {
            json_error('No available drivers to assign to this trip.', 422);
        }

        $pdo->beginTransaction();
        try {
            $pdo->prepare('UPDATE vehicles SET status = "on_trip" WHERE vehicle_id = ?')->execute([$res['vehicle_id']]);
            $pdo->prepare('UPDATE reservations SET status = "confirmed", driver_id = ? WHERE reservation_id = ?')
                ->execute([$driverId, $id]);
            $pdo->prepare(
                'INSERT INTO trip_logs (driver_id, vehicle_id, reservation_id, trip_date, start_time, start_location)
                 VALUES (?, ?, ?, ?, ?, "Hollydot Depot, Pasig")'
            )->execute([
                $driverId, $res['vehicle_id'], $id, $res['start_date'],
                $res['pickup_time'] ?: date('H:i:s'),
            ]);
            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            json_error('Failed to confirm booking: ' . $e->getMessage(), 500);
        }

        json_out(booking_shape(find_booking($pdo, $id)));
    }

    if ($action === 'deny') {
        require_permission($pdo, $user, 'Reservations', 'Edit');

        $id = (int)($data['id'] ?? 0);
        $reason = trim((string)($data['reason'] ?? ''));
        $res = find_booking($pdo, $id);
        if (!$res || $res['status'] !== 'pending') {
            json_error('Booking not found or already processed.', 422);
        }
        if ($reason === '') {
            json_error('A denial reason is required.', 422);
        }

        $pdo->prepare('UPDATE reservations SET status = "denied", denial_reason = ? WHERE reservation_id = ?')
            ->execute([$reason, $id]);

        json_out(booking_shape(find_booking($pdo, $id)));
    }

    json_error('Action must be one of: create, confirm, deny.', 422);
}

json_error('Method not allowed.', 405);
