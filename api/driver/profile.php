<?php
/**
 * Driver Module — profile API.
 * Drivers may only read and update their own linked driver record.
 */
require_once __DIR__ . '/../helpers.php';

$user = require_login();
require_role($user, ['driver']);

$pdo = db();
$method = $_SERVER['REQUEST_METHOD'];
$userId = (int)$user['user_id'];

function driver_profile_for_user(PDO $pdo, int $userId): ?array
{
    $stmt = $pdo->prepare(
        'SELECT d.*, u.email AS user_email, u.contact_number AS user_contact
         FROM drivers d
         JOIN users u ON u.user_id = d.user_id
         WHERE d.user_id = ?'
    );
    $stmt->execute([$userId]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/**
 * Driver login accounts created without license details have no drivers row.
 * Provision one from the user account so the profile dashboard can load.
 */
function ensure_driver_record(PDO $pdo, int $userId): ?array
{
    $existing = driver_profile_for_user($pdo, $userId);
    if ($existing) {
        return $existing;
    }

    $stmt = $pdo->prepare(
        'SELECT user_id, fullname, contact_number FROM users WHERE user_id = ? AND role = "driver"'
    );
    $stmt->execute([$userId]);
    $account = $stmt->fetch();
    if (!$account) {
        return null;
    }

    $contact = trim((string)($account['contact_number'] ?? ''));
    if ($contact === '') {
        $contact = '-';
    }

    $license = 'LIC-PENDING-' . $userId;
    $licCheck = $pdo->prepare('SELECT driver_id FROM drivers WHERE license_number = ?');
    $licCheck->execute([$license]);
    if ($licCheck->fetch()) {
        $license = 'LIC-PENDING-' . $userId . '-' . time();
    }

    $pdo->prepare(
        'INSERT INTO drivers (user_id, fullname, contact_number, license_number, license_expiry, hire_date, status)
         VALUES (?, ?, ?, ?, DATE_ADD(CURDATE(), INTERVAL 1 YEAR), CURDATE(), "active")'
    )->execute([
        $userId,
        $account['fullname'],
        $contact,
        $license,
    ]);

    log_action($pdo, $userId, 'DRIVER_PROFILE_LINK', 'Auto-linked driver record to login account');

    return driver_profile_for_user($pdo, $userId);
}

function validate_driver_contact(string $contact): ?string
{
    $contact = trim($contact);
    if ($contact === '') {
        return 'Contact number is required.';
    }
    if (mb_strlen($contact) > 20) {
        return 'Contact number must be 20 characters or fewer.';
    }
    $digits = preg_replace('/\D/', '', $contact);
    if ($digits === null || strlen($digits) < 7 || strlen($digits) > 15) {
        return 'Please provide a valid contact number (7–15 digits).';
    }
    return null;
}

function validate_driver_email(string $email): ?string
{
    $email = trim($email);
    if ($email === '') {
        return 'Email address is required.';
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return 'Please provide a valid email address.';
    }
    if (mb_strlen($email) > 100) {
        return 'Email address must be 100 characters or fewer.';
    }
    return null;
}

function driver_profile_image_supported(PDO $pdo): bool
{
    static $supported = null;
    if ($supported === null) {
        $supported = (bool)$pdo->query("SHOW COLUMNS FROM drivers LIKE 'profile_image'")->fetch();
    }
    return $supported;
}

function store_driver_profile_image(int $driverId, string $image, ?string $existingPath): string
{
    if (!preg_match('#^data:image/(png|jpe?g|webp);base64,(.+)$#i', $image, $m)) {
        json_error('Profile image must be a PNG, JPEG, or WebP file.', 422);
    }

    $raw = base64_decode($m[2], true);
    if ($raw === false || strlen($raw) > 5 * 1024 * 1024) {
        json_error('Profile image must be 5 MB or smaller.', 422);
    }

    $dir = __DIR__ . '/../uploads/profile';
    if (!is_dir($dir)) {
        mkdir($dir, 0777, true);
    }

    $filename = date('Ymd_His') . '_' . $driverId . '.' . strtolower($m[1]);
    $fullPath = $dir . '/' . $filename;
    if (file_put_contents($fullPath, $raw) === false) {
        json_error('Failed to save profile image.', 500);
    }

    if ($existingPath) {
        $oldFile = $dir . '/' . basename($existingPath);
        if (is_file($oldFile)) {
            @unlink($oldFile);
        }
    }

    return '/api/uploads/profile/' . $filename;
}

function driver_profile_payload(PDO $pdo, array $driver, int $userId): array
{
    $driverId = (int)$driver['driver_id'];

    $vehicle = null;
    $res = active_reservation_for_driver($pdo, $driverId);
    if ($res) {
        $vehicle = [
            'id' => 'VH-' . str_pad((string)$res['vehicle_id'], 3, '0', STR_PAD_LEFT),
            'name' => $res['model'],
            'plateNumber' => $res['plate_number'],
            'type' => $res['vehicle_type'],
            'assignedDate' => $res['start_date'],
        ];
    }

    $profileImage = null;
    if (driver_profile_image_supported($pdo) && !empty($driver['profile_image'])) {
        $profileImage = $driver['profile_image'];
        if (str_starts_with($profileImage, '/fleetops/api/')) {
            $profileImage = '/api/' . substr($profileImage, strlen('/fleetops/api/'));
        }
    }

    $monthStart = date('Y-m-01');
    $monthRows = $pdo->prepare(
        'SELECT COUNT(*) AS total FROM attendance
         WHERE driver_id = ? AND attendance_date >= ?'
    );
    $monthRows->execute([$driverId, $monthStart]);
    $presentDays = (int)$monthRows->fetchColumn();

    $totalHours = $pdo->prepare(
        'SELECT COALESCE(SUM(TIMESTAMPDIFF(HOUR, time_in, COALESCE(time_out, time_in))), 0)
         FROM attendance WHERE driver_id = ? AND attendance_date >= ?'
    );
    $totalHours->execute([$driverId, $monthStart]);
    $hours = (int)$totalHours->fetchColumn();

    $avgRating = $pdo->prepare(
        'SELECT COALESCE(AVG(rating), 0) FROM feedback f
         JOIN reservations r ON r.reservation_id = f.reservation_id WHERE r.driver_id = ?'
    );
    $avgRating->execute([$driverId]);
    $rating = round((float)$avgRating->fetchColumn(), 1);

    $onTime = $pdo->prepare(
        'SELECT COALESCE(SUM(time_in <= "08:00:00"), 0) AS on_time, COUNT(*) AS total
         FROM attendance WHERE driver_id = ?'
    );
    $onTime->execute([$driverId]);
    $onTimeRow = $onTime->fetch();
    $onTimePct = ((int)($onTimeRow['total'] ?? 0)) > 0
        ? round(((int)$onTimeRow['on_time']) / (int)$onTimeRow['total'] * 100) . '%'
        : '0%';

    // Use CURDATE() for consistent date handling across the attendance system
    // Get today's date from database to ensure consistency with attendance.php
    $todayStmt = $pdo->query('SELECT CURDATE() as today');
    $todayRow = $todayStmt->fetch();
    $today = $todayRow['today'];

    // Currently clocked in (today's record without a time out - check for any attendance record)
    $clocked = $pdo->prepare(
        'SELECT attendance_id FROM attendance
         WHERE driver_id = ? AND attendance_date = ? AND time_out IS NULL'
    );
    $clocked->execute([$driverId, $today]);
    $isClockedIn = (bool)$clocked->fetchColumn();

    // Check if already completed attendance for today (has both time in and time out)
    $completed = $pdo->prepare(
        'SELECT attendance_id FROM attendance
         WHERE driver_id = ? AND attendance_date = ? AND time_out IS NOT NULL AND time_out != ""'
    );
    $completed->execute([$driverId, $today]);
    $hasCompletedToday = (bool)$completed->fetchColumn();

    // Get latest payroll status
    $latestPayroll = $pdo->prepare('SELECT status FROM payroll WHERE driver_id = ? ORDER BY payroll_date DESC LIMIT 1');
    $latestPayroll->execute([$driverId]);
    $payrollStatus = ucfirst((string)$latestPayroll->fetchColumn());

    return [
        'clockedIn' => $isClockedIn,
        'hasCompletedToday' => $hasCompletedToday,
        'driver' => [
            'id' => 'DRV-' . str_pad((string)$driverId, 3, '0', STR_PAD_LEFT),
            'name' => $driver['fullname'],
            'email' => $driver['user_email'] ?? '',
            'contactNumber' => $driver['contact_number'],
            'licenseNumber' => $driver['license_number'],
            'licenseExpiry' => $driver['license_expiry'],
            'employmentStatus' => ucfirst($driver['status']),
            'status' => ucfirst($driver['status']),
            'hireDate' => $driver['hire_date'] ?? null,
            'profileImage' => $profileImage,
        ],
        'vehicle' => $vehicle,
        'stats' => [
            'totalAttendanceThisMonth' => $presentDays,
            'presentDays' => $presentDays,
            'absentDays' => 0,
            'latestPayrollStatus' => $payrollStatus ?: 'None',
            'totalHoursThisMonth' => $hours,
            'averageRating' => $rating,
            'onTimeAttendance' => $onTimePct,
        ],
    ];
}

if ($method === 'POST') {
    $data = body_json();
    $action = trim((string)($data['action'] ?? ''));

    $driver = ensure_driver_record($pdo, $userId);
    if (!$driver) {
        json_error('No driver record linked to this account.', 404);
    }
    $driverId = (int)$driver['driver_id'];

    if ($action === 'update_profile') {
        $email = trim((string)($data['email'] ?? ''));
        $contactNumber = trim((string)($data['contactNumber'] ?? ''));

        if ($err = validate_driver_email($email)) {
            json_error($err, 422);
        }
        if ($err = validate_driver_contact($contactNumber)) {
            json_error($err, 422);
        }

        $pdo->beginTransaction();
        try {
            $pdo->prepare(
                'UPDATE users SET email = ?, contact_number = ? WHERE user_id = ?'
            )->execute([$email, $contactNumber, $userId]);

            $pdo->prepare(
                'UPDATE drivers SET contact_number = ? WHERE driver_id = ? AND user_id = ?'
            )->execute([$contactNumber, $driverId, $userId]);

            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            json_error('Failed to update profile.', 500);
        }

        log_action($pdo, $userId, 'UPDATE_PROFILE', 'Driver updated contact details');
        
        // Create notification for profile update
        create_notification($pdo, $userId, 'system_alert', 
            'Profile Updated', 
            'Your profile information has been successfully updated.');
        
        json_out(['ok' => true]);
    }

    if ($action === 'upload_profile_image') {
        if (!driver_profile_image_supported($pdo)) {
            json_error('Profile image upload is not available on this system.', 501);
        }

        $image = (string)($data['image'] ?? '');
        if ($image === '') {
            json_error('Profile image is required.', 422);
        }

        $existing = $driver['profile_image'] ?? null;
        $publicPath = store_driver_profile_image($driverId, $image, $existing);

        $pdo->prepare(
            'UPDATE drivers SET profile_image = ? WHERE driver_id = ? AND user_id = ?'
        )->execute([$publicPath, $driverId, $userId]);

        log_action($pdo, $userId, 'UPDATE_PROFILE', 'Driver updated profile image');
        
        // Create notification for profile image update
        create_notification($pdo, $userId, 'system_alert', 
            'Profile Image Updated', 
            'Your profile image has been successfully updated.');
        
        json_out(['ok' => true, 'profileImage' => $publicPath]);
    }

    json_error('Action must be one of: update_profile, upload_profile_image.', 422);
}

if ($method !== 'GET') {
    json_error('Method not allowed.', 405);
}

$driver = ensure_driver_record($pdo, $userId);
if (!$driver) {
    json_error('No driver record linked to this account.', 404);
}

json_out(driver_profile_payload($pdo, $driver, $userId));
