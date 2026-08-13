<?php
require_once __DIR__ . '/helpers.php';

$user = require_login();
$pdo = db();

if ($user['role'] !== 'driver') json_error('Forbidden.', 403);

$stmt = $pdo->prepare('SELECT driver_id FROM drivers WHERE user_id = ?');
$stmt->execute([$user['user_id']]);
$driverId = (int)$stmt->fetchColumn();
if ($driverId <= 0) json_error('No driver record linked to this account.', 404);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Method not allowed.', 405);
}

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
