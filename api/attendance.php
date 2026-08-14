<?php
require_once __DIR__ . '/helpers.php';

$user = require_login();
$pdo = db();

// Driver endpoints operate on the driver record linked to the logged-in user.
// DMH/admin/payroll roles may pass ?driver_id= for one driver, or omit it
// to list attendance across all drivers.
$driverId = null;

if (in_array($user['role'], ['superadmin', 'admin', 'driver_management_head', 'payroll_officer'], true)) {
    $driverId = (int)($_GET['driver_id'] ?? 0);
    if ($driverId <= 0) $driverId = null;
} else {
    if ($user['role'] !== 'driver') json_error('Forbidden.', 403);
    $stmt = $pdo->prepare('SELECT driver_id FROM drivers WHERE user_id = ?');
    $stmt->execute([$user['user_id']]);
    $driverId = (int)$stmt->fetchColumn();
    if ($driverId <= 0) json_error('No driver record linked to this account.', 404);
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $sql = 'SELECT a.attendance_id, a.attendance_date, a.time_in, a.time_out, a.verification_status,
                   a.rejection_reason, a.vehicle_image, a.time_in > "08:00:00" AS is_late,
                   v.model, v.plate_number, d.fullname AS driver_name
            FROM attendance a
            JOIN vehicles v ON v.vehicle_id = a.vehicle_id
            JOIN drivers d ON d.driver_id = a.driver_id';
    $params = [];
    if ($driverId !== null) {
        $sql .= ' WHERE a.driver_id = ?';
        $params[] = $driverId;
    }
    $sql .= ' ORDER BY a.attendance_date DESC, a.attendance_id DESC';

    $rows = $pdo->prepare($sql);
    $rows->execute($params);

    $out = array_map(function ($a) {
        return [
            'id' => (int)$a['attendance_id'],
            'date' => $a['attendance_date'],
            'driverName' => $a['driver_name'] ?? '',
            'vehicle' => $a['model'],
            'status' => 'Present',
            'isLate' => (int)($a['is_late'] ?? 0) === 1,
            'timeIn' => fmt_time($a['time_in']),
            'timeOut' => fmt_time($a['time_out']),
            'verificationStatus' => ucfirst($a['verification_status']),
            'rejectionReason' => $a['rejection_reason'],
            'photoUrl' => $a['vehicle_image'],
            'hasPhoto' => (bool)$a['vehicle_image'],
        ];
    }, $rows->fetchAll());

    json_out($out);
}

