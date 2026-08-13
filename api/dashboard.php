<?php
require_once __DIR__ . '/helpers.php';

$user = require_login();
require_role($user, ['superadmin', 'admin', 'driver_management_head']);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Method not allowed.', 405);
}

$pdo = db();

// One pass over drivers: total / unavailable / assigned / unassigned
$d = $pdo->query(
    'SELECT COUNT(*) AS total,
            SUM(d.is_unavailable = 1) AS unavailable,
            SUM(d.is_unavailable = 0 AND EXISTS (
                SELECT 1 FROM reservations r
                WHERE r.driver_id = d.driver_id AND r.status IN ("confirmed", "on_trip")
            )) AS assigned,
            SUM(d.is_unavailable = 0 AND NOT EXISTS (
                SELECT 1 FROM reservations r
                WHERE r.driver_id = d.driver_id AND r.status IN ("confirmed", "on_trip")
            )) AS unassigned
     FROM drivers d'
)->fetch();

// One pass over vehicles: total / available / maintenance / internal / subcontracted
$v = $pdo->query(
    'SELECT COUNT(*) AS total,
            SUM(status = "available") AS available,
            SUM(status = "maintenance") AS maintenance,
            SUM(owner_id IS NULL) AS internal,
            SUM(owner_id IS NOT NULL) AS subcontracted
     FROM vehicles'
)->fetch();

// One pass over reservations: active trips + distinct clients served
$r = $pdo->query(
    'SELECT COUNT(*) AS active,
            COUNT(DISTINCT client_id) AS clients
     FROM reservations
     WHERE status IN ("confirmed", "on_trip")'
)->fetch();

json_out([
    'totalDrivers' => (int)$d['total'],
    'assignedDrivers' => (int)$d['assigned'],
    'unassignedDrivers' => (int)$d['unassigned'],
    'unavailableDrivers' => (int)$d['unavailable'],
    'totalVehicles' => (int)$v['total'],
    'availableVehicles' => (int)$v['available'],
    'activeTrips' => (int)$r['active'],
    'clientsServed' => (int)$r['clients'],
    'internalVehicles' => (int)$v['internal'],
    'subcontractedVehicles' => (int)$v['subcontracted'],
    'maintenanceVehicles' => (int)$v['maintenance'],
]);
