<?php
require_once __DIR__ . '/helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed.', 405);
}

$data = body_json();
$username = trim((string)($data['username'] ?? ''));
$password = (string)($data['password'] ?? '');

if ($username === '' || $password === '') {
    json_error('Username and password are required.', 422);
}

// SHA-256 hashing, matching what the app stores in users.password_hash
try {
    $stmt = db()->prepare('SELECT user_id, username, fullname, role, password_hash, status FROM users WHERE username = ?');
    $stmt->execute([$username]);
    $user = $stmt->fetch();
} catch (Throwable $e) {
    error_log('Login lookup failed: ' . $e->getMessage());
    json_error('Login is temporarily unavailable. Please try again later.', 500);
}

if (!$user || !hash_equals($user['password_hash'], hash('sha256', $password))) {
    json_error('Invalid username or password.', 401);
}

if ($user['status'] !== 'active') {
    json_error('This account is inactive or suspended.', 403);
}

// Session-based login (RBAC: role comes from the account record)
session_regenerate_id(true);
$_SESSION['user_id'] = (int)$user['user_id'];

// Record the login session so the Security pages can show real activity.
$pdo = db();
$ua = (string)($_SERVER['HTTP_USER_AGENT'] ?? '');
if (stripos($ua, 'Android') !== false) $device = 'Android · Chrome';
elseif (stripos($ua, 'iPhone') !== false || stripos($ua, 'iPad') !== false) $device = 'iPhone · Safari';
elseif (stripos($ua, 'Macintosh') !== false || stripos($ua, 'Mac OS') !== false) $device = 'macOS · Safari';
elseif (stripos($ua, 'Edg') !== false) $device = 'Windows · Edge';
else $device = 'Windows · Chrome';

try {
    $pdo->prepare("UPDATE login_sessions SET status = 'active' WHERE user_id = ? AND status = 'current'")
        ->execute([(int)$user['user_id']]);
    $pdo->prepare(
        'INSERT INTO login_sessions (user_id, device, location, ip_address, status)
         VALUES (?, ?, ?, ?, "current")'
    )->execute([(int)$user['user_id'], $device, 'Pampanga, Philippines', $_SERVER['REMOTE_ADDR'] ?? null]);
} catch (Throwable $e) {
    // The session is already established; a bookkeeping failure must not block login.
    error_log('Login session record failed: ' . $e->getMessage());
}

json_out([
    'user_id' => (int)$user['user_id'],
    'username' => $user['username'],
    'fullname' => $user['fullname'],
    'role' => $user['role'],
]);
