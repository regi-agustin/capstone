<?php
require_once __DIR__ . '/helpers.php';

$user = require_login();
$pdo = db();

// Pricing is managed by the Super Admin or anyone with the Pricing/Edit permission
if ($user['role'] !== 'superadmin' && !has_permission($pdo, (int)$user['user_id'], $user['role'], 'Pricing', 'Edit')) {
    json_error('Forbidden.', 403);
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Pricing rules + the vehicle types seen in the fleet (so new types appear here too)
    $pricing = $pdo->query(
        'SELECT p.vehicle_type, p.base_daily_rate, p.weekly_discount_pct,
                p.weekend_surcharge_pct, p.updated_at,
                (SELECT COUNT(*) FROM vehicles v WHERE v.vehicle_type = p.vehicle_type) AS fleet_count
         FROM vehicle_pricing p
         ORDER BY p.vehicle_type'
    )->fetchAll();

    $typesInFleet = $pdo->query('SELECT DISTINCT vehicle_type FROM vehicles')->fetchAll(PDO::FETCH_COLUMN);
    $configured = array_map(fn($p) => $p['vehicle_type'], $pricing);
    foreach ($typesInFleet as $type) {
        if (!in_array($type, $configured, true)) {
            $pricing[] = [
                'vehicle_type' => $type,
                'base_daily_rate' => '0.00',
                'weekly_discount_pct' => '0.00',
                'weekend_surcharge_pct' => '0.00',
                'updated_at' => null,
                'fleet_count' => 0,
            ];
        }
    }

    $out = array_map(function ($p) {
        return [
            'type' => $p['vehicle_type'],
            'baseDailyRate' => (float)$p['base_daily_rate'],
            'weeklyDiscountPct' => (float)$p['weekly_discount_pct'],
            'weekendSurchargePct' => (float)$p['weekend_surcharge_pct'],
            'fleetCount' => (int)$p['fleet_count'],
            'updatedAt' => $p['updated_at'] ? date('Y-m-d', strtotime($p['updated_at'])) : null,
        ];
    }, $pricing);

    json_out($out);
}

if ($method === 'PUT') {
    $b = body_json();

    $type = trim((string)($b['type'] ?? ''));
    if ($type === '') json_error('Vehicle type is required.');

    $rate = (float)($b['baseDailyRate'] ?? 0);
    $weekly = (float)($b['weeklyDiscountPct'] ?? 0);
    $weekend = (float)($b['weekendSurchargePct'] ?? 0);

    if ($rate < 0) json_error('Daily rate cannot be negative.');
    if ($weekly < 0 || $weekly > 100) json_error('Weekly discount must be between 0 and 100.');
    if ($weekend < 0 || $weekend > 100) json_error('Weekend surcharge must be between 0 and 100.');

    $pdo->prepare(
        'INSERT INTO vehicle_pricing (vehicle_type, base_daily_rate, weekly_discount_pct, weekend_surcharge_pct)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           base_daily_rate = VALUES(base_daily_rate),
           weekly_discount_pct = VALUES(weekly_discount_pct),
           weekend_surcharge_pct = VALUES(weekend_surcharge_pct)'
    )->execute([$type, $rate, $weekly, $weekend]);

    json_out(['message' => 'Pricing updated for ' . $type . '.']);
}

json_error('Method not allowed.', 405);
