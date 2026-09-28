<?php
require_once __DIR__ . '/helpers.php';

$user = require_login();
$pdo = db();

$isAdmin = in_array($user['role'], ['superadmin', 'admin'], true);

// The Current Car Rates screen is part of the payroll desk, so Payroll/View and
// Payroll/Edit grant access here exactly as they do in payroll.php. The
// existing Pricing scope is honoured too, since that is where the app already
// keeps money-related configuration.
$canView = $isAdmin
    || has_permission($pdo, (int)$user['user_id'], $user['role'], 'Payroll', 'View')
    || has_permission($pdo, (int)$user['user_id'], $user['role'], 'Pricing', 'View');

$canEdit = $isAdmin
    || has_permission($pdo, (int)$user['user_id'], $user['role'], 'Payroll', 'Edit')
    || has_permission($pdo, (int)$user['user_id'], $user['role'], 'Pricing', 'Edit');

$method = $_SERVER['REQUEST_METHOD'];
$action = trim((string)($_GET['action'] ?? ''));

/*
 * ---------------------------------------------------------------------------
 * GET
 * ---------------------------------------------------------------------------
 */

if ($method === 'GET') {
    if (!$canView) {
        json_error('Forbidden: your account cannot view current car rates.', 403);
    }

    // ---- Flat list for the Current Car Rates table -------------------------
    if ($action === '' || $action === 'list') {
        $rows = $pdo->query(
            'SELECT v.vehicle_id, v.plate_number, v.model, v.vehicle_type, v.daily_rate,
                    v.owner_id, v.status,
                    vo.owner_name,
                    hr.daily_rate AS history_rate, hr.rate_id, hr.effective_from AS rate_from,
                    (SELECT h3.daily_rate FROM vehicle_rate_history h3
                      WHERE h3.vehicle_id = v.vehicle_id AND h3.effective_from > CURDATE()
                      ORDER BY h3.effective_from ASC LIMIT 1) AS staged_rate,
                    (SELECT h4.effective_from FROM vehicle_rate_history h4
                      WHERE h4.vehicle_id = v.vehicle_id AND h4.effective_from > CURDATE()
                      ORDER BY h4.effective_from ASC LIMIT 1) AS staged_from,
                    a.driver_id AS assigned_driver_id, d.fullname AS assigned_driver_name,
                    a.effective_from AS assign_from,
                    (SELECT COUNT(*) FROM vehicle_rate_history h
                      WHERE h.vehicle_id = v.vehicle_id) AS rate_count
               FROM vehicles v
               LEFT JOIN vehicle_owners vo ON vo.owner_id = v.owner_id
               LEFT JOIN vehicle_rate_history hr ON hr.rate_id = (
                     SELECT h2.rate_id FROM vehicle_rate_history h2
                      WHERE h2.vehicle_id = v.vehicle_id
                        AND h2.effective_from <= CURDATE()
                        AND (h2.effective_to IS NULL OR h2.effective_to >= CURDATE())
                      ORDER BY h2.effective_from DESC LIMIT 1)
               LEFT JOIN vehicle_driver_assignments a ON a.assignment_id = (
                     SELECT a2.assignment_id FROM vehicle_driver_assignments a2
                      WHERE a2.vehicle_id = v.vehicle_id
                        AND a2.effective_from <= CURDATE()
                        AND (a2.effective_to IS NULL OR a2.effective_to >= CURDATE())
                      ORDER BY a2.effective_from DESC LIMIT 1)
               LEFT JOIN drivers d ON d.driver_id = a.driver_id
              ORDER BY v.vehicle_id'
        )->fetchAll();

        $q = trim((string)($_GET['q'] ?? ''));
        $needle = mb_strtolower($q);

        $out = [];
        foreach ($rows as $r) {
            $carCode = vehicle_car_code($r);
            $rate = $r['history_rate'] !== null ? (float)$r['history_rate'] : (float)$r['daily_rate'];

            if ($needle !== '') {
                $haystack = mb_strtolower(implode(' ', [
                    $carCode, $r['plate_number'], $r['model'], $r['vehicle_type'],
                    $r['assigned_driver_name'] ?? '', $r['owner_name'] ?? '',
                ]));
                if (!str_contains($haystack, $needle)) continue;
            }

            $out[] = [
                'vehicleId' => (int)$r['vehicle_id'],
                'carCode' => $carCode,
                'vehicleType' => $r['vehicle_type'],
                'model' => $r['model'],
                'plateNumber' => $r['plate_number'],
                'carOwner' => $r['owner_name'] ?? '',
                'companyOwned' => $r['owner_id'] === null,
                'dailyRate' => round($rate, 2),
                'rateFrom' => $r['rate_from'],
                'stagedRate' => $r['staged_rate'] !== null ? round((float)$r['staged_rate'], 2) : null,
                'stagedFrom' => $r['staged_from'],
                'hasHistory' => (int)$r['rate_count'] > 1,
                'rateCount' => (int)$r['rate_count'],
                'assignedDriverId' => $r['assigned_driver_id'] !== null ? (int)$r['assigned_driver_id'] : null,
                'assignedDriver' => $r['assigned_driver_name'],
                'assignedFrom' => $r['assign_from'],
                'status' => $r['status'],
                'statusLabel' => vehicle_gui_status($r['status']),
                'inactive' => $r['status'] === 'inactive',
            ];
        }

        json_out($out);
    }

    // ---- Rate history for one vehicle --------------------------------------
    if ($action === 'history') {
        $vehicleId = (int)($_GET['vehicle_id'] ?? 0);
        if ($vehicleId <= 0) json_error('Vehicle is required.', 422);

        $stmt = $pdo->prepare(
            'SELECT h.rate_id, h.daily_rate, h.effective_from, h.effective_to, h.created_at,
                    u.fullname AS updated_by
               FROM vehicle_rate_history h
               LEFT JOIN users u ON u.user_id = h.created_by
              WHERE h.vehicle_id = ?
              ORDER BY h.effective_from DESC, h.rate_id DESC'
        );
        $stmt->execute([$vehicleId]);

        json_out(array_map(fn($h) => [
            'rateId' => (int)$h['rate_id'],
            'dailyRate' => (float)$h['daily_rate'],
            'effectiveFrom' => $h['effective_from'],
            'effectiveTo' => $h['effective_to'],
            // "Current" means the rate in effect today. A future-dated row is
            // scheduled, not current, even though nothing has closed it yet.
            'isCurrent' => $h['effective_from'] <= date('Y-m-d')
                && ($h['effective_to'] === null || $h['effective_to'] >= date('Y-m-d')),
            'isScheduled' => $h['effective_from'] > date('Y-m-d'),
            'updatedBy' => $h['updated_by'] ?? 'System',
            'createdAt' => $h['created_at'],
        ], $stmt->fetchAll()));
    }

    // ---- Driver assignment history for one vehicle -------------------------
    if ($action === 'assignments') {
        $vehicleId = (int)($_GET['vehicle_id'] ?? 0);
        if ($vehicleId <= 0) json_error('Vehicle is required.', 422);

        $stmt = $pdo->prepare(
            'SELECT a.assignment_id, a.driver_id, d.fullname, a.effective_from, a.effective_to,
                    u.fullname AS updated_by
               FROM vehicle_driver_assignments a
               JOIN drivers d ON d.driver_id = a.driver_id
               LEFT JOIN users u ON u.user_id = a.created_by
              WHERE a.vehicle_id = ?
              ORDER BY a.effective_from DESC, a.assignment_id DESC'
        );
        $stmt->execute([$vehicleId]);

        json_out(array_map(fn($a) => [
            'assignmentId' => (int)$a['assignment_id'],
            'driverId' => (int)$a['driver_id'],
            'driverName' => $a['fullname'],
            'effectiveFrom' => $a['effective_from'],
            'effectiveTo' => $a['effective_to'],
            'isCurrent' => $a['effective_from'] <= date('Y-m-d')
                && ($a['effective_to'] === null || $a['effective_to'] >= date('Y-m-d')),
            'isScheduled' => $a['effective_from'] > date('Y-m-d'),
            'updatedBy' => $a['updated_by'] ?? 'System',
        ], $stmt->fetchAll()));
    }

    // ---- Active drivers for the assignment dropdown ------------------------
    if ($action === 'drivers') {
        $rows = $pdo->query(
            'SELECT driver_id, fullname, contact_number, status
               FROM drivers
              WHERE status <> "inactive"
              ORDER BY fullname'
        )->fetchAll();

        json_out(array_map(fn($d) => [
            'id' => (int)$d['driver_id'],
            'name' => $d['fullname'],
            'contact' => $d['contact_number'],
            'status' => $d['status'],
        ], $rows));
    }

    // ---- Car Rental quote for a payroll period -----------------------------
    // The wizard calls this so Earnings shows daily rate x use days.
    if ($action === 'quote') {
        $driverId = (int)($_GET['driver_id'] ?? 0);
        $start = trim((string)($_GET['cutoff_start'] ?? ''));
        $end = trim((string)($_GET['cutoff_end'] ?? ''));
        if ($driverId <= 0 || !$start || !$end) {
            json_error('Driver and cut-off period are required.', 422);
        }

        json_out(car_rental_breakdown($pdo, $driverId, $start, $end));
    }

    json_error('Unknown action.', 404);
}

