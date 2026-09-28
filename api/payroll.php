<?php
require_once __DIR__ . '/helpers.php';

$user = require_login();
$pdo = db();

$isPayroll = in_array($user['role'], ['superadmin', 'admin', 'payroll_officer'], true);
$isAdmin = in_array($user['role'], ['superadmin', 'admin'], true);

if ($user['role'] === 'driver') {
    $stmt = $pdo->prepare('SELECT driver_id FROM drivers WHERE user_id = ?');
    $stmt->execute([$user['user_id']]);
    $driverId = (int)$stmt->fetchColumn();
    if ($driverId <= 0) json_error('No driver record linked to this account.', 404);
} else {
    // Unlike the old simple API, the payroll module is scoped to the people
    // who actually run payroll. Everyone else is locked out.
    if (!$isPayroll) json_error('Forbidden.', 403);
    $driverId = null;
}

/*
 * ---------------------------------------------------------------------------
 * Payroll domain helpers
 * ---------------------------------------------------------------------------
 */

function payroll_earnings_blank(): array
{
    return [
        'car_rental' => 0.0, 'fuel_subsidy' => 0.0, 'excess_gas' => 0.0,
        'overnight_allowance' => 0.0, 'overtime' => 0.0, 'misc' => 0.0,
        'time_hazard' => 0.0, 'dispute' => 0.0,
    ];
}

function payroll_deductions_blank(): array
{
    return [
        'advance' => 0.0, 'penalty' => 0.0, 'no_line_up' => 0.0, 'absent_leave' => 0.0,
        'wtax' => 0.0, 'membership' => 0.0, 'cash_bond' => 0.0,
        'coop_savings' => 0.0, 'coop_loan' => 0.0, 'others' => 0.0,
    ];
}

// Normalise client-submitted earnings/deductions into safe numeric maps.
function payroll_numbers(array $raw, array $blank): array
{
    foreach ($blank as $k => $v) {
        $val = $raw[$k] ?? 0;
        $blank[$k] = max(0, round((float)$val, 2));
    }
    return $blank;
}

// Recompute totals AND the 2% withholding tax on miscellaneous charges.
// WTAX base = overtime + miscellaneous (toll + parking), matching the workbook:
// e.g. 2% × (P540.00 overtime + P1,174.00 misc) = P34.28.
function payroll_recompute(array $earnings, array $deductions): array
{
    $wtaxBase = $earnings['overtime'] + $earnings['misc'];
    $deductions['wtax'] = round($wtaxBase * 0.02, 2);

    $totalEarnings = $earnings['car_rental'] + $earnings['fuel_subsidy'] + $earnings['excess_gas']
        + $earnings['overnight_allowance'] + $earnings['overtime'] + $earnings['misc']
        + $earnings['time_hazard'] - $earnings['dispute'];

    $totalDeductions = $deductions['advance'] + $deductions['penalty'] + $deductions['no_line_up']
        + $deductions['absent_leave'] + $deductions['wtax'] + $deductions['membership']
        + $deductions['cash_bond'] + $deductions['coop_savings'] + $deductions['coop_loan']
        + $deductions['others'];

    $totalReceivable = round($totalEarnings - $totalDeductions, 2);

    return [
        'earnings' => $earnings,
        'deductions' => $deductions,
        'totalEarnings' => round($totalEarnings, 2),
        'totalDeductions' => round($totalDeductions, 2),
        'totalReceivable' => $totalReceivable,
    ];
}

function payroll_decode_json(?string $json, array $blank): array
{
    $v = json_decode($json ?: '', true);
    return is_array($v) ? array_merge($blank, array_intersect_key($v, $blank)) : $blank;
}

// Read one value from the app_settings key/value store. Falls back to the
// supplied default when the table has not been created yet (pre-migration).
function app_setting(PDO $pdo, string $key, string $default = ''): string
{
    try {
        $stmt = $pdo->prepare('SELECT setting_value FROM app_settings WHERE setting_key = ?');
        $stmt->execute([$key]);
        $value = $stmt->fetchColumn();
        return $value === false || $value === null ? $default : (string)$value;
    } catch (Throwable $e) {
        return $default;
    }
}

// Shape a payroll row for the API (earnings/deductions already decoded).
function payroll_row_shape(array $p): array
{
    $earnings = payroll_decode_json($p['earnings_json'] ?? null, payroll_earnings_blank());
    $deductions = payroll_decode_json($p['deductions_json'] ?? null, payroll_deductions_blank());

    foreach ($earnings as $k => $v) $earnings[$k] = (float)$v;
    foreach ($deductions as $k => $v) $deductions[$k] = (float)$v;

    // The frozen rate inputs for this period, kept verbatim so the payslip can
    // show what each car was billed at even after rates change.
    $snapshot = isset($p['car_rate_snapshot']) ? json_decode((string)$p['car_rate_snapshot'], true) : null;

    return [
        'id' => (int)$p['payroll_id'],
        'driverId' => (int)$p['driver_id'],
        'driverName' => $p['driver_name'] ?? '',
        'contact' => $p['contact_number'] ?? '',
        'vehicleId' => $p['vehicle_id'] !== null ? (int)$p['vehicle_id'] : null,
        'carCode' => $p['car_code'] ?? 'Additional',
        'plateNumber' => $p['plate_number'] ?? '',
        'vehicleType' => $p['vehicle_type'] ?? '',
        'carOwner' => $p['car_owner'] ?? '',
        'cutoffStart' => $p['cutoff_start'],
        'cutoffEnd' => $p['cutoff_end'],
        'payrollDate' => $p['payroll_date'],
        'date' => $p['payroll_date'], // alias kept for the dashboard
        'status' => $p['status'],
        'earnings' => $earnings,
        'deductions' => $deductions,
        'carRateSnapshot' => is_array($snapshot) ? $snapshot : null,
        'totalEarnings' => (float)$p['total_earnings'],
        'totalDeductions' => (float)$p['total_deductions'],
        'totalReceivable' => (float)$p['total_receivable'],
        'netAmount' => (float)$p['total_receivable'], // alias kept for the dashboard
        'remarks' => $p['payroll_remarks'] ?? '',
        'paymentMethod' => $p['payment_method'] ?? '',
        'amountPaid' => (float)($p['amount_paid'] ?? 0),
        'datePaid' => $p['date_paid'] ?? null,
        'referenceNumber' => $p['reference_number'] ?? '',
        'tripCount' => isset($p['trip_count']) ? (int)$p['trip_count'] : 0,
        'submittedByName' => $p['submitted_name'] ?? '',
        'approvedByName' => $p['approved_name'] ?? '',
        'approvedAt' => $p['approved_at'] ?? null,
    ];
}

