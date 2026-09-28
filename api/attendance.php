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
                   a.rejection_reason, a.vehicle_image, a.detected_plate_number, a.time_in > "08:00:00" AS is_late,
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
        // Calculate total hours worked
        $totalHours = '-';
        if ($a['time_out'] && $a['time_in']) {
            $timeIn = strtotime($a['time_in']);
            $timeOut = strtotime($a['time_out']);
            $diff = ($timeOut - $timeIn) / 3600; // Convert to hours
            $totalHours = number_format($diff, 2) . ' hrs';
        }

        return [
            'id' => (int)$a['attendance_id'],
            'date' => $a['attendance_date'],
            'driverName' => $a['driver_name'] ?? '',
            'vehicle' => $a['model'],
            'plateNumber' => $a['plate_number'],
            'status' => 'Present',
            'isLate' => (int)($a['is_late'] ?? 0) === 1,
            'timeIn' => fmt_time($a['time_in']),
            'timeOut' => fmt_time($a['time_out']),
            'totalHours' => $totalHours,
            'verificationStatus' => ucfirst($a['verification_status']),
            'rejectionReason' => $a['rejection_reason'],
            'photoUrl' => $a['vehicle_image'],
            'hasPhoto' => (bool)$a['vehicle_image'],
            'detectedPlateNumber' => $a['detected_plate_number'],
        ];
    }, $rows->fetchAll());

    json_out($out);
}

