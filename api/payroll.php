<?php
require_once __DIR__ . '/helpers.php';

$user = require_login();
$pdo = db();

$isSupervisor = in_array($user['role'], ['superadmin', 'admin', 'payroll_officer'], true);

if ($user['role'] === 'driver') {
    $stmt = $pdo->prepare('SELECT driver_id FROM drivers WHERE user_id = ?');
    $stmt->execute([$user['user_id']]);
    $driverId = (int)$stmt->fetchColumn();
    if ($driverId <= 0) json_error('No driver record linked to this account.', 404);
} elseif ($isSupervisor) {
    $driverId = null;
} else {
    json_error('Forbidden.', 403);
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    if ($user['role'] === 'driver') {
        $rows = $pdo->prepare(
            'SELECT p.payroll_id, p.payroll_date, p.basic_salary, p.allowances, p.deductions, p.net_salary, p.status,
                    l.monthly_deduction AS loan_deduction
             FROM payroll p
             LEFT JOIN loans l ON l.loan_id = p.loan_id
             WHERE p.driver_id = ?
             ORDER BY p.payroll_date DESC'
        );
        $rows->execute([$driverId]);

        $out = array_map(function ($p) {
            return [
                'id' => (int)$p['payroll_id'],
                'date' => $p['payroll_date'],
                'grossAmount' => (float)$p['basic_salary'] + (float)$p['allowances'],
                'cashAdvance' => (float)($p['loan_deduction'] ?? 0),
                'deductions' => (float)$p['deductions'],
                'netAmount' => (float)$p['net_salary'],
                'status' => ucfirst($p['status']),
            ];
        }, $rows->fetchAll());

        json_out($out);
    }

    // Supervisor view: all payroll records with driver details.
    $filter = (int)($_GET['driver_id'] ?? 0);
    $sql = 'SELECT p.payroll_id, p.driver_id, p.payroll_date, p.basic_salary, p.allowances, p.deductions,
                   p.net_salary, p.status, l.monthly_deduction AS loan_deduction,
                   d.fullname AS driver_name, d.contact_number
            FROM payroll p
            JOIN drivers d ON d.driver_id = p.driver_id
            LEFT JOIN loans l ON l.loan_id = p.loan_id';
    $params = [];
    if ($filter > 0) {
        $sql .= ' WHERE p.driver_id = ?';
        $params[] = $filter;
    }
    $sql .= ' ORDER BY p.payroll_date DESC, p.payroll_id DESC';

    $rows = $pdo->prepare($sql);
    $rows->execute($params);

    $out = array_map(function ($p) {
        return [
            'id' => (int)$p['payroll_id'],
            'driverId' => (int)$p['driver_id'],
            'driverName' => $p['driver_name'],
            'contact' => $p['contact_number'],
            'date' => $p['payroll_date'],
            'basicSalary' => (float)$p['basic_salary'],
            'allowances' => (float)$p['allowances'],
            'cashAdvance' => (float)($p['loan_deduction'] ?? 0),
            'deductions' => (float)$p['deductions'],
            'grossAmount' => (float)$p['basic_salary'] + (float)$p['allowances'],
            'netAmount' => (float)$p['net_salary'],
            'status' => ucfirst($p['status']),
        ];
    }, $rows->fetchAll());

    json_out($out);
}

if ($method === 'POST') {
    if (!$isSupervisor) json_error('Forbidden.', 403);

    $data = body_json();
    $action = trim((string)($data['action'] ?? ''));

    if ($action === 'create') {
        $driverId = (int)($data['driverId'] ?? 0);
        $payrollDate = trim((string)($data['payrollDate'] ?? date('Y-m-d')));
        $basicSalary = max(0, (float)($data['basicSalary'] ?? 0));
        $allowances = max(0, (float)($data['allowances'] ?? 0));
        $deductions = max(0, (float)($data['deductions'] ?? 0));
        $netSalary = max(0, (float)($data['netSalary'] ?? 0));

        if ($driverId <= 0) json_error('Driver is required.', 422);
        if ($basicSalary <= 0 && $netSalary <= 0) json_error('Basic salary or net salary is required.', 422);

        $drv = $pdo->prepare('SELECT driver_id FROM drivers WHERE driver_id = ?');
        $drv->execute([$driverId]);
        if (!$drv->fetch()) json_error('Driver not found.', 422);

        $stmt = $pdo->prepare(
            'INSERT INTO payroll (driver_id, payroll_date, basic_salary, allowances, deductions, net_salary, status)
             VALUES (?, ?, ?, ?, ?, ?, "pending")'
        );
        $stmt->execute([$driverId, $payrollDate, $basicSalary, $allowances, $deductions, $netSalary]);

        json_out(['id' => (int)$pdo->lastInsertId(), 'status' => 'Pending'], 201);
    }

    if ($action === 'update_status') {
        $id = (int)($data['id'] ?? 0);
        $status = trim((string)($data['status'] ?? ''));
        if ($id <= 0) json_error('Payroll id is required.', 422);
        if (!in_array($status, ['pending', 'paid', 'unpaid'], true)) {
            json_error('Status must be pending, paid, or unpaid.', 422);
        }

        $stmt = $pdo->prepare('UPDATE payroll SET status = ? WHERE payroll_id = ?');
        $stmt->execute([$status, $id]);
        if ($stmt->rowCount() === 0) json_error('Payroll record not found.', 404);

        log_action($pdo, (int)$user['user_id'], 'Payroll', 'Set payroll ' . $id . ' to ' . $status);
        json_out(['ok' => true, 'id' => $id, 'status' => ucfirst($status)]);
    }

    if ($action === 'delete') {
        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) json_error('Payroll id is required.', 422);

        $stmt = $pdo->prepare('DELETE FROM payroll WHERE payroll_id = ?');
        $stmt->execute([$id]);
        if ($stmt->rowCount() === 0) json_error('Payroll record not found.', 404);

        json_out(['ok' => true]);
    }

    json_error('Action must be one of: create, update_status, delete.', 422);
}

json_error('Method not allowed.', 405);