// Base SELECT shared by the list and the preview endpoints.
function payroll_base_select(PDO $pdo): string
{
    return 'SELECT p.*, d.fullname AS driver_name, d.contact_number,
                   COALESCE((SELECT COUNT(*) FROM payroll_trips pt WHERE pt.payroll_id = p.payroll_id), 0) AS trip_count,
                   u1.fullname AS submitted_name, u2.fullname AS approved_name
            FROM payroll p
            JOIN drivers d ON d.driver_id = p.driver_id
            LEFT JOIN users u1 ON u1.user_id = p.submitted_by
            LEFT JOIN users u2 ON u2.user_id = p.approved_by';
}

// Shape one payroll_trips row (snapshots) for preview.
function payroll_trip_shape(array $t): array
{
    return [
        'key' => (int)$t['log_id'],
        'reservationId' => (int)$t['reservation_id'],
        'logId' => (int)$t['log_id'],
        'date' => $t['trip_date'],
        'carCode' => $t['car_code'] ?? '',
        'plateNumber' => $t['plate_number'] ?? '',
        'model' => $t['vehicle_model'] ?? '',
        'rentalRate' => (float)$t['rental_rate'],
        'requestedTime' => fmt_time($t['requested_time'] ?? null),
        'requestedTimeRaw' => $t['requested_time'] ?? null,
        'timeOut' => fmt_time($t['time_out'] ?? null),
        'timeOutRaw' => $t['time_out'] ?? null,
        'workHours' => (float)($t['work_hours'] ?? 0),
        'excessKm' => (float)($t['excess_km'] ?? 0),
        'excessGas' => (float)($t['excess_gas'] ?? 0),
        'overnightRate' => (float)($t['overnight_rate'] ?? 0),
        'otHours' => (float)($t['ot_hours'] ?? 0),
        'otAmount' => (float)($t['ot_amount'] ?? 0),
        'dime' => (float)($t['dime'] ?? 0),
        'hazard' => (float)($t['hazard'] ?? 0),
        'toll' => (float)($t['toll'] ?? 0),
        'parking' => (float)($t['parking'] ?? 0),
        'advance' => (float)($t['advance'] ?? 0),
        'totalAmount' => (float)($t['total_amount'] ?? 0),
    ];
}

// Worked hours from trip start/end.
function payroll_hours_between(?string $start, ?string $end): float
{
    if (!$start || !$end) return 0.0;
    return abs(strtotime($end) - strtotime($start)) / 3600;
}

/*
 * ---------------------------------------------------------------------------
 *  Current Car Rates
 *  A "car rate" is a fleet vehicle as payroll sees it: the derived car code,
 *  its daily rate, plate, owner and the driver currently assigned to it.
 * ---------------------------------------------------------------------------
 */

function payroll_car_rate_select(): string
{
    // Assigned driver comes from the live booking, not a stored column, so the
    // list always agrees with the Reservations module.
    return 'SELECT v.vehicle_id, v.car_code, v.plate_number, v.model, v.vehicle_type, v.owner_id,
                   v.status, v.daily_rate, v.purchase_date, vo.owner_name,
                   (SELECT d.fullname FROM reservations r
                      JOIN drivers d ON d.driver_id = r.driver_id
                     WHERE r.vehicle_id = v.vehicle_id
                       AND r.status IN ("confirmed", "on_trip")
                     ORDER BY r.start_date DESC, r.reservation_id DESC
                     LIMIT 1) AS assigned_driver
              FROM vehicles v
              LEFT JOIN vehicle_owners vo ON vo.owner_id = v.owner_id';
}

function payroll_car_rate_shape(array $v): array
{
    return [
        'id' => (int)$v['vehicle_id'],
        'carCode' => vehicle_car_code($v),
        'category' => $v['vehicle_type'],
        'model' => $v['model'],
        'plate' => $v['plate_number'],
        'owner' => $v['owner_name'] ?: 'Company Owned',
        'ownerId' => $v['owner_id'] ? (int)$v['owner_id'] : null,
        'dailyRate' => (float)$v['daily_rate'],
        'driver' => $v['assigned_driver'] ?: '',
        'since' => $v['purchase_date'] ? date('M j, Y', strtotime($v['purchase_date'])) : '',
        'status' => vehicle_gui_status($v['status']),
    ];
}