/*
 * ---------------------------------------------------------------------------
 * POST
 * ---------------------------------------------------------------------------
 */

if ($method === 'POST') {
    if (!$canEdit) {
        json_error('Forbidden: your account cannot change current car rates.', 403);
    }

    $data = body_json();
    $action = trim((string)($data['action'] ?? ''));
    $userId = (int)$user['user_id'];

    // ---- Set the current daily rate for a vehicle -------------------------
    if ($action === 'save_rate') {
        $vehicleId = (int)($data['vehicleId'] ?? 0);
        $rate = $data['dailyRate'] ?? null;
        $effectiveFrom = trim((string)($data['effectiveFrom'] ?? ''));

        if ($vehicleId <= 0) json_error('Vehicle is required.', 422);
        if (!is_numeric($rate)) json_error('Daily rate must be a number.', 422);
        $rate = round((float)$rate, 2);
        if ($rate <= 0) json_error('Daily rate must be greater than zero.', 422);
        if ($rate > 1000000) json_error('Daily rate is unrealistically high.', 422);
        if (!strtotime($effectiveFrom)) json_error('A valid effective date is required.', 422);
        $effectiveFrom = date('Y-m-d', strtotime($effectiveFrom));

        $v = $pdo->prepare('SELECT vehicle_id, daily_rate FROM vehicles WHERE vehicle_id = ?');
        $v->execute([$vehicleId]);
        if (!$v->fetch()) json_error('Vehicle not found.', 404);

        $dayBefore = date('Y-m-d', strtotime($effectiveFrom . ' -1 day'));

        $pdo->beginTransaction();
        try {
            // Close the row that is currently open, and any row the new one
            // overlaps, so the timeline never has two overlapping ranges.
            $pdo->prepare(
                'UPDATE vehicle_rate_history SET effective_to = ?
                  WHERE vehicle_id = ? AND effective_to IS NULL'
            )->execute([$dayBefore, $vehicleId]);

            $pdo->prepare(
                'UPDATE vehicle_rate_history SET effective_to = ?
                  WHERE vehicle_id = ? AND effective_to IS NOT NULL
                    AND effective_to >= ? AND effective_from < ?'
            )->execute([$dayBefore, $vehicleId, $effectiveFrom, $effectiveFrom]);

            $pdo->prepare(
                'INSERT INTO vehicle_rate_history (vehicle_id, daily_rate, effective_from, effective_to, created_by)
                 VALUES (?, ?, ?, NULL, ?)'
            )->execute([$vehicleId, $rate, $effectiveFrom, $userId]);

            // Keep vehicles.daily_rate in step for readers that still use it
            // (the trip breakdown shows the per-vehicle rate).
            if ($effectiveFrom <= date('Y-m-d')) {
                $pdo->prepare('UPDATE vehicles SET daily_rate = ? WHERE vehicle_id = ?')
                    ->execute([$rate, $vehicleId]);
            }

            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            json_error('Could not save the rate. Please try again.', 500);
        }

        log_action($pdo, $userId, 'CarRate',
            'Set daily rate for vehicle ' . $vehicleId . ' to ' . number_format($rate, 2) . ' effective ' . $effectiveFrom);

        json_out(['ok' => true, 'dailyRate' => $rate, 'effectiveFrom' => $effectiveFrom]);
    }

    // ---- Change the driver currently assigned to a vehicle -----------------
    if ($action === 'save_assignment') {
        $vehicleId = (int)($data['vehicleId'] ?? 0);
        $driverId = (int)($data['driverId'] ?? 0);
        $effectiveFrom = trim((string)($data['effectiveFrom'] ?? ''));

        if ($vehicleId <= 0) json_error('Vehicle is required.', 422);
        if ($driverId <= 0) json_error('Assigned driver is required.', 422);
        if (!strtotime($effectiveFrom)) json_error('A valid effective date is required.', 422);
        $effectiveFrom = date('Y-m-d', strtotime($effectiveFrom));

        $v = $pdo->prepare('SELECT vehicle_id FROM vehicles WHERE vehicle_id = ?');
        $v->execute([$vehicleId]);
        if (!$v->fetch()) json_error('Vehicle not found.', 404);

        $d = $pdo->prepare('SELECT driver_id, fullname, status FROM drivers WHERE driver_id = ?');
        $d->execute([$driverId]);
        $drv = $d->fetch();
        if (!$drv) json_error('Driver not found.', 404);
        if ($drv['status'] === 'inactive') json_error('That driver is inactive and cannot be assigned.', 422);

        $dayBefore = date('Y-m-d', strtotime($effectiveFrom . ' -1 day'));

        $pdo->beginTransaction();
        try {
            $pdo->prepare(
                'UPDATE vehicle_driver_assignments SET effective_to = ?
                  WHERE vehicle_id = ? AND effective_to IS NULL'
            )->execute([$dayBefore, $vehicleId]);

            $pdo->prepare(
                'UPDATE vehicle_driver_assignments SET effective_to = ?
                  WHERE vehicle_id = ? AND effective_to IS NOT NULL
                    AND effective_to >= ? AND effective_from < ?'
            )->execute([$dayBefore, $vehicleId, $effectiveFrom, $effectiveFrom]);

            $pdo->prepare(
                'INSERT INTO vehicle_driver_assignments (vehicle_id, driver_id, effective_from, effective_to, created_by)
                 VALUES (?, ?, ?, NULL, ?)'
            )->execute([$vehicleId, $driverId, $effectiveFrom, $userId]);

            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            json_error('Could not save the assignment. Please try again.', 500);
        }

        log_action($pdo, $userId, 'CarRate',
            'Assigned ' . $drv['fullname'] . ' (driver ' . $driverId . ') to vehicle ' . $vehicleId . ' effective ' . $effectiveFrom);

        json_out(['ok' => true, 'driverId' => $driverId, 'driverName' => $drv['fullname'], 'effectiveFrom' => $effectiveFrom]);
    }

    json_error('Unknown action.', 404);
}

json_error('Method not allowed.', 405);
