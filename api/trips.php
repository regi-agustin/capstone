<?php
require_once __DIR__ . '/helpers.php';

$user = require_login();
require_role($user, ['driver']);

$pdo = db();
$method = $_SERVER['REQUEST_METHOD'];

$driver = $pdo->prepare(
    'SELECT driver_id FROM drivers WHERE user_id = ?'
);
$driver->execute([$user['user_id']]);
$driverId = (int)$driver->fetchColumn();
if ($driverId <= 0) {
    json_error('No driver profile linked to this account.', 403);
}

function trip_shape(PDO $pdo, array $r): array
{
    return [
        'id' => (int)$r['reservation_id'],
        'tripCode' => $r['trip_code'],
        'schedule' => $r['trip_code'] ? date('Y-m-d H:i', strtotime($r['start_date'] . ($r['start_time'] ? ' ' . $r['start_time'] : ''))) : '',
        'startDate' => $r['start_date'],
        'endDate' => $r['end_date'],
        'pickupTime' => $r['pickup_time'] ? date('H:i', strtotime($r['pickup_time'])) : '',
        'returnTime' => $r['return_time'] ? date('H:i', strtotime($r['return_time'])) : '',
        'specialRequests' => $r['special_requests'] ?? '',
        'destination' => $r['destination'],
        'passengers' => (int)$r['passengers'],
        'lugSize' => $r['luggage'] ?? '',
        'status' => $r['status'],
        'client' => [
            'name' => $r['client_name'],
            'contact' => $r['contact_number'],
            'email' => $r['email_address'] ?? '',
        ],
        'vehicle' => [
            'carCode' => vehicle_car_code($r),
            'plate' => $r['plate_number'],
            'model' => $r['model'],
            'type' => $r['vehicle_type'] ?? '',
            'seats' => isset($r['seats']) ? (int)$r['seats'] : 0,
        ],
    ];
}

if ($method === 'GET') {
    $rows = $pdo->prepare(
        'SELECT r.reservation_id, r.trip_code, r.start_date, r.end_date, r.pickup_time, r.return_time,
                r.destination, r.passengers, r.special_requests,
                r.luggage, r.status,
                c.contact_person AS client_name, c.contact_number, c.email_address,
                v.plate_number, v.model, v.vehicle_type, v.seats, v.owner_id, v.vehicle_id, v.car_code,
                tl.start_time
         FROM reservations r
         JOIN clients c ON c.client_id = r.client_id
         LEFT JOIN vehicles v ON v.vehicle_id = r.vehicle_id
         LEFT JOIN trip_logs tl ON tl.reservation_id = r.reservation_id
         WHERE r.driver_id = ?
         ORDER BY FIELD(r.status, "on_trip", "confirmed", "completed", "cancelled"),
                  r.start_date DESC, r.reservation_id DESC'
    );
    $rows->execute([$driverId]);

    $active = [];
    $history = [];
    foreach ($rows->fetchAll() as $r) {
        if (in_array($r['status'], ['confirmed', 'on_trip'], true)) {
            $active[] = trip_shape($pdo, $r);
        } else {
            $history[] = trip_shape($pdo, $r);
        }
    }

    json_out(['active' => $active, 'history' => $history]);
}

if ($method === 'POST') {
    $data = body_json();
    $action = trim((string)($data['action'] ?? ''));
    $id = (int)($data['id'] ?? 0);
    if (!in_array($action, ['accept', 'done', 'cancel'], true)) {
        json_error('Action must be one of: accept, done, cancel.', 422);
    }

    $stmt = $pdo->prepare(
        'SELECT reservation_id, status, start_date, destination FROM reservations
         WHERE reservation_id = ? AND driver_id = ?'
    );
    $stmt->execute([$id, $driverId]);
    $res = $stmt->fetch();
    if (!$res) json_error('Trip not found.', 404);

    if ($action === 'accept') {
        if ($res['status'] !== 'confirmed') {
            json_error('Only confirmed trips can be accepted.', 422);
        }
        $pdo->prepare('UPDATE reservations SET status = "on_trip" WHERE reservation_id = ?')->execute([$id]);
        
        // Create notification for trip acceptance (with error handling)
        try {
            create_notification($pdo, (int)$user['user_id'], 'reservation_confirmed', 
                'Trip Accepted', 
                'You have accepted the trip to ' . $res['destination'] . '. Drive safely!');
        } catch (Exception $e) {
            error_log('WARNING: Failed to create trip accept notification for user_id: ' . (int)$user['user_id'] . ' - ' . $e->getMessage());
        }
        
        json_out(['ok' => true, 'status' => 'on_trip']);
    }

    if ($action === 'done') {
        if (!in_array($res['status'], ['confirmed', 'on_trip'], true)) {
            json_error('Only active trips can be marked done.', 422);
        }
        if ($res['start_date'] > date('Y-m-d')) {
            json_error('This trip has not started yet.', 422);
        }
        $pdo->beginTransaction();
        try {
            complete_reservation($pdo, $id);
            $pdo->commit();
            
            // Create notification for trip completion (with error handling)
            try {
                create_notification($pdo, (int)$user['user_id'], 'system_alert', 
                    'Trip Completed', 
                    'You have successfully completed the trip to ' . $res['destination'] . '. Great job!');
            } catch (Exception $e) {
                error_log('WARNING: Failed to create trip completion notification for user_id: ' . (int)$user['user_id'] . ' - ' . $e->getMessage());
            }
        } catch (Throwable $e) {
            $pdo->rollBack();
            json_error('Failed to complete trip: ' . $e->getMessage(), 500);
        }
        json_out(['ok' => true, 'status' => 'completed']);
    }

    if ($action === 'cancel') {
        if (!in_array($res['status'], ['confirmed', 'on_trip'], true)) {
            json_error('Only active trips can be cancelled.', 422);
        }
        $pdo->beginTransaction();
        try {
            cancel_reservation($pdo, $id);
            $pdo->commit();
            
            // Create notification for trip cancellation (with error handling)
            try {
                create_notification($pdo, (int)$user['user_id'], 'system_alert', 
                    'Trip Cancelled', 
                    'You have cancelled the trip to ' . $res['destination'] . '.');
            } catch (Exception $e) {
                error_log('WARNING: Failed to create trip cancellation notification for user_id: ' . (int)$user['user_id'] . ' - ' . $e->getMessage());
            }
        } catch (Throwable $e) {
            $pdo->rollBack();
            json_error('Failed to cancel trip: ' . $e->getMessage(), 500);
        }
        json_out(['ok' => true, 'status' => 'cancelled']);
    }
}

json_error('Method not allowed.', 405);
