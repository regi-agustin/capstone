<?php
require_once __DIR__ . '/helpers.php';

$user = require_login();

$pdo = db();
$method = $_SERVER['REQUEST_METHOD'];

$isCustomer = $user['role'] === 'customer';

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
            'name' => $r['contact_person'],
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
            'passengers' => (int)($r['passengers'] ?? 0),
            'needDriver' => $r['need_driver'] ?? null,
            'driverLicenseImage' => $r['driver_license_image'] ?? null,
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
    return 'SELECT r.reservation_id, r.client_id, r.vehicle_id, r.driver_id, r.reservation_date, r.start_date, r.end_date,
                   r.pickup_time, r.return_time, r.special_requests, r.denial_reason, r.status,
                   r.destination, r.additional_charges, r.total_amount, r.passengers, r.need_driver, r.driver_license_image,
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

function parse_booking_id(?string $rawId): ?int
{
    $rawId = trim((string)$rawId);
    if ($rawId === '') return null;
    if (preg_match('/^BK-\d{4}-(\d+)$/', $rawId, $m)) {
        return (int)$m[1];
    }
    $id = (int)$rawId;
    return $id > 0 ? $id : null;
}

function res_booking_id(array $r): string
{
    return 'BK-' . substr($r['start_date'], 0, 4) . '-' . str_pad((string)$r['reservation_id'], 4, '0', STR_PAD_LEFT);
}

// Notifies the linked customer account when their reservation status changes.
function notify_booking_owner(PDO $pdo, int $clientId, string $type, string $title, string $description): void
{
    $stmt = $pdo->prepare('SELECT user_id FROM clients WHERE client_id = ?');
    $stmt->execute([$clientId]);
    $userId = (int)$stmt->fetchColumn();
    if ($userId <= 0) return;
    $ins = $pdo->prepare(
        'INSERT INTO notifications (user_id, type, title, description) VALUES (?, ?, ?, ?)'
    );
    $ins->execute([$userId, $type, $title, $description]);
}

if ($method === 'GET') {
    if ($isCustomer) {
        require_role($user, ['superadmin', 'admin', 'reservation_officer', 'customer']);
        $stmt = $pdo->prepare(
            booking_select() . '
            WHERE c.user_id = ?
            ORDER BY FIELD(r.status, "pending", "denied", "confirmed", "on_trip", "completed", "cancelled"),
                     r.start_date DESC, r.reservation_id DESC'
        );
        $stmt->execute([$user['user_id']]);
        $rows = $stmt->fetchAll();
    } else {
        require_role($user, ['superadmin', 'admin', 'reservation_officer', 'billing_officer']);
        $rows = $pdo->query(
            booking_select() . '
            ORDER BY FIELD(r.status, "pending", "denied", "confirmed", "on_trip", "completed", "cancelled"),
                     r.start_date DESC, r.reservation_id DESC'
        )->fetchAll();
    }

    json_out(array_map('booking_shape', $rows));
}

