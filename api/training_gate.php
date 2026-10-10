<?php
require_once __DIR__ . '/helpers.php';

/**
 * Training-data gate — admin review endpoint (Lane A only).
 *
 * Gate semantics (see training/gate.py):
 *   label_status       Lane A - ranker labels. Strict; 'pending' rows wait here.
 *   interaction_status Lane B - CF/CB booking facts. Never touched by review:
 *                      a rejected label still leaves a real booking as an
 *                      interaction (only gate.py excludes dead facts).
 *
 * GET  action=list&status=pending|eligible|rejected|analysis_only|all
 * GET  action=summary
 * POST { action: 'review', logId, decision: 'approve'|'reject', note }
 */

$user = require_login();
require_role($user, ['superadmin', 'admin']);
$pdo = db();

const REVIEWABLE = ['pending', 'eligible'];

function gate_row_shape(array $r): array
{
    return [
        'logId' => (int)$r['log_id'],
        'createdAt' => $r['created_at'],
        'email' => (string)($r['email'] ?? ''),
        'passengers' => (int)$r['passengers'],
        'days' => (int)$r['days'],
        'budget' => $r['budget'] !== null ? (float)$r['budget'] : null,
        'luggageSize' => $r['luggage_size'],
        'preferredType' => $r['preferred_type'],
        'shownIds' => json_decode((string)$r['shown_ids'], true) ?: [],
        'topVehicleId' => $r['top_vehicle_id'] !== null ? (int)$r['top_vehicle_id'] : null,
        'chosenVehicleId' => $r['chosen_vehicle_id'] !== null ? (int)$r['chosen_vehicle_id'] : null,
        'chosenRank' => $r['chosen_rank'] !== null ? (int)$r['chosen_rank'] : null,
        'pickedFrom' => $r['picked_from'],
        'reservationId' => $r['reservation_id'] !== null ? (int)$r['reservation_id'] : null,
        'reservationStatus' => $r['reservation_status'] ?? null,
        'tripCode' => $r['trip_code'] ?? null,
        'chosenLabel' => $r['chosen_label'] ?? null,
        'labelStatus' => $r['label_status'],
        'interactionStatus' => $r['interaction_status'],
        'dataClass' => $r['data_class'],
        'reasons' => json_decode((string)($r['reasons'] ?? '[]'), true) ?: [],
        'reviewedBy' => $r['reviewed_by'] !== null ? (int)$r['reviewed_by'] : null,
        'reviewedAt' => $r['reviewed_at'],
        'reviewNote' => $r['review_note'],
        'validatedAt' => $r['validated_at'],
    ];
}

function gate_select(): string
{
    return 'SELECT l.*,
                   v.vehicle_type AS chosen_vtype, v.plate_number AS chosen_plate, v.car_code AS chosen_code,
                   CASE WHEN l.chosen_vehicle_id IS NULL THEN NULL
                        ELSE CONCAT(COALESCE(v.vehicle_type, "?"), " / ", COALESCE(v.plate_number, v.car_code, "?"))
                   END AS chosen_label,
                   r.status AS reservation_status, r.trip_code
              FROM recommendation_logs l
              LEFT JOIN vehicles v ON v.vehicle_id = l.chosen_vehicle_id
              LEFT JOIN reservations r ON r.reservation_id = l.reservation_id';
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $status = trim((string)($_GET['status'] ?? 'pending'));

    if ($status === 'summary') {
        $out = ['total' => 0, 'byLabelStatus' => [], 'byClass' => [], 'byInteraction' => []];
        foreach ($pdo->query('SELECT label_status, COUNT(*) c FROM recommendation_logs GROUP BY label_status') as $row) {
            $out['byLabelStatus'][$row['label_status']] = (int)$row['c'];
            $out['total'] += (int)$row['c'];
        }
        foreach ($pdo->query('SELECT data_class, COUNT(*) c FROM recommendation_logs GROUP BY data_class') as $row) {
            $out['byClass'][$row['data_class']] = (int)$row['c'];
        }
        foreach ($pdo->query('SELECT interaction_status, COUNT(*) c FROM recommendation_logs GROUP BY interaction_status') as $row) {
            $out['byInteraction'][$row['interaction_status']] = (int)$row['c'];
        }
        $out['pending'] = $out['byLabelStatus']['pending'] ?? 0;
        json_out($out);
    }

    $allowed = ['pending', 'eligible', 'rejected', 'analysis_only', 'raw', 'all'];
    if (!in_array($status, $allowed, true)) {
        json_error('Unknown status filter.', 422);
    }
    $sql = gate_select();
    if ($status !== 'all') {
        $sql .= ' WHERE l.label_status = ?';
    }
    $sql .= ' ORDER BY l.log_id DESC LIMIT 500';
    $stmt = $pdo->prepare($sql);
    if ($status !== 'all') {
        $stmt->execute([$status]);
    } else {
        $stmt->execute();
    }
    json_out(array_map('gate_row_shape', $stmt->fetchAll()));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = body_json();
    $action = trim((string)($data['action'] ?? ''));

    if ($action !== 'review') {
        json_error('Action must be one of: review.', 422);
    }

    $logId = (int)($data['logId'] ?? 0);
    $decision = trim((string)($data['decision'] ?? ''));
    $note = trim((string)($data['note'] ?? ''));
    if ($logId <= 0) {
        json_error('logId is required.', 422);
    }
    if (!in_array($decision, ['approve', 'reject'], true)) {
        json_error("decision must be 'approve' or 'reject'.", 422);
    }

    $stmt = $pdo->prepare('SELECT * FROM recommendation_logs WHERE log_id = ? LIMIT 1');
    $stmt->execute([$logId]);
    $log = $stmt->fetch();
    if (!$log) {
        json_error('Unknown recommendation log.', 404);
    }
    if (!in_array($log['label_status'], REVIEWABLE, true)) {
        json_error('Only pending or eligible rows can be reviewed (current: ' . $log['label_status'] . ').', 409);
    }

    // Approving a label requires a real, live conversion — you cannot promote
    // an unconverted click into training data, by hand or otherwise.
    if ($decision === 'approve') {
        $converted = false;
        if ($log['reservation_id'] !== null) {
            $stmt = $pdo->prepare('SELECT status FROM reservations WHERE reservation_id = ?');
            $stmt->execute([(int)$log['reservation_id']]);
            $resStatus = $stmt->fetchColumn();
            $converted = $resStatus !== false
                && in_array($resStatus, ['pending', 'pricing_approved', 'confirmed', 'on_trip', 'completed'], true);
        }
        if (!$converted) {
            json_error('Cannot approve: this choice never converted into a live booking.', 409);
        }
    }

    $newStatus = $decision === 'approve' ? 'eligible' : 'rejected';
    $stmt = $pdo->prepare(
        'UPDATE recommendation_logs
            SET label_status = ?, reviewed_by = ?, reviewed_at = NOW(), review_note = ?
          WHERE log_id = ?'
    );
    $stmt->execute([$newStatus, (int)$user['user_id'], $note !== '' ? $note : null, $logId]);

    log_action(
        $pdo, (int)$user['user_id'],
        'TRAINING_GATE_' . strtoupper($newStatus),
        'Recommendation log #' . $logId . ' ' . $decision . 'd' . ($note !== '' ? ' — ' . $note : '')
    );

    $stmt = $pdo->prepare(gate_select() . ' WHERE l.log_id = ?');
    $stmt->execute([$logId]);
    json_out(gate_row_shape($stmt->fetch()));
}

json_error('Method not allowed.', 405);
