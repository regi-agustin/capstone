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

// The full permission matrix offered by the Create/Edit Account form.
// Scope -> actions, mirroring the CenSys scope/action grid.
function permission_matrix(): array
{
    return [
        'Home' => ['View'],
        'Accounts' => ['View', 'Add', 'Edit', 'Delete'],
        'Drivers' => ['View', 'Add', 'Edit', 'Delete'],
        'Fleet' => ['View', 'Add', 'Edit', 'Delete'],
        'Assignments' => ['View', 'Add', 'Delete'],
        'Reservations' => ['View', 'Add', 'Edit', 'Delete'],
        'Billing' => ['View', 'Add', 'Edit', 'Delete'],
        'Payroll' => ['View'],
        'Pricing' => ['View', 'Edit'],
    ];
}

// Map DB vehicle status to the GUI display status
function vehicle_gui_status(string $status): string
{
    return match ($status) {
        'available' => 'Available',
        'reserved', 'on_trip' => 'Assigned',
        'maintenance' => 'Maintenance',
        default => ucfirst($status),
    };
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
    return date('h:i A', strtotime($t));
}

// Driver's active reservation (driver_id -> row with vehicle + trip details)
function active_reservation_for_driver(PDO $pdo, int $driver_id): ?array
{
    $stmt = $pdo->prepare(
        'SELECT r.reservation_id, r.client_id, r.driver_id, r.vehicle_id, r.trip_code,
                r.start_date, r.trip_purpose, r.destination, r.passengers, r.luggage, r.status,
                c.company_name AS client_name, c.contact_person, c.contact_number,
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