if ($method === 'POST') {
    $data = body_json();
    $action = trim((string)($data['action'] ?? ''));

    if ($action === 'create') {
        require_role($user, ['superadmin', 'admin', 'reservation_officer', 'customer']);
        if (!$isCustomer) {
            require_permission($pdo, $user, 'Reservations', 'Add');
        }

        $client = $data['client'] ?? [];
        $trip = $data['trip'] ?? [];
        $vehicleId = (int)($data['vehicleId'] ?? 0);
        $additionalCharges = max(0, (float)($data['additionalCharges'] ?? 0));
        $estimatedTotal = max(0, (float)($data['estimatedTotal'] ?? 0));

        $clientName = trim((string)($client['name'] ?? ''));
        $contact = trim((string)($client['contact'] ?? ''));
        $email = trim((string)($client['email'] ?? ''));
        // Optional: only name, contact and email are required. The customer
        // dashboard has no company field, so a blank company falls back to the
        // client name when the clients row is written (see $companyName below).
        $company = trim((string)($client['company'] ?? ''));

        // Customers book under their own account; fall back to session profile when fields are blank.
        if ($isCustomer) {
            $stmt = $pdo->prepare('SELECT email, contact_number FROM users WHERE user_id = ?');
            $stmt->execute([$user['user_id']]);
            $acc = $stmt->fetch();
            $sessionEmail = $acc && $acc['email'] ? $acc['email'] : '';
            $sessionContact = $acc && $acc['contact_number'] ? $acc['contact_number'] : '';
            if ($clientName === '') $clientName = $user['fullname'];
            if ($email === '') $email = $sessionEmail !== '' ? $sessionEmail : $clientName . '@email.com';
            if ($contact === '') $contact = $sessionContact;
            $company = $clientName;
        }
        $destination = trim((string)($trip['destination'] ?? ''));
        $pickupDate = trim((string)($trip['pickupDate'] ?? ''));
        $returnDate = trim((string)($trip['returnDate'] ?? ''));
        $pickupTime = trim((string)($trip['pickupTime'] ?? ''));
        $returnTime = trim((string)($trip['returnTime'] ?? ''));
        $passengers = isset($trip['passengers']) ? (int)$trip['passengers'] : 0;

        if ($clientName === '' || $contact === '' || $email === '') {
            json_error('Client name, contact, and email are required.', 422);
        }
        if ($destination === '' || $pickupDate === '' || $returnDate === '') {
            json_error('Destination and trip dates are required.', 422);
        }
        if ($returnDate < $pickupDate) {
            json_error('Return date cannot be earlier than pickup date.', 422);
        }
        if ($pickupTime === '' || $returnTime === '') {
            json_error('Pickup and return times are required.', 422);
        }
        if ($returnDate === $pickupDate && strcmp($returnTime, $pickupTime) < 0) {
            json_error('Drop-off time cannot be earlier than pickup time on the same day.', 422);
        }
        if ($passengers < 1 || $passengers > 50) {
            json_error('Passengers must be between 1 and 50.', 422);
        }

        if ($vehicleId <= 0) {
            json_error('Vehicle selection is required.', 422);
        }
        $stmt = $pdo->prepare('SELECT vehicle_id FROM vehicles WHERE vehicle_id = ?');
        $stmt->execute([$vehicleId]);
        if (!$stmt->fetch()) {
            json_error('Selected vehicle does not exist.', 422);
        }

        // Availability: same overlap rule the AI uses — a pending or confirmed
        // booking on these dates makes the vehicle unbookable (real-time re-check
        // so a stale recommendation list can never double-book).
        $overlapStmt = $pdo->prepare(
            'SELECT reservation_id FROM reservations
              WHERE vehicle_id = ?
                AND status NOT IN ("denied", "cancelled")
                AND start_date < ?
                AND end_date > ?
              LIMIT 1'
        );
        $overlapStmt->execute([$vehicleId, $returnDate, $pickupDate]);
        if ($overlapStmt->fetch()) {
            json_error('This vehicle is no longer available for the selected dates (it has a pending or confirmed booking). Please choose another vehicle.', 409);
        }

        $companyName = $company !== '' ? $company : $clientName;

        $clientId = null;
        if ($isCustomer) {
            $stmt = $pdo->prepare('SELECT client_id FROM clients WHERE user_id = ?');
            $stmt->execute([$user['user_id']]);
            $clientId = (int)$stmt->fetchColumn() ?: null;
        }
        if (!$clientId) {
            $clientStmt = $pdo->prepare('SELECT client_id FROM clients WHERE company_name = ?');
            $clientStmt->execute([$companyName]);
            $clientId = (int)$clientStmt->fetchColumn() ?: null;
        }
        if (!$clientId) {
            $ins = $pdo->prepare(
                'INSERT INTO clients (user_id, company_name, contact_person, contact_number, email_address, client_type, registration_date, status)
                 VALUES (?, ?, ?, ?, ?, ?, CURDATE(), "active")'
            );
            $ins->execute([
                $isCustomer ? $user['user_id'] : null,
                $companyName, $clientName, $contact, $email,
                $isCustomer ? 'individual' : 'corporate',
            ]);
            $clientId = (int)$pdo->lastInsertId();
        } else {
            $upd = $pdo->prepare(
                'UPDATE clients SET user_id = COALESCE(user_id, ?), contact_person = ?, contact_number = ?, email_address = ? WHERE client_id = ?'
            );
            $upd->execute([$isCustomer ? $user['user_id'] : null, $clientName, $contact, $email, $clientId]);
        }

        $needDriver = trim((string)($trip['needDriver'] ?? ''));
        $driverLicenseImage = trim((string)($trip['driverLicenseImage'] ?? ''));
        $specialRequests = trim((string)($trip['specialRequests'] ?? ''));

        $stmt = $pdo->prepare(
            'INSERT INTO reservations (client_id, vehicle_id, start_date, end_date, pickup_time, return_time,
                                       destination, passengers, need_driver, driver_license_image, special_requests, status,
                                       total_amount, additional_charges)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "pending", ?, ?)'
        );
        $stmt->execute([
            $clientId, $vehicleId, $pickupDate, $returnDate,
            $pickupTime . ':00',
            $returnTime . ':00',
            $destination, $passengers,
            $needDriver !== '' ? $needDriver : null,
            $driverLicenseImage !== '' ? $driverLicenseImage : null,
            $specialRequests !== '' ? $specialRequests : null,
            $estimatedTotal, $additionalCharges,
        ]);
        $reservationId = (int)$pdo->lastInsertId();

        $pdo->prepare('UPDATE reservations SET trip_code = CONCAT("BK-", YEAR(start_date), "-", LPAD(?, 4, "0")) WHERE reservation_id = ?')
            ->execute([$reservationId, $reservationId]);

        // Connect the AI-assistant exposure that led here (raw until gated).
        link_recommendation_log(
            $pdo, $reservationId, (int)($data['recommendationLogId'] ?? 0),
            $vehicleId, (int)$clientId, $email, $pickupDate, $returnDate, $passengers
        );
        touch_retrain_flag();

        json_out(booking_shape(find_booking($pdo, $reservationId)), 201);
    }

    if ($action === 'confirm') {
        require_permission($pdo, $user, 'Reservations', 'Edit');

        $id = parse_booking_id($data['id'] ?? null);
        if (!$id) {
            json_error('A valid booking id is required.', 422);
        }
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

            // Create notification for driver about new trip assignment
            $driverUserId = get_user_id_by_driver($pdo, $driverId);
            if ($driverUserId) {
                create_notification(
                    $pdo,
                    $driverUserId,
                    'reservation_confirmed',
                    'New Trip Assigned',
                    'You have been assigned to a new trip. Destination: ' . $res['destination'] . ', Date: ' . $res['start_date'] . '. Pickup Time: ' . ($res['pickup_time'] ?: date('H:i:s'))
                );
            }

            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            json_error('Failed to confirm booking: ' . $e->getMessage(), 500);
        }

        notify_booking_owner($pdo, $res['client_id'], 'reservation_confirmed', 'Reservation Confirmed',
            'Your booking ' . res_booking_id($res) . ' has been confirmed. A driver will be assigned for your trip.');
        touch_retrain_flag();

        json_out(booking_shape(find_booking($pdo, $id)));
    }

    if ($action === 'approve_pricing') {
        if (in_array($user['role'], ['superadmin', 'admin', 'billing_officer'], true)) {
            require_permission($pdo, $user, 'Billing', 'Edit');
        } else {
            require_permission($pdo, $user, 'Reservations', 'Edit');
        }

        $id = parse_booking_id($data['id'] ?? null);
        if (!$id) {
            json_error('A valid booking id is required.', 422);
        }
        $res = find_booking($pdo, $id);
        if (!$res || $res['status'] !== 'pending') {
            json_error('Booking not found or already processed.', 422);
        }
        if (!$res['vehicle_id']) {
            json_error('No vehicle selected on this booking.', 422);
        }

        $days = max(1, (int)ceil((strtotime($res['end_date']) - strtotime($res['start_date'])) / 86400));
        $rentalFee = round((float)$res['daily_rate'] * $days, 2);
        $additionalCharges = max(0, round((float)($data['additionalCharges'] ?? $res['additional_charges'] ?? 0), 2));
        $total = round($rentalFee + $additionalCharges, 2);

        $pdo->beginTransaction();
        try {
            $pdo->prepare(
                'UPDATE reservations SET status = "pricing_approved", additional_charges = ?, total_amount = ? WHERE reservation_id = ?'
            )->execute([$additionalCharges, $total, $id]);
            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            json_error('Failed to approve pricing: ' . $e->getMessage(), 500);
        }

        notify_booking_owner($pdo, $res['client_id'], 'reservation_confirmed', 'Pricing Approved',
            'Your booking ' . res_booking_id($res) . ' has been reviewed and approved at ' . number_format($total, 2) .
            ' (rental ' . number_format($rentalFee, 2) . ' + charges ' . number_format($additionalCharges, 2) .
            '). Awaiting driver assignment.');
        touch_retrain_flag();

        json_out(booking_shape(find_booking($pdo, $id)));
    }

    if ($action === 'deny') {
        if (in_array($user['role'], ['superadmin', 'admin', 'billing_officer'], true)) {
            require_permission($pdo, $user, 'Billing', 'Edit');
        } else {
            require_permission($pdo, $user, 'Reservations', 'Edit');
        }

        $id = parse_booking_id($data['id'] ?? null);
        if (!$id) {
            json_error('A valid booking id is required.', 422);
        }
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

        notify_booking_owner($pdo, $res['client_id'], 'system_alert', 'Reservation Denied',
            'Your booking ' . res_booking_id($res) . ' was not approved. Reason: ' . $reason);
        touch_retrain_flag();

        json_out(booking_shape(find_booking($pdo, $id)));
    }

    if ($action === 'cancel') {
        require_role($user, ['superadmin', 'admin', 'reservation_officer', 'customer']);

        $id = parse_booking_id($data['id'] ?? null);
        if (!$id) json_error('A valid booking id is required.', 422);
        $res = find_booking($pdo, $id);
        if (!$res) json_error('Booking not found.', 404);
        if (!in_array($res['status'], ['pending', 'confirmed', 'on_trip'], true)) {
            json_error('Only pending, confirmed, or ongoing bookings can be cancelled.', 422);
        }

        // Customers may only cancel their own bookings.
        if ($isCustomer) {
            $stmt = $pdo->prepare(
                'SELECT u.user_id FROM reservations r
                 JOIN clients c ON c.client_id = r.client_id
                 JOIN users u ON u.user_id = c.user_id
                 WHERE r.reservation_id = ?'
            );
            $stmt->execute([$id]);
            $ownerId = (int)$stmt->fetchColumn();
            if ($ownerId > 0 && $ownerId !== (int)$user['user_id']) {
                json_error('You can only cancel your own reservations.', 403);
            }
        }

        $pdo->beginTransaction();
        try {
            if ($res['status'] === 'pending') {
                $pdo->prepare('UPDATE reservations SET status = "cancelled" WHERE reservation_id = ?')->execute([$id]);
            } else {
                cancel_reservation($pdo, $id);
            }
            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            json_error('Failed to cancel booking: ' . $e->getMessage(), 500);
        }

        // Create notification for driver if they had an assigned trip that was cancelled
        if ($res['driver_id']) {
            $driverUserId = get_user_id_by_driver($pdo, (int)$res['driver_id']);
            if ($driverUserId) {
                create_notification(
                    $pdo,
                    $driverUserId,
                    'system_alert',
                    'Trip Cancelled',
                    'Your trip to ' . $res['destination'] . ' scheduled for ' . $res['start_date'] . ' has been cancelled.'
                );
            }
        }

        log_action($pdo, (int)$user['user_id'], 'CANCEL_BOOKING', 'Cancelled reservation ' . $res['reservation_id'] . ' (' . $res['status'] . ')');
        touch_retrain_flag(); // conversion invalidated -> gate must reclassify
        json_out(booking_shape(find_booking($pdo, $id)));
    }

    json_error('Action must be one of: create, confirm, deny, cancel.', 422);
}

json_error('Method not allowed.', 405);