if ($method === 'POST') {
    $data = body_json();
    $action = $data['action'] ?? 'time_in';

    if ($action === 'time_out') {
        $stmt = $pdo->prepare(
            'UPDATE attendance SET time_out = CURTIME()
             WHERE driver_id = ? AND attendance_date = CURDATE() AND time_out IS NULL'
        );
        $stmt->execute([$driverId]);
        if ($stmt->rowCount() === 0) json_error('No active time-in record for today.', 404);
        json_out(['ok' => true]);
    }

    // time_in with plate-photo upload (OCR verification is pending until approved)
    if ($action === 'manual') {
        require_role($user, ['superadmin', 'admin', 'driver_management_head', 'payroll_officer']);

        $targetDriverId = (int)($data['driverId'] ?? 0);
        $date = trim((string)($data['date'] ?? ''));
        $timeIn = trim((string)($data['timeIn'] ?? ''));
        $timeOut = trim((string)($data['timeOut'] ?? ''));
        $verification = trim((string)($data['verificationStatus'] ?? 'Verified'));

        if ($targetDriverId <= 0 || $date === '' || $timeIn === '') {
            json_error('Driver, date, and time-in are required.', 422);
        }
        if (!in_array($verification, ['Verified', 'Pending', 'Rejected'], true)) {
            json_error('Verification status must be Verified, Pending, or Rejected.', 422);
        }
        if ($timeOut !== '' && $timeOut <= $timeIn) {
            json_error('Time-out must be later than time-in.', 422);
        }

        $stmt = $pdo->prepare('SELECT driver_id FROM drivers WHERE driver_id = ?');
        $stmt->execute([$targetDriverId]);
        if (!$stmt->fetch()) json_error('Driver not found.', 404);

        // Best-effort vehicle: active assignment, last used, else first on file.
        $vehicleId = 0;
        $active = active_reservation_for_driver($pdo, $targetDriverId);
        if ($active && $active['vehicle_id']) {
            $vehicleId = (int)$active['vehicle_id'];
        }
        if ($vehicleId <= 0) {
            $last = $pdo->prepare('SELECT vehicle_id FROM attendance WHERE driver_id = ? ORDER BY attendance_id DESC LIMIT 1');
            $last->execute([$targetDriverId]);
            $vehicleId = (int)$last->fetchColumn();
        }
        if ($vehicleId <= 0) {
            $vehicleId = (int)$pdo->query('SELECT vehicle_id FROM vehicles ORDER BY vehicle_id LIMIT 1')->fetchColumn();
        }

        $rejectionReason = $verification === 'Rejected'
            ? trim((string)($data['rejectionReason'] ?? ''))
            : null;
        if ($verification === 'Rejected' && $rejectionReason === '') {
            json_error('A rejection reason is required for rejected records.', 422);
        }

        $exists = $pdo->prepare('SELECT attendance_id FROM attendance WHERE driver_id = ? AND attendance_date = ?');
        $exists->execute([$targetDriverId, $date]);
        $existingId = (int)$exists->fetchColumn();

        if ($existingId > 0) {
            $upd = $pdo->prepare(
                'UPDATE attendance
                 SET time_in = ?, time_out = ?, verification_status = ?, rejection_reason = ?
                 WHERE attendance_id = ?'
            );
            $upd->execute([
                $timeIn . ':00',
                $timeOut !== '' ? $timeOut . ':00' : null,
                strtolower($verification),
                $rejectionReason,
                $existingId,
            ]);
            $attendanceId = $existingId;
        } else {
            $ins = $pdo->prepare(
                'INSERT INTO attendance (driver_id, vehicle_id, attendance_date, time_in, time_out,
                                         verification_status, rejection_reason)
                 VALUES (?, ?, ?, ?, ?, ?, ?)'
            );
            $ins->execute([
                $targetDriverId, $vehicleId, $date,
                $timeIn . ':00',
                $timeOut !== '' ? $timeOut . ':00' : null,
                strtolower($verification),
                $rejectionReason,
            ]);
            $attendanceId = (int)$pdo->lastInsertId();
        }

        log_action($pdo, (int)$user['user_id'], 'ATTENDANCE_MANUAL',
            'Recorded attendance for driver ' . $targetDriverId . ' on ' . $date . ' (' . $verification . ')');
        json_out(['id' => $attendanceId, 'verificationStatus' => $verification], 201);
    }

    $res = active_reservation_for_driver($pdo, $driverId);
    if (!$res || !$res['vehicle_id']) {
        json_error('No assigned vehicle found for today.', 422);
    }
    $vehicleId = (int)$res['vehicle_id'];

    // Existing record for today -> reject duplicates
    $stmt = $pdo->prepare('SELECT attendance_id FROM attendance WHERE driver_id = ? AND attendance_date = CURDATE()');
    $stmt->execute([$driverId]);
    if ($stmt->fetch()) json_error('Attendance already recorded for today.', 409);

    $imagePath = null;
    $image = (string)($data['image'] ?? '');
    if (preg_match('#^data:image/(png|jpe?g|webp);base64,(.+)$#i', $image, $m)) {
        $dir = __DIR__ . '/uploads/attendance';
        if (!is_dir($dir)) mkdir($dir, 0777, true);
        $imagePath = '/fleetops/api/uploads/attendance/' . date('Ymd_His') . '_' . $driverId . '.' . strtolower($m[1]);
        file_put_contents($dir . '/' . basename($imagePath), base64_decode($m[2]));
    }

    $stmt = $pdo->prepare(
        'INSERT INTO attendance (driver_id, vehicle_id, attendance_date, time_in, vehicle_image, verification_status)
         VALUES (?, ?, CURDATE(), CURTIME(), ?, "pending")'
    );
    $stmt->execute([$driverId, $vehicleId, $imagePath]);

    json_out([
        'id' => (int)$pdo->lastInsertId(),
        'verificationStatus' => 'Pending',
    ], 201);
}

json_error('Method not allowed.', 405);
