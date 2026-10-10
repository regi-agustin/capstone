<?php
require_once __DIR__ . '/helpers.php';

$user = require_login();
$pdo = db();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $isSupervisor = in_array($user['role'], ['superadmin', 'admin'], true);

    if ($isSupervisor && (int)($_GET['all'] ?? 0) === 1) {
        $rows = $pdo->query(
            'SELECT f.feedback_id, f.rating, f.comment, f.created_at,
                    u.fullname AS user_name, f.reservation_id
             FROM feedback f
             LEFT JOIN users u ON u.user_id = f.user_id
             ORDER BY f.created_at DESC'
        )->fetchAll();
    } else {
        $stmt = $pdo->prepare(
            'SELECT f.feedback_id, f.rating, f.comment, f.created_at, f.reservation_id
             FROM feedback f
             WHERE f.user_id = ?
             ORDER BY f.created_at DESC'
        );
        $stmt->execute([$user['user_id']]);
        $rows = $stmt->fetchAll();
    }

    $out = array_map(function ($f) {
        return [
            'id' => (int)$f['feedback_id'],
            'rating' => (int)$f['rating'],
            'comment' => $f['comment'] ?? '',
            'date' => substr($f['created_at'], 0, 10),
            'userName' => $f['user_name'] ?? '',
            'reservationId' => $f['reservation_id'] ? (int)$f['reservation_id'] : null,
        ];
    }, $rows);

    json_out($out);
}

if ($method === 'POST') {
    $data = body_json();
    $rating = (int)($data['rating'] ?? 0);
    $comment = trim((string)($data['comment'] ?? ''));
    $reservationId = (int)($data['reservationId'] ?? 0);

    if ($rating < 1 || $rating > 5) json_error('Rating must be between 1 and 5.', 422);
    if ($comment === '') json_error('A comment is required.', 422);

    if ($reservationId > 0) {
        $stmt = $pdo->prepare('SELECT reservation_id FROM reservations WHERE reservation_id = ? AND client_id IN (SELECT client_id FROM clients WHERE user_id = ?)');
        $stmt->execute([$reservationId, $user['user_id']]);
        if (!$stmt->fetch()) $reservationId = 0;
    }

    $stmt = $pdo->prepare('INSERT INTO feedback (user_id, reservation_id, rating, comment) VALUES (?, ?, ?, ?)');
    $stmt->execute([$user['user_id'], $reservationId > 0 ? $reservationId : null, $rating, $comment]);
    touch_retrain_flag(); // new explicit signal for the CF trainer

    json_out(['id' => (int)$pdo->lastInsertId(), 'rating' => $rating], 201);
}

json_error('Method not allowed.', 405);