function payroll_car_rate_row(PDO $pdo, int $id): array
{
    $stmt = $pdo->prepare(payroll_car_rate_select() . ' WHERE v.vehicle_id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) json_error('Car rate not found.', 404);
    return payroll_car_rate_shape($row);
}

// Shared payload validation for car rate add/update. Returns cleaned fields.
function payroll_car_rate_payload(array $data): array
{
    $plate = strtoupper(trim((string)($data['plate'] ?? '')));
    $type = trim((string)($data['type'] ?? ''));
    $model = trim((string)($data['model'] ?? ''));
    $dailyRate = round(max(0, (float)($data['dailyRate'] ?? 0)), 2);
    $ownerId = (int)($data['ownerId'] ?? 0);

    if ($plate === '' || $model === '') json_error('Plate number and model are required.', 422);
    if (!preg_match('/^[A-Z0-9\s-]{3,}$/', $plate)) json_error('Invalid plate number format.', 422);

    // Mirrors api/vehicles.php so both entries produce identical fleet records.
    $allowedTypes = ['AUV', 'SUV', 'L300'];
    if (!in_array($type, $allowedTypes, true)) {
        json_error('Invalid vehicle type. Allowed: ' . implode(', ', $allowedTypes), 422);
    }
    if ($dailyRate <= 0) json_error('Daily rate must be greater than zero.', 422);

    return [
        'plate' => $plate,
        'type' => $type,
        'model' => mb_substr($model, 0, 100),
        'dailyRate' => $dailyRate,
        'ownerId' => $ownerId ?: null,
    ];
}


/*
 * ---------------------------------------------------------------------------
 * GET endpoints
 * ---------------------------------------------------------------------------
 */

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $action = trim((string)($_GET['action'] ?? ''));

    // ---- App-wide display settings (company name shown on payslips) ------
    if ($action === 'settings') {
        json_out([
            'companyName' => app_setting($pdo, 'company_name', 'FleetOps Car Rental'),
        ]);
    }

    // ---- Current Car Rates: the car codes payroll bills against ---------
    if ($action === 'carrates') {
        if (!$isPayroll) json_error('Forbidden.', 403);

        $rows = $pdo->query(payroll_car_rate_select() . ' ORDER BY v.vehicle_id')->fetchAll();
        $owners = $pdo->query(
            'SELECT owner_id, owner_name FROM vehicle_owners WHERE status = "active" ORDER BY owner_name'
        )->fetchAll();

        json_out([
            'cars' => array_map('payroll_car_rate_shape', $rows),
            'owners' => array_map(fn($o) => [
                'id' => (int)$o['owner_id'],
                'name' => $o['owner_name'],
            ], $owners),
        ]);
    }

    // ---- Driver self-service: their own payroll credits ------------------
    if ($user['role'] === 'driver') {
        $rows = $pdo->prepare(
            'SELECT p.*, d.fullname AS driver_name, d.contact_number
             FROM payroll p JOIN drivers d ON d.driver_id = p.driver_id
             WHERE p.driver_id = ?
             ORDER BY p.payroll_date DESC, p.payroll_id DESC'
        );
        $rows->execute([$driverId]);
        json_out(array_map('payroll_row_shape', $rows->fetchAll()));
    }

    // ---- Cut-off periods available (from completed trips + existing payrolls)
    if ($action === 'cutoffs') {
        $tripDates = $pdo->query(
            'SELECT DISTINCT tl.trip_date FROM trip_logs tl
             JOIN reservations r ON r.reservation_id = tl.reservation_id
             WHERE r.status = "completed"'
        )->fetchAll(PDO::FETCH_COLUMN);

        $payrollPeriods = $pdo->query(
            'SELECT cutoff_start, cutoff_end, COUNT(*) AS cnt
             FROM payroll GROUP BY cutoff_start, cutoff_end'
        )->fetchAll();

        $periods = [];
        $monthNames = [
            1 => 'January', 2 => 'February', 3 => 'March', 4 => 'April', 5 => 'May', 6 => 'June',
            7 => 'July', 8 => 'August', 9 => 'September', 10 => 'October', 11 => 'November', 12 => 'December',
        ];

        foreach ($tripDates as $date) {
            $ts = strtotime($date);
            $y = (int)date('Y', $ts);
            $m = (int)date('n', $ts);
            $d = (int)date('j', $ts);
            $half = $d <= 15 ? 1 : 2;
            $key = "$y-$m-$half";
            if (!isset($periods[$key])) {
                $start = $half === 1 ? sprintf('%04d-%02d-01', $y, $m) : sprintf('%04d-%02d-16', $y, $m);
                $end = $half === 1 ? sprintf('%04d-%02d-15', $y, $m) : date('Y-m-t', strtotime(sprintf('%04d-%02d-01', $y, $m)));
                $periods[$key] = [
                    'start' => $start,
                    'end' => $end,
                    'label' => $monthNames[$m] . ' ' . ($half === 1 ? '1 – 15' : '16 – ' . (int)substr($end, 8)) . ', ' . $y,
                    'trips' => 0,
                ];
            }
            $periods[$key]['trips']++;
        }
        // Include periods that already have payroll records even if no new trips.
        foreach ($payrollPeriods as $pp) {
            $key = substr($pp['cutoff_start'], 0, 10) . '-' . substr($pp['cutoff_end'], 8, 2);
            // Rebuild key using the same convention.
            $ts = strtotime($pp['cutoff_start']);
            $half = (int)date('j', $ts) <= 15 ? 1 : 2;
            $k = date('Y-n-', $ts) . $half;
            if (!isset($periods[$k])) {
                $m = (int)date('n', $ts);
                $periods[$k] = [
                    'start' => $pp['cutoff_start'],
                    'end' => $pp['cutoff_end'],
                    'label' => $monthNames[$m] . ' ' . ($half === 1 ? '1 – 15' : '16 – ' . (int)substr($pp['cutoff_end'], 8)) . ', ' . (int)date('Y', $ts),
                    'trips' => 0,
                ];
            }
        }

        $out = array_values($periods);
        usort($out, fn($a, $b) => strcmp($a['start'], $b['start']));
        json_out($out);
    }

    // ---- Drivers who have completed trips inside the cut-off -------------
    if ($action === 'eligible') {
        $cutoffStart = trim((string)($_GET['cutoff_start'] ?? ''));
        $cutoffEnd = trim((string)($_GET['cutoff_end'] ?? ''));
        if (!$cutoffStart || !$cutoffEnd) json_error('Cut-off period is required.', 422);

        $stmt = $pdo->prepare(
            'SELECT d.driver_id, d.fullname, d.contact_number, d.license_number, d.address,
                    COUNT(tl.log_id) AS trip_count,
                    COALESCE(SUM(v.daily_rate), 0) AS total_rental,
                    (SELECT COALESCE(SUM(l.monthly_deduction), 0) FROM loans l
                     WHERE l.driver_id = d.driver_id AND l.status = "active") AS loan_deduction,
                    EXISTS (SELECT 1 FROM payroll p
                            WHERE p.driver_id = d.driver_id
                              AND p.cutoff_start = ? AND p.cutoff_end = ?
                              AND p.status <> "cancelled") AS has_payroll
             FROM drivers d
             JOIN trip_logs tl ON tl.driver_id = d.driver_id
             JOIN reservations r ON r.reservation_id = tl.reservation_id
             JOIN vehicles v ON v.vehicle_id = tl.vehicle_id
             WHERE r.status = "completed" AND tl.trip_date BETWEEN ? AND ?
             GROUP BY d.driver_id
             ORDER BY d.fullname'
        );
        $stmt->execute([$cutoffStart, $cutoffEnd, $cutoffStart, $cutoffEnd]);
        $rows = $stmt->fetchAll();

        $out = array_map(function ($d) use ($pdo, $cutoffStart, $cutoffEnd) {
            $vq = $pdo->prepare(
                'SELECT v.plate_number, v.model, v.vehicle_type, v.owner_id, v.vehicle_id, v.daily_rate,
                        v.car_code
                 FROM trip_logs tl
                 JOIN vehicles v ON v.vehicle_id = tl.vehicle_id
                 JOIN reservations r ON r.reservation_id = tl.reservation_id
                 WHERE tl.driver_id = ? AND r.status = "completed" AND tl.trip_date BETWEEN ? AND ?
                 ORDER BY tl.trip_date ASC LIMIT 1'
            );
            $vq->execute([$d['driver_id'], $cutoffStart, $cutoffEnd]);
            $v = $vq->fetch();

            return [
                'id' => (int)$d['driver_id'],
                'name' => $d['fullname'],
                'contact' => $d['contact_number'],
                'licenseNumber' => $d['license_number'],
                'address' => $d['address'] ?? '',
                'tripCount' => (int)$d['trip_count'],
                'totalRental' => (float)$d['total_rental'],
                'loanDeduction' => (float)$d['loan_deduction'],
                'hasPayroll' => (int)$d['has_payroll'] === 1,
                'vehicle' => $v ? [
                    'vehicleId' => (int)$v['vehicle_id'],
                    'carCode' => vehicle_car_code($v),
                    'plate' => $v['plate_number'],
                    'type' => $v['vehicle_type'],
                    'model' => $v['model'],
                ] : null,
            ];
        }, $rows);

        json_out($out);
    }

    // ---- Trip breakdown for a driver inside the cut-off -----------------
    if ($action === 'tripdata') {
        $driverId = (int)($_GET['driver_id'] ?? 0);
        $cutoffStart = trim((string)($_GET['cutoff_start'] ?? ''));
        $cutoffEnd = trim((string)($_GET['cutoff_end'] ?? ''));
        if ($driverId <= 0 || !$cutoffStart || !$cutoffEnd) {
            json_error('Driver and cut-off period are required.', 422);
        }

        $stmt = $pdo->prepare(
            'SELECT tl.log_id, tl.trip_date, tl.start_time, tl.end_time,
                    r.reservation_id, r.trip_code, r.pickup_time, r.return_time,
                    v.vehicle_id, v.plate_number, v.model, v.vehicle_type, v.owner_id, v.daily_rate,
                    v.car_code
             FROM trip_logs tl
             JOIN reservations r ON r.reservation_id = tl.reservation_id
             JOIN vehicles v ON v.vehicle_id = tl.vehicle_id
             WHERE tl.driver_id = ? AND r.status = "completed" AND tl.trip_date BETWEEN ? AND ?
             ORDER BY tl.trip_date ASC, tl.log_id ASC'
        );
        $stmt->execute([$driverId, $cutoffStart, $cutoffEnd]);

        $out = array_map(function ($t) {
            $rate = (float)$t['daily_rate'];
            $ot = 0.0;
            $toll = 0.0;
            $parking = 0.0;
            $total = round($rate + $ot + $toll + $parking, 2);
            return [
                'key' => (int)$t['log_id'],
                'reservationId' => (int)$t['reservation_id'],
                'logId' => (int)$t['log_id'],
                'date' => $t['trip_date'],
                'tripCode' => $t['trip_code'] ?? '',
                'vehicleId' => (int)$t['vehicle_id'],
                'carCode' => vehicle_car_code($t),
                'plateNumber' => $t['plate_number'],
                'model' => $t['model'],
                'vehicleType' => $t['vehicle_type'],
                'rentalRate' => $rate,
                'requestedTime' => fmt_time($t['pickup_time'] ?: $t['start_time']),
                'requestedTimeRaw' => $t['pickup_time'] ?: $t['start_time'],
                'timeOut' => fmt_time($t['return_time'] ?: $t['end_time']),
                'timeOutRaw' => $t['return_time'] ?: $t['end_time'],
                'workHours' => round(payroll_hours_between($t['start_time'], $t['end_time']), 2),
                'excessKm' => 0,
                'excessGas' => 0.0,
                'overnightRate' => 0.0,
                'otHours' => 0,
                'otAmount' => $ot,
                'dime' => 0.0,
                'hazard' => 0.0,
                'toll' => $toll,
                'parking' => $parking,
                'advance' => 0.0,
                'totalAmount' => $total,
            ];
        }, $stmt->fetchAll());

        json_out($out);
    }

    // ---- Full detail for review / payslip / editing ----------------------
    if ($action === 'preview') {
        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) json_error('Payroll id is required.', 422);

        $stmt = $pdo->prepare(payroll_base_select($pdo) . ' WHERE p.payroll_id = ?');
        $stmt->execute([$id]);
        $p = $stmt->fetch();
        if (!$p) json_error('Payroll record not found.', 404);

        $detail = payroll_row_shape($p);

        $ts = $pdo->prepare(
            'SELECT * FROM payroll_trips WHERE payroll_id = ? ORDER BY trip_date ASC, payroll_trip_id ASC'
        );
        $ts->execute([$id]);
        $detail['trips'] = array_map('payroll_trip_shape', $ts->fetchAll());

        json_out($detail);
    }

    // ---- List of payroll records (default) -------------------------------
    $sql = payroll_base_select($pdo) . ' WHERE 1=1';
    $params = [];
    $statusFilter = trim((string)($_GET['status'] ?? ''));
    $driverFilter = (int)($_GET['driver_id'] ?? 0);
    if ($statusFilter !== '') {
        $sql .= ' AND p.status = ?';
        $params[] = $statusFilter;
    }
    if ($driverFilter > 0) {
        $sql .= ' AND p.driver_id = ?';
        $params[] = $driverFilter;
    }
    $sql .= ' ORDER BY p.payroll_date DESC, p.payroll_id DESC';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    json_out(array_map('payroll_row_shape', $stmt->fetchAll()));
}

