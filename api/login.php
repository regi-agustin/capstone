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
$stmt = db()->prepare('SELECT user_id, username, fullname, role, password_hash, status FROM users WHERE username = ?');
$stmt->execute([$username]);
$user = $stmt->fetch();

if (!$user || !hash_equals($user['password_hash'], hash('sha256', $password))) {
    json_error('Invalid username or password.', 401);
}

if ($user['status'] !== 'active') {
    json_error('This account is inactive or suspended.', 403);
}

// Session-based login (RBAC: role comes from the account record)
session_regenerate_id(true);
$_SESSION['user_id'] = (int)$user['user_id'];

json_out([
    'user_id' => (int)$user['user_id'],
    'username' => $user['username'],
    'fullname' => $user['fullname'],
    'role' => $user['role'],
]);
