<?php
require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');

// Share one session across all API endpoints (cookie-based)
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

function json_out($data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function json_error(string $message, int $status = 400): void
{
    json_out(['error' => $message], $status);
}

function body_json(): array
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function require_login(): array
{
    $user_id = $_SESSION['user_id'] ?? null;
    if (!$user_id) {
        json_error('Unauthorized. Please log in.', 401);
    }

    $stmt = db()->prepare('SELECT user_id, username, fullname, role, status FROM users WHERE user_id = ?');
    $stmt->execute([$user_id]);
    $user = $stmt->fetch();

    if (!$user || $user['status'] !== 'active') {
        json_error('Account is inactive or suspended.', 403);
    }

    // Session data is only ever written at login; releasing the lock here lets
    // parallel AJAX calls (e.g. Promise.all dashboard loads) run concurrently
    // instead of serializing on the PHP session file.
    session_write_close();

    return $user;
}

function require_role(array $user, array $roles): void
{
    if (!in_array($user['role'], $roles, true)) {
        json_error('Forbidden: your role does not have access to this resource.', 403);
    }
}

// Fine-grained RBAC (CenSys UserPermission pattern).
// Super Admin bypasses every check; everyone else is matched against
// their user_permissions rows (scope + action + is_allowed).
function has_permission(PDO $pdo, int $user_id, string $role, string $scope, string $action): bool
{
    // Super Admin bypasses every check.
    if (strcasecmp($role, 'superadmin') === 0) {
        return true;
    }

    // Load the user's entire permission set in one query and cache it for the
    // request, so repeated checks (one per gated action) never hit the DB again.
    static $perms = [];
    if (!isset($perms[$user_id])) {
        $stmt = $pdo->prepare(
            'SELECT scope, action FROM user_permissions WHERE user_id = ? AND is_allowed = 1'
        );
        $stmt->execute([$user_id]);
        $perms[$user_id] = [];
        foreach ($stmt->fetchAll() as $row) {
            $perms[$user_id][$row['scope'] . '|' . $row['action']] = true;
        }
    }

    return isset($perms[$user_id][$scope . '|' . $action]);
}

function require_permission(PDO $pdo, array $user, string $scope, string $action): void
{
    if (!has_permission($pdo, (int)$user['user_id'], $user['role'], $scope, $action)) {
        json_error('Forbidden: your account does not have the ' . $scope . '/' . $action . ' permission.', 403);
    }
}

// Audit trail (CenSys ActionLog pattern)
function log_action(PDO $pdo, int $user_id, string $action, string $details): void
{
    $pdo->prepare(
        'INSERT INTO action_logs (user_id, action, details) VALUES (?, ?, ?)'
    )->execute([$user_id, $action, mb_substr($details, 0, 500)]);
}

// Notification system for driver events
function create_notification(PDO $pdo, int $user_id, string $type, string $title, string $description): void
{
    try {
        $stmt = $pdo->prepare(
            'INSERT INTO notifications (user_id, type, title, description) VALUES (?, ?, ?, ?)'
        );
        $stmt->execute([$user_id, $type, $title, $description]);
    } catch (Exception $e) {
        error_log('Failed to create notification: ' . $e->getMessage());
    }
}

// Get user_id from driver_id for notification targeting
function get_user_id_by_driver(PDO $pdo, int $driver_id): ?int
{
    $stmt = $pdo->prepare('SELECT user_id FROM drivers WHERE driver_id = ?');
    $stmt->execute([$driver_id]);
    $userId = $stmt->fetchColumn();
    return $userId ? (int)$userId : null;
}

// The full permission matrix offered by the Create/Edit Account form.
// Scope -> actions, mirroring the CenSys scope/action grid.
function permission_matrix(): array
{
    return [
        'Home' => ['View'],
        'Accounts' => ['View', 'Add', 'Edit', 'Delete'],
        'Drivers' => ['View', 'Add', 'Edit', 'Delete'],
        'Fleet' => ['View', 'Add', 'Edit', 'Delete'],
        'Assignments' => ['View', 'Add', 'Edit', 'Delete'],
        'Reservations' => ['View', 'Add', 'Edit', 'Delete'],
        'Billing' => ['View', 'Add', 'Edit', 'Delete'],
        'Payroll' => ['View', 'Add', 'Edit', 'Delete'],
        'Pricing' => ['View', 'Add', 'Edit', 'Delete'],
    ];
}

// Map DB vehicle status to the GUI display status
function vehicle_gui_status(string $status): string
{
    switch ($status) {
        case 'available':
            return 'Available';
        case 'reserved':
        case 'on_trip':
            return 'Assigned';
        case 'maintenance':
            return 'Maintenance';
        default:
            return ucfirst($status);
    }
}

function vehicle_car_code(array $vehicle): string
{
    $prefix = $vehicle['owner_id'] ? 'SC' : 'HD';
    return sprintf('%s-%s-%03d', $prefix, $vehicle['vehicle_type'], $vehicle['vehicle_id']);
}

// Format TIME column like "08:00 AM"
function fmt_time(?string $t): string
{
    if (!$t) return '-';
    $time = strtotime($t);
    if ($time === false) return '-';
    return date('h:i A', $time);
}

// Driver's active reservation (driver_id -> row with vehicle + trip details)
function active_reservation_for_driver(PDO $pdo, int $driver_id): ?array
{
    $stmt = $pdo->prepare(
        'SELECT r.reservation_id, r.client_id, r.driver_id, r.vehicle_id, r.trip_code,
                r.start_date, r.destination, r.passengers, r.luggage, r.status,
                c.contact_person AS client_name, c.company_name, c.contact_number,
                v.plate_number, v.model, v.vehicle_type, v.owner_id, v.vehicle_id,
                tl.start_time
         FROM reservations r
         JOIN clients c ON c.client_id = r.client_id
         LEFT JOIN vehicles v ON v.vehicle_id = r.vehicle_id
         LEFT JOIN trip_logs tl ON tl.reservation_id = r.reservation_id
         WHERE r.driver_id = ? AND r.status IN ("confirmed", "on_trip")
         ORDER BY r.start_date DESC, r.reservation_date DESC
         LIMIT 1'
    );
    $stmt->execute([$driver_id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

// Completion logic shared by DMH "Trip Done" and driver "Trip Done":
// completes the reservation, closes the trip log, frees the vehicle,
// and auto-generates the draft client invoice (idempotent per reservation).
function complete_reservation(PDO $pdo, int $reservationId): void
{
    $stmt = $pdo->prepare(
        'SELECT reservation_id, vehicle_id, destination, total_amount
         FROM reservations WHERE reservation_id = ? AND status IN ("confirmed", "on_trip")'
    );
    $stmt->execute([$reservationId]);
    $res = $stmt->fetch();
    if (!$res) return;

    $pdo->prepare('UPDATE reservations SET status = "completed" WHERE reservation_id = ?')->execute([$reservationId]);

    $pdo->prepare(
        'UPDATE trip_logs
         SET end_time = CURTIME(), end_location = ?, remarks = "Trip completed"
         WHERE reservation_id = ? AND end_time IS NULL'
    )->execute([$res['destination'], $reservationId]);

    $pdo->prepare('UPDATE vehicles SET status = "available" WHERE vehicle_id = ?')->execute([$res['vehicle_id']]);

    // ERD: one billing row per reservation; stays "draft" for the Billing module.
    $billingExists = $pdo->prepare('SELECT billing_id FROM billing WHERE reservation_id = ?');
    $billingExists->execute([$reservationId]);
    if (!$billingExists->fetch()) {
        $amount = (float)$res['total_amount'];
        $vat = round($amount * 0.12, 2);
        $invoiceNumber = 'INV-' . date('Ymd') . '-' . str_pad((string)$reservationId, 4, '0', STR_PAD_LEFT);
        $pdo->prepare(
            'INSERT INTO billing (reservation_id, invoice_number, invoice_date, amount, vat, total_amount, status)
             VALUES (?, ?, CURDATE(), ?, ?, ?, "draft")'
        )->execute([$reservationId, $invoiceNumber, $amount, $vat, $amount + $vat]);
    }
}

// Shared cancel logic: reservation -> cancelled, vehicle freed, open trip log closed.
function cancel_reservation(PDO $pdo, int $reservationId): void
{
    $stmt = $pdo->prepare(
        'SELECT vehicle_id FROM reservations WHERE reservation_id = ? AND status IN ("confirmed", "on_trip")'
    );
    $stmt->execute([$reservationId]);
    $res = $stmt->fetch();
    if (!$res) return;

    $pdo->prepare('UPDATE reservations SET status = "cancelled" WHERE reservation_id = ?')->execute([$reservationId]);

    $pdo->prepare(
        'UPDATE trip_logs SET end_time = CURTIME(), remarks = "Cancelled"
         WHERE reservation_id = ? AND end_time IS NULL'
    )->execute([$reservationId]);

    $pdo->prepare('UPDATE vehicles SET status = "available" WHERE vehicle_id = ?')->execute([$res['vehicle_id']]);
}

/*
 * ---------------------------------------------------------------------------
 * Current Car Rates  (car rate management + payroll car-rental calculation)
 * ---------------------------------------------------------------------------
 * The rate a payroll pays for a car is whatever was in effect on the day the
 * car was actually used, so these helpers are shared by the Current Car Rates
 * screen and the payroll wizard to keep both on exactly one calculation.
 */

/**
 * The daily rate in effect for a vehicle on a given date.
 * Falls back to vehicles.daily_rate when no history row covers the date, which
 * keeps every pre-migration vehicle working without changing any amount.
 */
function vehicle_rate_on(PDO $pdo, int $vehicleId, string $date): array
{
    $stmt = $pdo->prepare(
        'SELECT daily_rate, effective_from
           FROM vehicle_rate_history
          WHERE vehicle_id = ?
            AND effective_from <= ?
            AND (effective_to IS NULL OR effective_to >= ?)
          ORDER BY effective_from DESC
          LIMIT 1'
    );
    $stmt->execute([$vehicleId, $date, $date]);
    $row = $stmt->fetch();

    if ($row) {
        return ['rate' => (float)$row['daily_rate'], 'source' => 'history', 'from' => $row['effective_from']];
    }

    $fallback = $pdo->prepare('SELECT daily_rate FROM vehicles WHERE vehicle_id = ?');
    $fallback->execute([$vehicleId]);
    $cur = $fallback->fetchColumn();
    if ($cur === false) return ['rate' => 0.0, 'source' => 'none', 'from' => null];

    return ['rate' => (float)$cur, 'source' => 'vehicle', 'from' => null];
}

/**
 * The driver currently assigned to a vehicle (optionally as of a date).
 * Returns null when the car has never been assigned.
 */
function vehicle_assignment_on(PDO $pdo, int $vehicleId, ?string $date = null): ?array
{
    $date = $date ?: date('Y-m-d');
    $stmt = $pdo->prepare(
        'SELECT a.driver_id, d.fullname, a.effective_from
           FROM vehicle_driver_assignments a
           JOIN drivers d ON d.driver_id = a.driver_id
          WHERE a.vehicle_id = ?
            AND a.effective_from <= ?
            AND (a.effective_to IS NULL OR a.effective_to >= ?)
          ORDER BY a.effective_from DESC
          LIMIT 1'
    );
    $stmt->execute([$vehicleId, $date, $date]);
    $row = $stmt->fetch();
    if (!$row) return null;

    return [
        'driverId' => (int)$row['driver_id'],
        'name' => $row['fullname'],
        'effectiveFrom' => $row['effective_from'],
    ];
}

/**
 * Car Rental breakdown for one driver's payroll period.
 *
 * Every eligible completed trip contributes the vehicle and the calendar date
 * it was actually used. Repeated use of the same car on the same day counts
 * once, and each distinct (car, day) is priced at the rate that was in effect
 * on that day. Summing per car means a driver who used a single car gets
 * exactly daily_rate x unique use days, while a driver who rotated cars is
 * paid each car's own rate for its own days.
 */
function car_rental_breakdown(PDO $pdo, int $driverId, string $start, string $end): array
{
    $stmt = $pdo->prepare(
        'SELECT tl.trip_date, tl.vehicle_id, v.plate_number, v.model, v.vehicle_type,
                v.owner_id, v.daily_rate
           FROM trip_logs tl
           JOIN reservations r ON r.reservation_id = tl.reservation_id
           JOIN vehicles v ON v.vehicle_id = tl.vehicle_id
          WHERE tl.driver_id = ? AND r.status = "completed" AND tl.trip_date BETWEEN ? AND ?
          ORDER BY tl.trip_date ASC, tl.log_id ASC'
    );
    $stmt->execute([$driverId, $start, $end]);
    $trips = $stmt->fetchAll();

    if (!$trips) {
        return [
            'segments' => [],
            'tripCount' => 0,
            'useDays' => 0,
            'total' => 0.0,
            'noTrips' => true,
            'missingRate' => false,
            'unassigned' => false,
        ];
    }

    // One rate-history fetch for every vehicle involved, instead of per trip.
    $vehicleIds = array_values(array_unique(array_map(fn($t) => (int)$t['vehicle_id'], $trips)));
    $in = implode(',', array_fill(0, count($vehicleIds), '?'));
    $hist = $pdo->prepare(
        "SELECT vehicle_id, daily_rate, effective_from, effective_to
           FROM vehicle_rate_history
          WHERE vehicle_id IN ($in)
          ORDER BY effective_from ASC"
    );
    $hist->execute($vehicleIds);
    $history = [];
    foreach ($hist->fetchAll() as $h) {
        $history[(int)$h['vehicle_id']][] = $h;
    }

    $rateFor = function (int $vehicleId, string $date) use ($history, $trips) {
        // Newest effective_from wins, so a handoff day is billed at the new
        // rate. This matches vehicle_rate_on() exactly.
        foreach (array_reverse($history[$vehicleId] ?? []) as $h) {
            if ($h['effective_from'] <= $date && ($h['effective_to'] === null || $h['effective_to'] >= $date)) {
                return ['rate' => (float)$h['daily_rate'], 'source' => 'history'];
            }
        }
        $fallback = 0.0;
        foreach ($trips as $t) {
            if ((int)$t['vehicle_id'] === $vehicleId) { $fallback = (float)$t['daily_rate']; break; }
        }
        return ['rate' => $fallback, 'source' => 'vehicle'];
    };

    // Group by car AND rate: a period that spans a rate change becomes two
    // priced segments for the same car instead of one blended figure.
    $groups = [];
    $order = [];
    foreach ($trips as $t) {
        $vehicleId = (int)$t['vehicle_id'];
        $date = (string)$t['trip_date'];
        $r = $rateFor($vehicleId, $date);
        $key = $vehicleId . '|' . number_format($r['rate'], 2, '.', '');

        if (!isset($groups[$key])) {
            $order[] = $key;
            $groups[$key] = [
                'vehicleId' => $vehicleId,
                'carCode' => vehicle_car_code($t),
                'plateNumber' => $t['plate_number'],
                'vehicleType' => $t['vehicle_type'],
                'model' => $t['model'],
                'dailyRate' => $r['rate'],
                'rateSource' => $r['source'],
                'dates' => [],
            ];
        }
        $groups[$key]['dates'][$date] = true; // de-duplicates repeated car/days
    }

    $segments = [];
    $total = 0.0;
    $useDays = 0;
    $missingRate = false;
    $unassigned = false;

    foreach ($order as $key) {
        $g = $groups[$key];
        $days = count($g['dates']);
        $amount = round($g['dailyRate'] * $days, 2);

        $assignment = vehicle_assignment_on($pdo, $g['vehicleId'], $start);
        if ($assignment === null) $unassigned = true;
        if ($g['dailyRate'] <= 0) $missingRate = true;

        $total += $amount;
        $useDays += $days;

        $dates = array_keys($g['dates']);
        sort($dates);

        $segments[] = [
            'carCode' => $g['carCode'],
            'vehicleId' => $g['vehicleId'],
            'plateNumber' => $g['plateNumber'],
            'vehicleType' => $g['vehicleType'],
            'model' => $g['model'],
            'dailyRate' => round($g['dailyRate'], 2),
            'rateSource' => $g['rateSource'],
            'useDays' => $days,
            'dates' => $dates,
            'amount' => $amount,
            'assignedDriver' => $assignment ? $assignment['name'] : null,
        ];
    }

    return [
        'segments' => $segments,
        'tripCount' => count($trips),
        'useDays' => $useDays,
        'total' => round($total, 2),
        'noTrips' => false,
        'missingRate' => $missingRate,
        'unassigned' => $unassigned,
    ];
}

// ----------------------------------------------------------------------------
//  Security / sessions / preferences (customer + payroll dashboards)
// ----------------------------------------------------------------------------

function security_settings_for(PDO $pdo, int $userId): array
{
    $row = $pdo->prepare(
        'SELECT face_recognition_enabled, two_factor_enabled, two_factor_method,
                login_notifications_enabled, backup_codes_total, backup_codes_used,
                password_strength, last_security_check
         FROM security_settings WHERE user_id = ?'
    );
    $row->execute([$userId]);
    $r = $row->fetch() ?: [];

    return [
        'faceRecognitionEnabled' => (bool)($r['face_recognition_enabled'] ?? 0),
        'twoFactorEnabled' => (bool)($r['two_factor_enabled'] ?? 0),
        'twoFactorMethod' => $r['two_factor_method'] ?? 'Authenticator App (TOTP)',
        'loginNotifications' => (bool)($r['login_notifications_enabled'] ?? 1),
        'backupCodesTotal' => (int)($r['backup_codes_total'] ?? 10),
        'backupCodesUsed' => (int)($r['backup_codes_used'] ?? 0),
        'passwordStrength' => $r['password_strength'] ?? 'Strong',
        'lastSecurityCheck' => $r['last_security_check'] ? substr($r['last_security_check'], 0, 10) : null,
    ];
}

function login_sessions_for(PDO $pdo, int $userId): array
{
    $rows = $pdo->prepare(
        'SELECT session_id, device, location, status, logged_in_at
         FROM login_sessions WHERE user_id = ?
         ORDER BY logged_in_at DESC LIMIT 20'
    );
    $rows->execute([$userId]);

    return array_map(function ($s) {
        return [
            'id' => (int)$s['session_id'],
            'device' => $s['device'],
            'location' => $s['location'],
            'status' => $s['status'],
            'time' => date('Y-m-d h:i A', strtotime($s['logged_in_at'])),
        ];
    }, $rows->fetchAll());
}

function user_activity_for(PDO $pdo, int $userId): array
{
    $rows = $pdo->prepare(
        'SELECT "login" AS kind, "" AS label, logged_in_at AS at
         FROM login_sessions WHERE user_id = ?
         UNION ALL
         SELECT "action", action, created_at FROM action_logs WHERE user_id = ?
         ORDER BY at DESC LIMIT 10'
    );
    $rows->execute([$userId, $userId]);

    return array_map(function ($a) {
        return [
            'kind' => $a['kind'],
            'label' => $a['kind'] === 'login' ? 'Logged in' : ($a['label'] ?? 'Action'),
            'time' => date('Y-m-d h:i A', strtotime($a['at'])),
        ];
    }, $rows->fetchAll());
}

function preferences_for(PDO $pdo, int $userId): array
{
    $row = $pdo->prepare(
        'SELECT language, date_format, time_format, timezone FROM user_preferences WHERE user_id = ?'
    );
    $row->execute([$userId]);
    $r = $row->fetch() ?: [];

    return [
        'language' => $r['language'] ?? 'English',
        'dateFormat' => $r['date_format'] ?? 'MMM D, YYYY',
        'timeFormat' => $r['time_format'] ?? '12-hour (AM/PM)',
        'timezone' => $r['timezone'] ?? '(GMT+08:00) Asia/Manila',
    ];
}

// Validate a base64 image payload and return the data URL for direct DB storage,
// or null when absent/empty/malformed.
function save_single_image(?string $image): ?string
{
    if (!preg_match('#^data:image/(png|jpe?g|webp);base64,(.+)$#i', (string)$image, $m)) {
        return null;
    }

    return $image;
}

// Persist the vehicle images from a request body. Accepts an explicit list of
// base64 data URLs (`images`) and falls back to the legacy single `image` field.
// Returns the list of public URL paths in submission order (empty if none).
function save_vehicle_images(array $data): array
{
    $sources = [];

    if (isset($data['images']) && is_array($data['images'])) {
        $sources = array_values($data['images']);
    } elseif (!empty($data['image'])) {
        $sources = [(string)$data['image']];
    }

    $urls = [];
    foreach ($sources as $image) {
        $url = save_single_image((string)$image);
        if ($url !== null && count($urls) < 12) {
            $urls[] = $url;
        }
    }

    return $urls;
}