/*
 * ---------------------------------------------------------------------------
 * POST endpoints
 * ---------------------------------------------------------------------------
 */

if ($method === 'POST') {
    if (!$isPayroll) json_error('Forbidden.', 403);

    $data = body_json();
    $action = trim((string)($data['action'] ?? ''));

    $canEdit = has_permission($pdo, (int)$user['user_id'], $user['role'], 'Payroll', 'Edit');
    if (!$canEdit) {
        json_error('Forbidden: your account does not have the Payroll/Edit permission.', 403);
    }

    // ---- Update app-wide display settings (company name on payslips) -----
    if ($action === 'save_settings') {
        $companyName = mb_substr(trim((string)($data['companyName'] ?? '')), 0, 150);
        if ($companyName === '') json_error('Company name is required.', 422);

        $pdo->prepare(
            'INSERT INTO app_settings (setting_key, setting_value) VALUES ("company_name", ?)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)'
        )->execute([$companyName]);

        log_action($pdo, (int)$user['user_id'], 'Payroll', 'Updated company name to "' . $companyName . '"');
        json_out(['ok' => true, 'companyName' => $companyName]);
    }

    // ---- Save a payroll (create) or save changes to a draft (update) ----
    if ($action === 'create' || $action === 'update') {
        $id = (int)($data['id'] ?? 0);
        $driverId = (int)($data['driverId'] ?? 0);
        $cutoffStart = trim((string)($data['cutoffStart'] ?? ''));
        $cutoffEnd = trim((string)($data['cutoffEnd'] ?? ''));
        $payrollDate = trim((string)($data['payrollDate'] ?? date('Y-m-d')));
        $vehicleId = $data['vehicleId'] ? (int)$data['vehicleId'] : null;
        $carCode = trim((string)($data['carCode'] ?? 'Additional')) ?: 'Additional';
        $plateNumber = trim((string)($data['plateNumber'] ?? ''));
        $vehicleType = trim((string)($data['vehicleType'] ?? ''));
        $carOwner = mb_substr(trim((string)($data['carOwner'] ?? '')), 0, 150);
        $remarks = mb_substr(trim((string)($data['remarks'] ?? '')), 0, 500);
        $trips = is_array($data['trips'] ?? null) ? $data['trips'] : [];

        if ($driverId <= 0) json_error('Driver is required.', 422);
        if (!$cutoffStart || !$cutoffEnd) json_error('Cut-off period is required.', 422);
        if (strtotime($cutoffEnd) < strtotime($cutoffStart)) json_error('Cut-off end must be after start.', 422);

        $drv = $pdo->prepare('SELECT driver_id FROM drivers WHERE driver_id = ?');
        $drv->execute([$driverId]);
        if (!$drv->fetch()) json_error('Driver not found.', 422);

        if ($action === 'update') {
            if ($id <= 0) json_error('Payroll id is required.', 422);
            $cur = $pdo->prepare('SELECT status FROM payroll WHERE payroll_id = ?');
            $cur->execute([$id]);
            $curStatus = $cur->fetchColumn();
            if ($curStatus === false) json_error('Payroll record not found.', 404);
            if ($curStatus !== 'draft') {
                json_error('Only draft payrolls can be edited.', 422);
            }
        } else {
            // One active payroll per driver + cut-off period.
            $dup = $pdo->prepare(
                'SELECT payroll_id FROM payroll
                 WHERE driver_id = ? AND cutoff_start = ? AND cutoff_end = ? AND status <> "cancelled"'
            );
            $dup->execute([$driverId, $cutoffStart, $cutoffEnd]);
            if ($dup->fetch()) json_error('A payroll already exists for this driver and cut-off period.', 422);
        }

        $earnings = payroll_numbers($data['earnings'] ?? [], payroll_earnings_blank());
        $deductions = payroll_numbers($data['deductions'] ?? [], payroll_deductions_blank());
        $calc = payroll_recompute($earnings, $deductions);

        $earningsJson = json_encode($calc['earnings'], JSON_UNESCAPED_UNICODE);
        $deductionsJson = json_encode($calc['deductions'], JSON_UNESCAPED_UNICODE);

        // Freeze the car-rental calculation for this period. It is recomputed
        // here rather than trusted from the client, so a later rate or
        // assignment change can never rewrite what a payroll already paid.
        $carSnapshot = car_rental_breakdown($pdo, $driverId, $cutoffStart, $cutoffEnd);
        $carSnapshot['cutoffStart'] = $cutoffStart;
        $carSnapshot['cutoffEnd'] = $cutoffEnd;
        $carSnapshot['capturedAt'] = date('Y-m-d H:i:s');
        $carSnapshotJson = json_encode($carSnapshot, JSON_UNESCAPED_UNICODE);

        if ($action === 'update') {
            $stmt = $pdo->prepare(
                'UPDATE payroll
                 SET driver_id = ?, vehicle_id = ?, car_code = ?, plate_number = ?, vehicle_type = ?, car_owner = ?,
                     cutoff_start = ?, cutoff_end = ?, payroll_date = ?,
                     earnings_json = ?, deductions_json = ?, car_rate_snapshot = ?,
                     total_earnings = ?, total_deductions = ?, total_receivable = ?,
                     payroll_remarks = ?
                 WHERE payroll_id = ?'
            );
            $stmt->execute([
                $driverId, $vehicleId, $carCode, $plateNumber, $vehicleType, $carOwner,
                $cutoffStart, $cutoffEnd, $payrollDate,
                $earningsJson, $deductionsJson, $carSnapshotJson,
                $calc['totalEarnings'], $calc['totalDeductions'], $calc['totalReceivable'],
                $remarks, $id,
            ]);
            $pdo->prepare('DELETE FROM payroll_trips WHERE payroll_id = ?')->execute([$id]);
            log_action($pdo, (int)$user['user_id'], 'Payroll', 'Updated payroll ' . $id . ' for driver ' . $driverId . ' (cut-off ' . $cutoffStart . ' to ' . $cutoffEnd . ')');
        } else {
            $stmt = $pdo->prepare(
                'INSERT INTO payroll (driver_id, vehicle_id, car_code, plate_number, vehicle_type, car_owner,
                                      cutoff_start, cutoff_end, payroll_date, status,
                                      earnings_json, deductions_json, car_rate_snapshot,
                                      total_earnings, total_deductions, total_receivable,
                                      payroll_remarks, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, "draft", ?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([
                $driverId, $vehicleId, $carCode, $plateNumber, $vehicleType, $carOwner,
                $cutoffStart, $cutoffEnd, $payrollDate,
                $earningsJson, $deductionsJson, $carSnapshotJson,
                $calc['totalEarnings'], $calc['totalDeductions'], $calc['totalReceivable'],
                $remarks, (int)$user['user_id'],
            ]);
            $id = (int)$pdo->lastInsertId();
            log_action($pdo, (int)$user['user_id'], 'Payroll', 'Created payroll ' . $id . ' for driver ' . $driverId . ' (cut-off ' . $cutoffStart . ' to ' . $cutoffEnd . ')');

            // Create notification for driver that payroll is available
            $driverUserId = get_user_id_by_driver($pdo, $driverId);
            if ($driverUserId) {
                create_notification(
                    $pdo,
                    $driverUserId,
                    'payroll_released',
                    'Payroll Available',
                    'Your payroll for ' . $payrollDate . ' is now available. Status: Draft. Amount: PHP ' . number_format($calc['totalReceivable'], 2)
                );
            }
        }

        // Snapshot the included trips.
        $ins = $pdo->prepare(
            'INSERT INTO payroll_trips (payroll_id, reservation_id, log_id, trip_date, car_code,
                                        plate_number, vehicle_model, rental_rate,
                                        requested_time, time_out, work_hours, excess_km, excess_gas,
                                        overnight_rate, ot_hours, ot_amount, dime, hazard,
                                        toll, parking, advance, total_amount)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        foreach ($trips as $t) {
            $reservationId = (int)($t['reservationId'] ?? 0);
            if ($reservationId <= 0) continue;
            $logId = (int)($t['logId'] ?? 0);
            $rate = max(0, (float)($t['rentalRate'] ?? 0));
            $ot = max(0, (float)($t['otAmount'] ?? 0));
            $toll = max(0, (float)($t['toll'] ?? 0));
            $parking = max(0, (float)($t['parking'] ?? 0));
            $excessGas = max(0, (float)($t['excessGas'] ?? 0));
            $overnight = max(0, (float)($t['overnightRate'] ?? 0));
            $advance = max(0, (float)($t['advance'] ?? 0));
            $total = round($rate + $ot + $toll + $parking + $excessGas + $overnight - $advance, 2);

            $ins->execute([
                $id, $reservationId, $logId ?: null,
                $t['date'] ?? $cutoffStart,
                trim((string)($t['carCode'] ?? '')),
                trim((string)($t['plateNumber'] ?? '')),
                trim((string)($t['model'] ?? '')),
                $rate,
                str_pad(trim((string)($t['requestedTimeRaw'] ?? $t['requestedTime'] ?? '')), 8, '0', STR_PAD_LEFT) ?: null,
                str_pad(trim((string)($t['timeOutRaw'] ?? $t['timeOut'] ?? '')), 8, '0', STR_PAD_LEFT) ?: null,
                max(0, (float)($t['workHours'] ?? 0)),
                max(0, (float)($t['excessKm'] ?? 0)),
                $excessGas,
                $overnight,
                max(0, (float)($t['otHours'] ?? 0)),
                $ot,
                max(0, (float)($t['dime'] ?? 0)),
                max(0, (float)($t['hazard'] ?? 0)),
                $toll,
                $parking,
                $advance,
                $total,
            ]);
        }

        json_out(['id' => $id, 'status' => 'draft', 'totalReceivable' => $calc['totalReceivable']], $action === 'create' ? 201 : 200);
    }

    // ---- Submit draft for approval --------------------------------------
    if ($action === 'submit') {
        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) json_error('Payroll id is required.', 422);

        $stmt = $pdo->prepare('SELECT status FROM payroll WHERE payroll_id = ?');
        $stmt->execute([$id]);
        $status = $stmt->fetchColumn();
        if ($status === false) json_error('Payroll record not found.', 404);
        if ($status !== 'draft') json_error('Only draft payrolls can be submitted.', 422);

        $pdo->prepare('UPDATE payroll SET status = "for_review", submitted_by = ? WHERE payroll_id = ?')
            ->execute([(int)$user['user_id'], $id]);

        log_action($pdo, (int)$user['user_id'], 'Payroll', 'Submitted payroll ' . $id . ' for approval');
        json_out(['ok' => true, 'id' => $id, 'status' => 'for_review']);
    }

    // ---- Approve (only after it has been submitted for review) ----------
    if ($action === 'approve') {
        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) json_error('Payroll id is required.', 422);

        $stmt = $pdo->prepare('SELECT status FROM payroll WHERE payroll_id = ?');
        $stmt->execute([$id]);
        $status = $stmt->fetchColumn();
        if ($status === false) json_error('Payroll record not found.', 404);
        if ($status !== 'for_review') json_error('Only payrolls in For Review can be approved.', 422);

        $pdo->prepare('UPDATE payroll SET status = "approved", approved_by = ?, approved_at = NOW() WHERE payroll_id = ?')
            ->execute([(int)$user['user_id'], $id]);

        log_action($pdo, (int)$user['user_id'], 'Payroll', 'Approved payroll ' . $id);
        json_out(['ok' => true, 'id' => $id, 'status' => 'approved']);
    }

    // ---- Return for correction (back to draft, keeps all data) ----------
    if ($action === 'return') {
        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) json_error('Payroll id is required.', 422);

        $stmt = $pdo->prepare('SELECT status FROM payroll WHERE payroll_id = ?');
        $stmt->execute([$id]);
        $status = $stmt->fetchColumn();
        if ($status === false) json_error('Payroll record not found.', 404);
        if ($status !== 'for_review') json_error('Only payrolls in For Review can be returned for correction.', 422);

        $reason = mb_substr(trim((string)($data['remarks'] ?? '')), 0, 500);
        $pdo->prepare('UPDATE payroll SET status = "draft", payroll_remarks = ? WHERE payroll_id = ?')
            ->execute([$reason, $id]);

        log_action($pdo, (int)$user['user_id'], 'Payroll', 'Returned payroll ' . $id . ' for correction' . ($reason ? ': ' . $reason : ''));
        json_out(['ok' => true, 'id' => $id, 'status' => 'draft']);
    }

    // ---- Cancel (discard without paying) --------------------------------
    if ($action === 'cancel') {
        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) json_error('Payroll id is required.', 422);

        $stmt = $pdo->prepare('SELECT status FROM payroll WHERE payroll_id = ?');
        $stmt->execute([$id]);
        $status = $stmt->fetchColumn();
        if ($status === false) json_error('Payroll record not found.', 404);
        if (!in_array($status, ['draft', 'for_review'], true)) {
            json_error('Only draft or for-review payrolls can be cancelled.', 422);
        }

        $pdo->prepare('UPDATE payroll SET status = "cancelled" WHERE payroll_id = ?')->execute([$id]);
        log_action($pdo, (int)$user['user_id'], 'Payroll', 'Cancelled payroll ' . $id);
        json_out(['ok' => true, 'id' => $id, 'status' => 'cancelled']);
    }

    // ---- Record payment (approved payroll only) -------------------------
    if ($action === 'pay') {
        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) json_error('Payroll id is required.', 422);

        $stmt = $pdo->prepare('SELECT status, total_receivable, driver_id, payroll_date FROM payroll WHERE payroll_id = ?');
        $stmt->execute([$id]);
        $p = $stmt->fetch();
        if (!$p) json_error('Payroll record not found.', 404);
        if ($p['status'] !== 'approved') {
            json_error('Only approved payrolls can be marked as paid.', 422);
        }

        $method = trim((string)($data['paymentMethod'] ?? ''));
        $reference = trim((string)($data['referenceNumber'] ?? ''));
        $datePaid = trim((string)($data['datePaid'] ?? date('Y-m-d')));
        $amountPaid = $data['amountPaid'] !== null && $data['amountPaid'] !== ''
            ? max(0, (float)$data['amountPaid'])
            : (float)$p['total_receivable'];

        if ($method === '') json_error('Payment method is required.', 422);

        $pdo->prepare(
            'UPDATE payroll SET status = "paid", payment_method = ?, amount_paid = ?, date_paid = ?, reference_number = ? WHERE payroll_id = ?'
        )->execute([$method, $amountPaid, $datePaid, $reference, $id]);

        log_action($pdo, (int)$user['user_id'], 'Payroll', 'Marked payroll ' . $id . ' as paid (' . $method . ', ' . $amountPaid . ')');

        // Create notification for driver when payroll is released/paid
        $driverUserId = get_user_id_by_driver($pdo, (int)$p['driver_id']);
        if ($driverUserId) {
            create_notification(
                $pdo,
                $driverUserId,
                'payroll_released',
                'Payroll Released',
                'Your payroll for ' . $p['payroll_date'] . ' has been released. Amount: PHP ' . number_format($amountPaid, 2)
            );
        }

        json_out(['ok' => true, 'id' => $id, 'status' => 'paid']);
    }

    // ---- Delete (draft or cancelled only) -------------------------------
    if ($action === 'delete') {
        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) json_error('Payroll id is required.', 422);

        $stmt = $pdo->prepare('SELECT status FROM payroll WHERE payroll_id = ?');
        $stmt->execute([$id]);
        $status = $stmt->fetchColumn();
        if ($status === false) json_error('Payroll record not found.', 404);
        if (!in_array($status, ['draft', 'cancelled'], true)) {
            json_error('Only draft or cancelled payrolls can be deleted.', 422);
        }

        $pdo->prepare('DELETE FROM payroll WHERE payroll_id = ?')->execute([$id]);
        log_action($pdo, (int)$user['user_id'], 'Payroll', 'Deleted payroll ' . $id);
        json_out(['ok' => true]);
    }

    // ---- Add a car rate (creates the vehicle payroll bills against) -----
    if ($action === 'car_rate_add') {
        $fields = payroll_car_rate_payload($data);

        $dup = $pdo->prepare('SELECT vehicle_id FROM vehicles WHERE plate_number = ?');
        $dup->execute([$fields['plate']]);
        if ($dup->fetch()) json_error('A car with this plate number already exists.', 422);

        if ($fields['ownerId'] !== null) {
            $own = $pdo->prepare('SELECT owner_id FROM vehicle_owners WHERE owner_id = ? AND status = "active"');
            $own->execute([$fields['ownerId']]);
            if (!$own->fetch()) json_error('Car owner not found.', 422);
        }

        $stmt = $pdo->prepare(
            'INSERT INTO vehicles (plate_number, model, year, vehicle_type, daily_rate, seats, owner_id, status, purchase_date)
             VALUES (?, ?, ?, ?, ?, ?, ?, "available", CURDATE())'
        );
        $stmt->execute([
            $fields['plate'], $fields['model'], (int)date('Y'), $fields['type'],
            $fields['dailyRate'], 5, $fields['ownerId'],
        ]);

        $id = (int)$pdo->lastInsertId();
        log_action($pdo, (int)$user['user_id'], 'Payroll', 'Added car rate ' . $fields['plate']);
        json_out(payroll_car_rate_row($pdo, $id), 201);
    }

    // ---- Edit a car rate (rate, plate, model, owner) ---------------------
    if ($action === 'car_rate_update') {
        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) json_error('Car rate id is required.', 422);

        $exists = $pdo->prepare('SELECT vehicle_id FROM vehicles WHERE vehicle_id = ?');
        $exists->execute([$id]);
        if (!$exists->fetch()) json_error('Car rate not found.', 404);

        $fields = payroll_car_rate_payload($data);

        $dup = $pdo->prepare('SELECT vehicle_id FROM vehicles WHERE plate_number = ? AND vehicle_id <> ?');
        $dup->execute([$fields['plate'], $id]);
        if ($dup->fetch()) json_error('A car with this plate number already exists.', 422);

        if ($fields['ownerId'] !== null) {
            $own = $pdo->prepare('SELECT owner_id FROM vehicle_owners WHERE owner_id = ? AND status = "active"');
            $own->execute([$fields['ownerId']]);
            if (!$own->fetch()) json_error('Car owner not found.', 422);
        }

        // vehicle_type stays put: it forms part of the car code (HD-AUV-003)
        // that every past payroll row is filed under.
        $pdo->prepare(
            'UPDATE vehicles SET plate_number = ?, model = ?, daily_rate = ?, owner_id = ? WHERE vehicle_id = ?'
        )->execute([$fields['plate'], $fields['model'], $fields['dailyRate'], $fields['ownerId'], $id]);

        log_action($pdo, (int)$user['user_id'], 'Payroll', 'Updated car rate ' . $fields['plate']);
        json_out(payroll_car_rate_row($pdo, $id));
    }

    // ---- Delete a car rate ----------------------------------------------
    if ($action === 'car_rate_delete') {
        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) json_error('Car rate id is required.', 422);

        $stmt = $pdo->prepare('SELECT vehicle_id, plate_number FROM vehicles WHERE vehicle_id = ?');
        $stmt->execute([$id]);
        $car = $stmt->fetch();
        if (!$car) json_error('Car rate not found.', 404);

        // Reservations and trips reference the car; dropping it would orphan or
        // wipe that history, so refuse and let the desk clear it first.
        $ref = $pdo->prepare(
            'SELECT (SELECT COUNT(*) FROM reservations WHERE vehicle_id = ?)
                  + (SELECT COUNT(*) FROM trip_logs WHERE vehicle_id = ?)'
        );
        $ref->execute([$id, $id]);
        if ((int)$ref->fetchColumn() > 0) {
            json_error('This car has existing reservations or trip records and cannot be deleted.', 422);
        }

        $pdo->prepare('DELETE FROM vehicles WHERE vehicle_id = ?')->execute([$id]);
        log_action($pdo, (int)$user['user_id'], 'Payroll', 'Deleted car rate ' . $car['plate_number']);
        json_out(['ok' => true, 'id' => $id]);
    }

    json_error('Action must be one of: create, update, submit, approve, return, cancel, pay, delete, car_rate_add, car_rate_update, car_rate_delete.', 422);
}

json_error('Method not allowed.', 405);