if ($method === 'POST') {
    $data = body_json();
    $action = $data['action'] ?? 'time_in';

    // Handle re-upload for failed verification
    if ($action === 'retry_time_in') {
        // Check if there's a rejected attendance record for today
        $stmt = $pdo->prepare(
            'SELECT attendance_id FROM attendance 
             WHERE driver_id = ? AND attendance_date = CURDATE() AND verification_status = "rejected"'
        );
        $stmt->execute([$driverId]);
        $existingId = $stmt->fetchColumn();
        
        if (!$existingId) {
            json_error('No rejected attendance record found for today. Please use regular time-in.', 404);
        }
        
        // Process new image
        $imagePath = null;
        $image = (string)($data['image'] ?? '');
        if (preg_match('#^data:image/(png|jpe?g|webp);base64,(.+)$#i', $image, $m)) {
            $dir = __DIR__ . '/uploads/attendance';
            if (!is_dir($dir)) mkdir($dir, 0777, true);
            $imagePath = '/fleetops/api/uploads/attendance/' . date('Ymd_His') . '_' . $driverId . '_retry.' . strtolower($m[1]);
            file_put_contents($dir . '/' . basename($imagePath), base64_decode($m[2]));
        }
        
        // Get vehicle ID from existing record
        $vehicleIdStmt = $pdo->prepare('SELECT vehicle_id FROM attendance WHERE attendance_id = ?');
        $vehicleIdStmt->execute([$existingId]);
        $vehicleId = $vehicleIdStmt->fetchColumn();
        
        // Get detected plate number from OCR processing
        $detectedPlateNumber = trim((string)($data['detectedPlateNumber'] ?? ''));
        
        // Get assigned vehicle plate number for verification
        $assignedPlateStmt = $pdo->prepare('SELECT plate_number FROM vehicles WHERE vehicle_id = ?');
        $assignedPlateStmt->execute([$vehicleId]);
        $assignedPlate = $assignedPlateStmt->fetchColumn();
        
        // Require plate number detection for verification
        if (!$detectedPlateNumber) {
            // Delete the existing record and return error
            $del = $pdo->prepare('DELETE FROM attendance WHERE attendance_id = ?');
            $del->execute([$existingId]);
            
            $logDetails = 'Driver retry time-in failed: No plate number detected in image';
            log_action($pdo, (int)$user['user_id'], 'TIME_IN_RETRY_FAILED', $logDetails);
            
            json_error('No plate number detected in the image. Please upload a clearer image showing the vehicle plate number.', 422);
        }
        
        // Verify plate number matches assigned vehicle
        if ($assignedPlate) {
            $normalizedDetected = preg_replace('/[^A-Z0-9]/', '', strtoupper($detectedPlateNumber));
            $normalizedAssigned = preg_replace('/[^A-Z0-9]/', '', strtoupper($assignedPlate));
            
            if ($normalizedDetected !== $normalizedAssigned) {
                // Plate number mismatch - delete the rejected record and return error
                $del = $pdo->prepare('DELETE FROM attendance WHERE attendance_id = ?');
                $del->execute([$existingId]);
                
                $logDetails = 'Driver retry time-in failed: Plate number mismatch. OCR detected: ' . $detectedPlateNumber . 
                              ', Assigned: ' . $assignedPlate;
                log_action($pdo, (int)$user['user_id'], 'TIME_IN_RETRY_FAILED', $logDetails);
                
                // Create notification for verification failure
                try {
                    create_notification($pdo, (int)$user['user_id'], 'attendance_rejected', 
                        'Attendance Verification Failed', 
                        'Your attendance verification retry failed due to plate number mismatch. Detected: ' . $detectedPlateNumber . ', Assigned: ' . $assignedPlate . '. Please try again with the correct vehicle.');
                } catch (Exception $e) {
                    error_log('Failed to create notification: ' . $e->getMessage());
                }
                
                json_error('Plate number verification failed. Detected: ' . $detectedPlateNumber . ', Assigned: ' . $assignedPlate . '. Please try again with the correct vehicle.', 422);
            }
        }
        
        // Only update if verification passed
        $verificationStatus = 'verified';
        $upd = $pdo->prepare(
            'UPDATE attendance
             SET vehicle_image = ?, detected_plate_number = ?, verification_status = ?, rejection_reason = NULL
             WHERE attendance_id = ?'
        );
        $upd->execute([$imagePath, $detectedPlateNumber, $verificationStatus, $existingId]);

        $logDetails = 'Driver retried time-in with new vehicle image. OCR detected: ' . ($detectedPlateNumber ?: 'N/A') .
                      ', Assigned: ' . ($assignedPlate ?: 'N/A') . ', Status: ' . $verificationStatus;
        log_action($pdo, (int)$user['user_id'], 'TIME_IN_RETRY', $logDetails);

        // Create notification for successful verification retry (with error handling)
        try {
            create_notification($pdo, (int)$user['user_id'], 'attendance_verified', 
                'Attendance Verification Successful', 
                'Your attendance verification retry was successful. Your attendance for today has been verified.');
        } catch (Exception $e) {
            // Log error but don't fail the retry process
            error_log('WARNING: Failed to create retry notification for user_id: ' . (int)$user['user_id'] . ' - ' . $e->getMessage());
        }

        json_out([
            'id' => (int)$existingId,
            'verificationStatus' => ucfirst($verificationStatus),
            'detectedPlateNumber' => $detectedPlateNumber,
            'assignedPlateNumber' => $assignedPlate,
        ]);
    }

    if ($action === 'time_out') {
        // Check if there's a verified attendance record for today without time out
        $stmt = $pdo->prepare(
            'SELECT attendance_id FROM attendance 
             WHERE driver_id = ? AND attendance_date = CURDATE() AND time_out IS NULL AND verification_status = "verified"'
        );
        $stmt->execute([$driverId]);
        $attendanceId = $stmt->fetchColumn();
        
        if (!$attendanceId) {
            json_error('No time-in record found for today. Please complete time-in first.', 404);
        }
        
        $stmt = $pdo->prepare(
            'UPDATE attendance SET time_out = CURTIME()
             WHERE attendance_id = ?'
        );
        $stmt->execute([$attendanceId]);

        // Log the time out action
        log_action($pdo, (int)$user['user_id'], 'TIME_OUT', 'Driver timed out');
        
        // Create notification for successful time-out
        create_notification($pdo, (int)$user['user_id'], 'attendance_verified', 
            'Time-Out Successful', 
            'You have successfully timed out for today at ' . date('h:i A') . '. Your attendance for today is complete.');
        
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
            $oldStatusStmt = $pdo->prepare('SELECT verification_status FROM attendance WHERE attendance_id = ?');
            $oldStatusStmt->execute([$existingId]);
            $oldStatus = $oldStatusStmt->fetchColumn();

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
                                         verification_status, rejection_reason, detected_plate_number)
                 VALUES (?, ?, ?, ?, ?, ?, ?, NULL)'
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
        
        // Create notification for driver based on verification status
        $driverUserId = get_user_id_by_driver($pdo, $targetDriverId);
        if ($driverUserId) {
            if ($verification === 'Verified') {
                create_notification($pdo, $driverUserId, 'attendance_verified', 
                    'Attendance Verified', 
                    'Your attendance for ' . $date . ' has been verified by the administration.');
            } elseif ($verification === 'Rejected') {
                create_notification($pdo, $driverUserId, 'attendance_rejected', 
                    'Attendance Rejected', 
                    'Your attendance for ' . $date . ' has been rejected. Reason: ' . ($rejectionReason ?: 'Contact administration for details.'));
            }
        }
        
        json_out(['id' => $attendanceId, 'verificationStatus' => $verification], 201);
    }

    $res = active_reservation_for_driver($pdo, $driverId);
    if (!$res || !$res['vehicle_id']) {
        json_error('No assigned vehicle found for today.', 422);
    }
    $vehicleId = (int)$res['vehicle_id'];

    // Check for completed attendance record (both Time-In and Time-Out exist for today)
    $stmt = $pdo->prepare(
        'SELECT attendance_id FROM attendance 
         WHERE driver_id = ? AND attendance_date = CURDATE() AND time_in IS NOT NULL AND time_out IS NOT NULL'
    );
    $stmt->execute([$driverId]);
    $completedRecord = $stmt->fetch();

    if ($completedRecord) {
        json_error('Attendance already recorded for today.', 409);
    }

    // Existing record for today -> check status and time_out
    $stmt = $pdo->prepare('SELECT attendance_id, verification_status, time_out FROM attendance WHERE driver_id = ? AND attendance_date = CURDATE()');
    $stmt->execute([$driverId]);
    $existing = $stmt->fetch();
    if ($existing) {
        // If already timed out, day is complete - cannot time in again
        if ($existing['time_out']) {
            json_error('You have already completed your attendance for today. You cannot time in again after timing out.', 409);
        }
        // If verified and clocked in (no time_out), already clocked in
        if ($existing['verification_status'] === 'verified') {
            json_error('You are already clocked in for today. Please time out first before attempting to time in again.', 409);
        }
        // If rejected, allow retry with better image
        if ($existing['verification_status'] === 'rejected') {
            json_error('Your previous time-in was rejected. Please use the retry option with a clearer image.', 409);
        }
        // For pending status
        json_error('Attendance already recorded for today. Please contact admin if you need to make changes.', 409);
    }

    $imagePath = null;
    $image = (string)($data['image'] ?? '');
    if (preg_match('#^data:image/(png|jpe?g|webp);base64,(.+)$#i', $image, $m)) {
        $dir = __DIR__ . '/uploads/attendance';
        if (!is_dir($dir)) mkdir($dir, 0777, true);
        $imagePath = '/fleetops/api/uploads/attendance/' . date('Ymd_His') . '_' . $driverId . '.' . strtolower($m[1]);
        file_put_contents($dir . '/' . basename($imagePath), base64_decode($m[2]));
    }

    // Get detected plate number from OCR processing
    $detectedPlateNumber = trim((string)($data['detectedPlateNumber'] ?? ''));
    
    // Get assigned vehicle plate number for verification
    $assignedPlateStmt = $pdo->prepare('SELECT plate_number FROM vehicles WHERE vehicle_id = ?');
    $assignedPlateStmt->execute([$vehicleId]);
    $assignedPlate = $assignedPlateStmt->fetchColumn();
    
    // Require plate number detection for verification
    if (!$detectedPlateNumber) {
        $logDetails = 'Driver time-in failed: No plate number detected in image';
        log_action($pdo, (int)$user['user_id'], 'TIME_IN_FAILED', $logDetails);
        
        // Create notification for verification failure
        try {
            create_notification($pdo, (int)$user['user_id'], 'attendance_rejected', 
                'Attendance Verification Failed', 
                'Your attendance verification failed because no plate number was detected in the image. Please upload a clearer image showing the vehicle plate number.');
        } catch (Exception $e) {
            error_log('Failed to create notification: ' . $e->getMessage());
        }
        
        json_error('No plate number detected in the image. Please upload a clearer image showing the vehicle plate number.', 422);
    }
    
    // Verify plate number matches assigned vehicle
    if ($assignedPlate) {
        // Normalize plate numbers for comparison (remove spaces, convert to uppercase)
        $normalizedDetected = preg_replace('/[^A-Z0-9]/', '', strtoupper($detectedPlateNumber));
        $normalizedAssigned = preg_replace('/[^A-Z0-9]/', '', strtoupper($assignedPlate));
        
        if ($normalizedDetected !== $normalizedAssigned) {
            // Plate number mismatch - do not record attendance
            $logDetails = 'Driver time-in failed: Plate number mismatch. OCR detected: ' . $detectedPlateNumber . 
                          ', Assigned: ' . $assignedPlate;
            log_action($pdo, (int)$user['user_id'], 'TIME_IN_FAILED', $logDetails);
            
            // Create notification for verification failure
            try {
                create_notification($pdo, (int)$user['user_id'], 'attendance_rejected', 
                    'Attendance Verification Failed', 
                    'Your attendance verification failed due to plate number mismatch. Detected: ' . $detectedPlateNumber . ', Assigned: ' . $assignedPlate . '. Please try again with the correct vehicle.');
            } catch (Exception $e) {
                error_log('Failed to create notification: ' . $e->getMessage());
            }
            
            json_error('Plate number verification failed. Detected: ' . $detectedPlateNumber . ', Assigned: ' . $assignedPlate . '. Please try again with the correct vehicle.', 422);
        }
    }
    
    // Only record attendance if verification passed
    $verificationStatus = 'verified';
    
    $stmt = $pdo->prepare(
        'INSERT INTO attendance (driver_id, vehicle_id, attendance_date, time_in, vehicle_image, detected_plate_number, verification_status)
         VALUES (?, ?, CURDATE(), CURTIME(), ?, ?, ?)'
    );
    $stmt->execute([$driverId, $vehicleId, $imagePath, $detectedPlateNumber, $verificationStatus]);
    
    $attendanceId = $pdo->lastInsertId();

    // Create notification for successful time-in (with error handling to prevent interruption)
    try {
        create_notification($pdo, (int)$user['user_id'], 'attendance_verified', 
            'Time-In Successful', 
            'You have successfully timed in for today at ' . date('h:i A') . '. Your attendance has been verified.');
    } catch (Exception $e) {
        // Log error but don't fail the attendance recording
        error_log('WARNING: Failed to create time-in notification for user_id: ' . (int)$user['user_id'] . ' - ' . $e->getMessage());
    }

    // Log the time in action with verification result
    $logDetails = 'Driver timed in with vehicle image. OCR detected: ' . ($detectedPlateNumber ?: 'N/A') .
                   ', Assigned: ' . ($assignedPlate ?: 'N/A') . ', Status: ' . $verificationStatus;
    log_action($pdo, (int)$user['user_id'], 'TIME_IN', $logDetails);

    json_out([
        'id' => (int)$attendanceId,
        'verificationStatus' => ucfirst($verificationStatus),
        'detectedPlateNumber' => $detectedPlateNumber,
        'assignedPlateNumber' => $assignedPlate,
    ], 201);
}

json_error('Method not allowed.', 405);
