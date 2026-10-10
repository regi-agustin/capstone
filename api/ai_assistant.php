<?php
require_once __DIR__ . '/helpers.php';

/**
 * AI Assistant — vehicle recommendation endpoint.
 *
 * POST { action: 'recommend',
 *        client:  { name, contact, email },
 *        trip:    { destination, pickupDate, pickupTime, returnDate, returnTime, specialRequests },
 *        passengers, budget, luggageSize, preferredType, needDriver, selectedVehicleId }
 *   -> logs the exposure (row_status raw; never training data until the
 *      training gate validates it) and returns logId.
 *
 * POST { action: 'log_choice', logId, vehicleId, pickedFrom }
 *   -> records which shown vehicle the customer actually picked. Still raw.
 *
 * Pipeline: validate -> hard availability/feasibility filters -> hybrid score
 * (request model + collaborative filtering + content-based profile) -> top
 * pick + reasons + alternatives. Request weights live in
 * model/vehicle_ranker.json (produced by training/train.py); CF/CB artifacts
 * in model/recommender.json (produced by training/recommender.py) — when a
 * component is unavailable the others still respond.
 *
 * Vehicles are read fresh from the DB on every request, so fleet add/remove/
 * status changes are reflected immediately without retraining.
 */

$user = require_login();
require_role($user, ['superadmin', 'admin', 'driver_management_head', 'reservation_officer', 'customer']);
$pdo = db();

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'POST') {
    json_error('Method not allowed.', 405);
}

$data = body_json();
$action = trim((string)($data['action'] ?? ''));

// ---------------------------------------------------------------------------
// Behavior capture — raw observation store (training/gate.py decides eligibility)
// ---------------------------------------------------------------------------

// Signature of a recommendation request: used to dedupe the modal's debounced
// re-fetches so one logical exposure produces one row.
function ai_exposure_signature(array $trip, string $email, int $passengers, ?float $budget, ?string $luggageSize, ?string $preferredType): string
{
    $parts = [
        strtolower(trim($email)),
        $trip['pickupDate'],
        $trip['returnDate'],
        (string)$passengers,
        $budget !== null ? number_format($budget, 2, '.', '') : '',
        (string)($luggageSize ?? ''),
        (string)($preferredType ?? ''),
    ];
    return hash('sha256', implode('|', $parts));
}

// Inserts (or reuses) the exposure row for this request. Returns log_id.
function ai_log_exposure(PDO $pdo, array $trip, string $email, ?int $clientId, int $passengers,
                         int $days, ?float $budget, ?string $luggageSize, ?string $preferredType,
                         array $shownIds, ?int $topVehicleId, int $modelVersion): int
{
    $signature = ai_exposure_signature($trip, $email, $passengers, $budget, $luggageSize, $preferredType);

    $stmt = $pdo->prepare(
        'SELECT log_id FROM recommendation_logs
          WHERE signature = ? AND created_at > (NOW() - INTERVAL 60 MINUTE)
          ORDER BY log_id DESC LIMIT 1'
    );
    $stmt->execute([$signature]);
    $row = $stmt->fetch();
    if ($row) {
        return (int)$row['log_id'];
    }

    $stmt = $pdo->prepare(
        'INSERT INTO recommendation_logs
            (signature, client_id, email, passengers, days, budget, luggage_size,
             preferred_type, shown_ids, top_vehicle_id, model_version, label_status, interaction_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "raw", "unknown")'
    );
    $stmt->execute([
        $signature,
        $clientId,
        $email,
        $passengers,
        $days,
        $budget,
        $luggageSize,
        $preferredType,
        json_encode(array_values($shownIds)),
        $topVehicleId,
        $modelVersion,
    ]);
    return (int)$pdo->lastInsertId();
}

// Records the customer's pick against a logged exposure. The row stays raw;
// only the training gate may ever promote it.
function ai_handle_log_choice(PDO $pdo, array $user, array $data): void
{
    $logId = (int)($data['logId'] ?? 0);
    $vehicleId = (int)($data['vehicleId'] ?? 0);
    $pickedFrom = trim((string)($data['pickedFrom'] ?? ''));
    if (!in_array($pickedFrom, ['recommended', 'alternative'], true)) {
        $pickedFrom = null;
    }

    if ($logId <= 0 || $vehicleId <= 0) {
        json_error('logId and vehicleId are required.', 422);
    }

    $stmt = $pdo->prepare('SELECT * FROM recommendation_logs WHERE log_id = ? LIMIT 1');
    $stmt->execute([$logId]);
    $log = $stmt->fetch();
    if (!$log) {
        json_error('Unknown recommendation log.', 404);
    }

    // Customers may only annotate their own exposures; staff may annotate any.
    if (($user['role'] ?? '') === 'customer') {
        $stmt = $pdo->prepare('SELECT client_id FROM clients WHERE user_id = ? LIMIT 1');
        $stmt->execute([(int)$user['user_id']]);
        $own = $stmt->fetch();
        if (!$own || (int)$own['client_id'] !== (int)$log['client_id']) {
            json_error('This recommendation belongs to another client.', 403);
        }
    }

    $shown = json_decode((string)$log['shown_ids'], true);
    if (!is_array($shown) || !in_array($vehicleId, array_map('intval', $shown), true)) {
        json_error('Vehicle was not part of this recommendation.', 422);
    }

    $rank = array_search($vehicleId, array_map('intval', $shown), true);
    $stmt = $pdo->prepare(
        'UPDATE recommendation_logs
            SET chosen_vehicle_id = ?, chosen_rank = ?, picked_from = ?, chosen_at = NOW()
          WHERE log_id = ?'
    );
    $stmt->execute([$vehicleId, $rank !== false ? $rank + 1 : null, $pickedFrom, $logId]);

    json_out(['ok' => true, 'logId' => $logId]);
}

if ($action === 'log_choice') {
    ai_handle_log_choice($pdo, $user, $data);
}
if ($action !== 'recommend') {
    json_error('Action must be one of: recommend, log_choice.', 422);
}

// ---------------------------------------------------------------------------
// Model loading
// ---------------------------------------------------------------------------

const AI_MODEL_FILE = __DIR__ . '/model/vehicle_ranker.json';

const AI_FEATURES = [
    'seat_sufficient', 'seat_gap', 'seat_class_match', 'type_match', 'within_budget',
    'relative_cost', 'budget_utilization', 'luggage_margin', 'year_norm',
];

// Used when model/vehicle_ranker.json is absent or unreadable.
function ai_default_model(): array
{
    $n = count(AI_FEATURES);
    $coef = array_fill(0, $n, 0.0);
    $idx = array_flip(AI_FEATURES);
    $coef[$idx['seat_sufficient']]   = 1.60;
    $coef[$idx['seat_gap']]          = -1.80;
    $coef[$idx['seat_class_match']]  = 1.00;
    $coef[$idx['type_match']]        = 1.20;
    $coef[$idx['within_budget']]     = 1.40;
    $coef[$idx['relative_cost']]     = -1.10;
    $coef[$idx['budget_utilization']] = -0.60;
    $coef[$idx['luggage_margin']]    = 0.70;
    $coef[$idx['year_norm']]         = 0.40;

    return [
        'version' => 0,
        'trained_at' => null,
        'features' => AI_FEATURES,
        'mean' => array_fill(0, $n, 0.0),
        'scale' => array_fill(0, $n, 1.0),
        'coefficients' => $coef,
        'intercept' => 0.0,
        'metrics' => [],
        'source' => 'default',
    ];
}

function ai_load_model(): array
{
    if (!is_readable(AI_MODEL_FILE)) {
        return ai_default_model();
    }
    $raw = json_decode((string)file_get_contents(AI_MODEL_FILE), true);
    if (!is_array($raw) || !isset($raw['features'], $raw['coefficients'], $raw['mean'], $raw['scale'])) {
        return ai_default_model();
    }
    if ($raw['features'] !== AI_FEATURES || count($raw['coefficients']) !== count(AI_FEATURES)) {
        return ai_default_model(); // feature set changed -> retrain before use
    }
    $raw['source'] = 'trained';
    return $raw;
}

// ---------------------------------------------------------------------------
// Hybrid recommender loading (CF factors + CB profile weights from
// model/recommender.json, produced by training/recommender.py)
// ---------------------------------------------------------------------------

const AI_REC_FILE = __DIR__ . '/model/recommender.json';

const AI_W_REQ = 0.5; // hybrid component weights
const AI_W_CF = 0.3;
const AI_W_CB = 0.2;

function ai_load_recommender(): ?array
{
    if (!is_readable(AI_REC_FILE)) {
        return null;
    }
    $raw = json_decode((string)file_get_contents(AI_REC_FILE), true);
    return is_array($raw) && isset($raw['status']) ? $raw : null;
}

function ai_cf_ready(?array $rec): bool
{
    return is_array($rec)
        && ($rec['status'] ?? '') === 'ok'
        && !empty($rec['cf']['users'])
        && !empty($rec['cf']['vehicles'])
        && isset($rec['cf']['global_mean']);
}

// Identity: a customer maps through their own client row; staff map through
// the email they typed for the client. Mirrors the trainer's client_id keys.
function ai_resolve_client_id(PDO $pdo, array $user, string $email): ?int
{
    if (($user['role'] ?? '') === 'customer') {
        $stmt = $pdo->prepare('SELECT client_id FROM clients WHERE user_id = ? LIMIT 1');
        $stmt->execute([(int)$user['user_id']]);
        $row = $stmt->fetch();
        return $row ? (int)$row['client_id'] : null;
    }
    $e = strtolower(trim($email));
    if ($e === '') {
        return null;
    }
    $stmt = $pdo->prepare(
        'SELECT client_id FROM clients WHERE LOWER(TRIM(email_address)) = ? ORDER BY client_id LIMIT 1'
    );
    $stmt->execute([$e]);
    $row = $stmt->fetch();
    return $row ? (int)$row['client_id'] : null;
}

// Mirrors content_vector() in training/recommender.py (7 dims, L2-normalized).
function ai_content_vector(array $v, float $maxRate): array
{
    $type = (string)$v['vehicle_type'];
    $vec = [
        $type === 'AUV' ? 1.0 : 0.0,
        $type === 'SEDAN' ? 1.0 : 0.0,
        $type === 'L300' ? 1.0 : 0.0,
        min(1.0, (int)$v['seats'] / 18.0),
        min(1.0, (int)$v['luggage_capacity'] / 16.0),
        min(1.0, (float)$v['daily_rate'] / max($maxRate, 1.0)),
        max(0.0, min(1.0, ((int)$v['year'] - 2010) / 15.0)),
    ];
    $n = 0.0;
    foreach ($vec as $x) {
        $n += $x * $x;
    }
    $n = sqrt($n);
    return $n > 0 ? array_map(fn($x) => $x / $n, $vec) : $vec;
}

// CF prediction: clamp(mu + b_u + b_i + dot(p_u, q_i), 0, 1); null when the
// user or vehicle is unknown to the model.
function ai_cf_score(array $cf, int $clientId, int $vehicleId): ?float
{
    $u = $cf['users'][(string)$clientId] ?? null;
    $i = $cf['vehicles'][(string)$vehicleId] ?? null;
    if (!is_array($u) || !is_array($i)) {
        return null;
    }
    $s = (float)$cf['global_mean'] + (float)$u['bias'] + (float)$i['bias'];
    foreach ((array)$u['factors'] as $k => $x) {
        $s += (float)$x * (float)(((array)$i['factors'])[$k] ?? 0.0);
    }
    return max(0.0, min(1.0, $s));
}

// Cosine between the client's normalized history profile and a vehicle vector.
function ai_cb_score(?array $profile, array $vec): ?float
{
    if ($profile === null) {
        return null;
    }
    $dot = 0.0;
    foreach ($vec as $j => $x) {
        $dot += (float)($profile[$j] ?? 0.0) * (float)$x;
    }
    return max(0.0, min(1.0, $dot));
}

// ---------------------------------------------------------------------------
// Request normalization + validation (mirrors the modal's missing-field rules)
// ---------------------------------------------------------------------------

$trip = is_array($data['trip'] ?? null) ? $data['trip'] : [];
$client = is_array($data['client'] ?? null) ? $data['client'] : [];

$trip['destination'] = trim((string)($trip['destination'] ?? ''));
$trip['pickupDate'] = trim((string)($trip['pickupDate'] ?? ''));
$trip['pickupTime'] = trim((string)($trip['pickupTime'] ?? ''));
$trip['returnDate'] = trim((string)($trip['returnDate'] ?? ''));
$trip['returnTime'] = trim((string)($trip['returnTime'] ?? ''));
$client['name'] = trim((string)($client['name'] ?? ''));
$client['contact'] = trim((string)($client['contact'] ?? ''));
$client['email'] = trim((string)($client['email'] ?? ''));

$passengers = max(0, (int)($data['passengers'] ?? 0));
$budget = ($data['budget'] ?? null) !== null && $data['budget'] !== ''
    ? max(0, (float)$data['budget'])
    : null;
$preferredType = trim((string)($data['preferredType'] ?? ''));
$preferredType = in_array($preferredType, ['AUV', 'SEDAN', 'L300'], true) ? $preferredType : null;
$luggageSize = strtolower(trim((string)($data['luggageSize'] ?? '')));
$luggageSize = in_array($luggageSize, ['small', 'medium', 'large'], true) ? $luggageSize : null;
$needDriver = trim((string)($data['needDriver'] ?? ''));
$needDriver = in_array($needDriver, ['yes', 'no'], true) ? $needDriver : null;
$selectedVehicleId = (int)($data['selectedVehicleId'] ?? 0) ?: null;

$missing = [];
if ($client['name'] === '') $missing[] = ['field' => 'Client Name', 'message' => 'Client name is required.'];
if ($client['contact'] === '') $missing[] = ['field' => 'Contact Number', 'message' => 'Contact number is required.'];
if ($client['email'] === '') $missing[] = ['field' => 'Email Address', 'message' => 'Email address is required.'];
if ($trip['destination'] === '') $missing[] = ['field' => 'Destination', 'message' => 'Destination is required.'];
if ($trip['pickupDate'] === '') $missing[] = ['field' => 'Pickup Date', 'message' => 'Pickup date is required.'];
if ($trip['pickupTime'] === '') $missing[] = ['field' => 'Pickup Time', 'message' => 'Pickup time is required.'];
if ($trip['returnDate'] === '') $missing[] = ['field' => 'Return Date', 'message' => 'Return date is required.'];
if ($trip['pickupDate'] !== '' && $trip['returnDate'] !== '' && $trip['returnDate'] < $trip['pickupDate']) {
    $missing[] = ['field' => 'Trip Dates', 'message' => 'Return date cannot be earlier than pickup date.'];
}
if ($trip['pickupDate'] !== '' && $trip['returnDate'] === $trip['pickupDate'] &&
    $trip['pickupTime'] !== '' && $trip['returnTime'] !== '' && $trip['returnTime'] < $trip['pickupTime']) {
    $missing[] = ['field' => 'Trip Times', 'message' => 'Drop-off time cannot be earlier than pickup time on the same day.'];
}

// A same-day return is assumed so a recommendation is still possible.
$dropoffAssumed = $trip['returnDate'] === '' && $trip['pickupDate'] !== '';
if ($trip['returnDate'] === '' && $trip['pickupDate'] !== '') {
    $trip['returnDate'] = $trip['pickupDate'];
}

$datesOk = $trip['pickupDate'] !== '' && $trip['returnDate'] !== '' && $trip['pickupDate'] <= $trip['returnDate'];
$recommendable = !$missing && $datesOk;

$days = 1;
if ($datesOk) {
    $days = max(1, (int)ceil((strtotime($trip['returnDate']) - strtotime($trip['pickupDate'])) / 86400));
}

// Luggage request in pieces (kept in sync with training/dataset.py).
$luggageRequired = ['small' => 2, 'medium' => 4, 'large' => 6][$luggageSize] ?? 0;

// ---------------------------------------------------------------------------
// Live fleet + schedule data
// ---------------------------------------------------------------------------

$vehicles = $pdo->query(
    'SELECT vehicle_id, car_code, plate_number, model, year, vehicle_type, owner_id, status,
            daily_rate, seats, luggage_capacity
       FROM vehicles ORDER BY vehicle_id'
)->fetchAll();

$fleetMaxRate = 1.0;
foreach ($vehicles as $v) {
    $fleetMaxRate = max($fleetMaxRate, (float)$v['daily_rate']);
}
$contentById = [];
foreach ($vehicles as $v) {
    $contentById[(int)$v['vehicle_id']] = ai_content_vector($v, $fleetMaxRate);
}

$blocking = [];
$dupCandidates = [];
if ($datesOk) {
    $stmt = $pdo->prepare(
        'SELECT r.reservation_id, r.vehicle_id, r.status, r.start_date, r.end_date,
                c.contact_person, c.email_address
           FROM reservations r
           JOIN clients c ON c.client_id = r.client_id
          WHERE r.status NOT IN ("denied", "cancelled")
            AND r.start_date < ?
            AND r.end_date > ?'
    );
    $stmt->execute([$trip['returnDate'], $trip['pickupDate']]);
    $blocking = $stmt->fetchAll();
}

$norm = fn($s) => strtolower(trim(preg_replace('/\s+/', ' ', (string)$s)));

// Right-size band: smallest seating class ceiling (in seats) that can hold
// the party. Mirrors seat_band_ceiling() in training/dataset.py.
function ai_seat_band(int $pax): ?int
{
    if ($pax <= 0) {
        return null;
    }
    foreach ([5, 8, 12, 15, 18] as $ceiling) {
        if ($pax <= $ceiling) {
            return $ceiling;
        }
    }
    return null; // beyond every ceiling: no cap applies
}

// ---------------------------------------------------------------------------
// Hard filters: only genuinely bookable, feasible vehicles survive
// ---------------------------------------------------------------------------

$overlapFor = function (int $vehicleId) use ($blocking) {
    return array_filter($blocking, fn($b) => (int)$b['vehicle_id'] === $vehicleId);
};

$candidates = [];
$checked = 0;
foreach ($vehicles as $v) {
    $checked++;
    if ($v['status'] !== 'available') continue;                    // maintenance / reserved / on_trip
    if ($datesOk && $overlapFor((int)$v['vehicle_id'])) continue;   // booked for these dates
    if ($passengers > 0 && (int)$v['seats'] < $passengers) continue; // seating capacity
    if ($luggageRequired > 0 && (int)$v['luggage_capacity'] < $luggageRequired) continue; // luggage fit
    $total = (float)$v['daily_rate'] * $days;
    if ($budget !== null && $total > $budget) continue;            // budget ceiling
    $candidates[] = $v;
}

// ---------------------------------------------------------------------------
// Right-size band: never oversize when a tighter class fits
// ---------------------------------------------------------------------------

$bandMax = ai_seat_band($passengers);
$pool = $candidates;
$bandApplied = false;
$smallestFit = false;
if ($candidates && $passengers > 0) {
    if ($bandMax !== null) {
        $inBand = array_values(array_filter($candidates, fn($v) => (int)$v['seats'] <= $bandMax));
        if ($inBand) {
            $pool = $inBand;   // rank only inside the preferred class
            $bandApplied = true;
        } else {
            $smallestFit = true; // budget/luggage excluded the class: smallest that fits
        }
    } else {
        $smallestFit = true;   // party larger than any band cap: smallest that fits
    }
}
$seatBandMode = !$candidates ? 'none' : ($bandApplied ? 'band' : 'smallest-fit');

// ---------------------------------------------------------------------------
// Feature extraction (must match training/train.py exactly)
// ---------------------------------------------------------------------------

function ai_features(array $v, array $ctx): array
{
    $seats = (int)$v['seats'];
    $cap = (int)$v['luggage_capacity'];
    $rate = (float)$v['daily_rate'];
    $p = $ctx['passengers'];
    $type = (string)$v['vehicle_type'];
    $band = $ctx['bandMax'];

    // Absolute extra seats beyond the party (capped at 10): a 12-seater for
    // 2 people scores 1.0 while a 5-seater scores 0.3.
    $gap = $p > 0 ? max(0.0, min(1.0, ($seats - $p) / 10.0)) : 0.35;
    if ($p <= 0 || $band === null) {
        $classMatch = 0.5; // no party size -> no right-size band to match
    } else {
        $classMatch = $seats <= $band ? 1.0 : 0.0;
    }

    if ($ctx['budget'] !== null && $ctx['budget'] > 0) {
        $util = max(0.0, min(1.5, ($rate * $ctx['days']) / $ctx['budget'])) / 1.5;
    } else {
        $util = 0.5;
    }

    if ($ctx['luggageRequired'] > 0 && $cap > 0) {
        $margin = max(0.0, min(1.0, ($cap - $ctx['luggageRequired']) / max($cap, 1)));
    } else {
        $margin = 0.5;
    }

    return [
        'seat_sufficient' => ($p <= 0 || $seats >= $p) ? 1.0 : 0.0,
        'seat_gap' => $gap,
        'seat_class_match' => $classMatch,
        'type_match' => $ctx['preferredType'] === null ? 0.5 : ($ctx['preferredType'] === $type ? 1.0 : 0.0),
        'within_budget' => ($ctx['budget'] === null || $rate * $ctx['days'] <= $ctx['budget']) ? 1.0 : 0.0,
        'relative_cost' => min(2.0, $rate / $ctx['fleetMaxRate']),
        'budget_utilization' => $util,
        'luggage_margin' => $margin,
        'year_norm' => max(0.0, min(1.0, ((int)$v['year'] - 2010) / 15)),
    ];
}

function ai_score(array $raw, array $model): array
{
    $z = [];
    foreach (AI_FEATURES as $i => $f) {
        $scale = (float)($model['scale'][$i] ?? 0) ?: 1.0;
        $z[$f] = ((float)$raw[$f] - (float)($model['mean'][$i] ?? 0.0)) / $scale;
    }
    $logit = (float)$model['intercept'];
    foreach (AI_FEATURES as $i => $f) {
        $logit += (float)$model['coefficients'][$i] * $z[$f];
    }
    $score = 1.0 / (1.0 + exp(-max(-30.0, min(30.0, $logit))));

    $contrib = [];
    foreach (AI_FEATURES as $i => $f) {
        $contrib[$f] = (float)$model['coefficients'][$i] * $z[$f];
    }
    return ['score' => $score, 'contrib' => $contrib];
}

// ---------------------------------------------------------------------------
// Score candidates
// ---------------------------------------------------------------------------

$ctx = [
    'passengers' => $passengers,
    'days' => $days,
    'budget' => $budget,
    'luggageRequired' => $luggageRequired,
    'preferredType' => $preferredType,
    'needDriver' => $needDriver,
    'fleetMaxRate' => $fleetMaxRate,
    'bandMax' => $bandMax,
    'seatBandMode' => $seatBandMode,
];

$model = ai_load_model();

// Hybrid identity: who is asking (client_id from session or typed email).
$rec = ai_load_recommender();
$cfReady = ai_cf_ready($rec);
$clientId = ai_resolve_client_id($pdo, $user, $client['email']);

// CB profile: weighted sum of the client's known vehicles' content vectors.
$cbWeights = $clientId !== null && isset($rec['cb']['interactions'][(string)$clientId])
    ? (array)$rec['cb']['interactions'][(string)$clientId]
    : null;
$historyCount = is_array($cbWeights) ? count($cbWeights) : 0;
$cbProfile = null;
if ($historyCount > 0) {
    $prof = array_fill(0, 7, 0.0);
    $any = false;
    foreach ($cbWeights as $vid => $w) {
        $vec = $contentById[(int)$vid] ?? null;
        if ($vec === null) {
            continue; // vehicle removed from the fleet
        }
        foreach ($vec as $j => $x) {
            $prof[$j] += (float)$w * (float)$x;
        }
        $any = true;
    }
    $n = 0.0;
    foreach ($prof as $x) {
        $n += $x * $x;
    }
    $n = sqrt($n);
    if ($any && $n > 0) {
        $cbProfile = array_map(fn($x) => $x / $n, $prof);
    }
}

$cfActive = $cfReady && $clientId !== null && isset($rec['cf']['users'][(string)$clientId]);
$cbActive = $cbProfile !== null;
$hybridActive = $cfActive || $cbActive;

$scored = [];
foreach ($pool as $v) {
    $s = ai_score(ai_features($v, $ctx), $model);
    $sReq = $s['score'];
    $sCf = $cfActive ? ai_cf_score($rec['cf'], $clientId, (int)$v['vehicle_id']) : null;
    $sCb = $cbActive ? ai_cb_score($cbProfile, $contentById[(int)$v['vehicle_id']]) : null;

    // s_hybrid = sum(w * s) / sum(w) over available components. With CF and
    // CB inactive this collapses to exactly sReq (request-only behavior).
    $num = AI_W_REQ * $sReq;
    $den = AI_W_REQ;
    if ($sCf !== null) {
        $num += AI_W_CF * $sCf;
        $den += AI_W_CF;
    }
    if ($sCb !== null) {
        $num += AI_W_CB * $sCb;
        $den += AI_W_CB;
    }
    $hybrid = $den > 0 ? $num / $den : $sReq;

    $scored[] = [
        'vehicle' => $v,
        'score' => $sReq,
        'hybrid' => $hybrid,
        's_cf' => $sCf,
        's_cb' => $sCb,
        'contrib' => $s['contrib'],
    ];
}
// Ranking: hard filters and the seat band already restricted the pool.
// When the hybrid is active it is the primary rank; the deterministic chain
// (leanest fit -> preferred type -> cheapest -> request score) breaks ties.
// Request-only runs keep the original deterministic order exactly.
usort($scored, function ($a, $b) use ($preferredType, $hybridActive) {
    if ($hybridActive) {
        $c = $b['hybrid'] <=> $a['hybrid'];
        if ($c !== 0) return $c;
    }
    $c = (int)$a['vehicle']['seats'] <=> (int)$b['vehicle']['seats'];
    if ($c !== 0) return $c;
    if ($preferredType !== null) {
        $ma = $a['vehicle']['vehicle_type'] === $preferredType ? 1 : 0;
        $mb = $b['vehicle']['vehicle_type'] === $preferredType ? 1 : 0;
        $c = $mb <=> $ma;
        if ($c !== 0) return $c;
    }
    $c = (float)$a['vehicle']['daily_rate'] <=> (float)$b['vehicle']['daily_rate'];
    if ($c !== 0) return $c;
    return $b['score'] <=> $a['score'];
});

function ai_vehicle_shape(array $v, int $days, float $score): array
{
    return [
        'id' => (int)$v['vehicle_id'],
        'carCode' => vehicle_car_code($v),
        'plate' => $v['plate_number'],
        'type' => $v['vehicle_type'],
        'model' => $v['model'],
        'year' => (int)$v['year'],
        'seats' => (int)$v['seats'],
        'luggageCapacity' => (int)$v['luggage_capacity'],
        'dailyRate' => (float)$v['daily_rate'],
        'status' => 'Available',
        'rentalDays' => $days,
        'estimatedTotal' => round((float)$v['daily_rate'] * $days, 2),
        'scorePct' => (int)round($score * 100),
    ];
}

// ---------------------------------------------------------------------------
// Human-readable reasons (top positive contributions -> templates)
// ---------------------------------------------------------------------------

function ai_reasons(array $entry, array $ctx, array $trip, ?array $rec): array
{
    $v = $entry['vehicle'];
    $contrib = $entry['contrib'];
    $reasons = [];

    $reasons[] = $trip['pickupDate'] === $trip['returnDate']
        ? "Available on {$trip['pickupDate']} (status Available, no overlapping bookings)."
        : "Available for {$trip['pickupDate']} → {$trip['returnDate']} (status Available, no overlapping bookings).";

    if ($ctx['passengers'] > 0) {
        $reasons[] = $ctx['seatBandMode'] === 'smallest-fit'
            ? (int)$v['seats'] . ' seats for ' . $ctx['passengers'] . ' passenger(s) — the smallest available vehicle that fits.'
            : (int)$v['seats'] . ' seats for ' . $ctx['passengers'] . ' passenger(s)'
                . ($ctx['bandMax'] !== null ? " — right-sized (within the ≤{$ctx['bandMax']}-seat class)." : '.');
    }

    $templates = [];
    if ($ctx['preferredType'] !== null && $contrib['type_match'] > 0) {
        $templates['type_match'] = ["Matches your preferred vehicle type ({$v['vehicle_type']}).", $contrib['type_match']];
    }
    if ($ctx['budget'] !== null && $contrib['within_budget'] > 0) {
        $total = number_format((float)$v['daily_rate'] * $ctx['days'], 0, '.', ',');
        $b = number_format($ctx['budget'], 0, '.', ',');
        $templates['within_budget'] = ["Estimated ₱{$total} for {$ctx['days']} day(s) fits your ₱{$b} budget.", $contrib['within_budget']];
    }
    if ($ctx['luggageRequired'] > 0 && $contrib['luggage_margin'] > 0) {
        $cap = (int)$v['luggage_capacity'];
        $templates['luggage_margin'] = ["{$cap}-piece luggage capacity covers the requested luggage.", $contrib['luggage_margin']];
    }
    if ($contrib['relative_cost'] > 0) {
        $rate = number_format((float)$v['daily_rate'], 0, '.', ',');
        $templates['relative_cost'] = ["Competitive rate at ₱{$rate}/day versus the rest of the fleet.", $contrib['relative_cost']];
    }
    if ($contrib['seat_gap'] > 0.05) {
        $templates['seat_gap'] = ['No wasted seats — the leanest fit among the remaining options.', $contrib['seat_gap']];
    }
    if ($contrib['year_norm'] > 0.05) {
        $templates['year_norm'] = ["Recent model year ({$v['year']}).", $contrib['year_norm']];
    }

    uasort($templates, fn($a, $b) => $b[1] <=> $a[1]);
    foreach (array_slice(array_keys($templates), 0, 3) as $k) {
        $reasons[] = $templates[$k][0];
    }

    // Hybrid evidence (factual, only when the corresponding score is strong).
    if ($entry['s_cb'] !== null && $entry['s_cb'] >= 0.55) {
        $reasons[] = 'Matches vehicles you have booked before.';
    }
    if ($entry['s_cf'] !== null && $rec !== null) {
        $vid = (string)(int)$v['vehicle_id'];
        if ((int)($rec['vehicle_popularity'][$vid] ?? 0) >= 1) {
            $reasons[] = 'Clients with similar booking history also chose this vehicle.';
        }
    }

    if ($ctx['needDriver'] === 'no') {
        $reasons[] = 'Self-drive requested — a driver’s license image will be required to confirm.';
    }

    return $reasons;
}

// ---------------------------------------------------------------------------
// Warnings for the currently selected vehicle + duplicate booking detection
// ---------------------------------------------------------------------------

$warnings = [];
if ($selectedVehicleId) {
    $sel = null;
    foreach ($vehicles as $v) {
        if ((int)$v['vehicle_id'] === $selectedVehicleId) { $sel = $v; break; }
    }
    if ($sel && $sel['status'] !== 'available') {
        $warnings[] = 'Selected vehicle is currently ' . vehicle_gui_status($sel['status']) . ' and cannot be booked.';
    }
    if ($datesOk) {
        foreach ($overlapFor($selectedVehicleId) as $b) {
            $warnings[] = "Selected vehicle has an overlapping booking (BK-" . substr($b['start_date'], 0, 4)
                . '-' . str_pad((string)$b['reservation_id'], 4, '0', STR_PAD_LEFT) . ') for '
                . $b['start_date'] . ' → ' . $b['end_date'] . ' (' . ucwords(str_replace('_', ' ', $b['status'])) . ').';
        }
    }
    if ($passengers > 0 && $sel && (int)$sel['seats'] < $passengers) {
        $warnings[] = 'Selected vehicle has ' . (int)$sel['seats'] . ' seats, fewer than the ' . $passengers . ' passenger(s).';
    }
}

$duplicates = [];
if ($datesOk) {
    foreach ($blocking as $b) {
        $sameClient = ($norm($b['contact_person']) !== '' && $norm($b['contact_person']) === $norm($client['name']))
            || ($norm($b['email_address']) !== '' && $norm($b['email_address']) === $norm($client['email']));
        if (!$sameClient) continue;
        $duplicates[] = [
            'id' => 'BK-' . substr($b['start_date'], 0, 4) . '-' . str_pad((string)$b['reservation_id'], 4, '0', STR_PAD_LEFT),
            'clientName' => $b['contact_person'],
            'status' => ucwords(str_replace('_', ' ', $b['status'])),
        ];
    }
}

// ---------------------------------------------------------------------------
// Response assembly
// ---------------------------------------------------------------------------

$recommended = null;
$reasons = [];
$alternatives = [];
$recommendation = '';

if (!$recommendable) {
    $recommendation = $missing
        ? 'Complete the client details and trip dates above to receive a vehicle recommendation.'
        : 'Complete the trip dates to receive a vehicle recommendation.';
} elseif (!$scored) {
    $recommendation = $budget !== null || $luggageRequired > 0 || $passengers > 0
        ? 'No available vehicle currently satisfies all of the requirements (dates, capacity'
            . ($passengers > 0 ? ', passengers' : '')
            . ($luggageRequired > 0 ? ', luggage' : '')
            . ($budget !== null ? ', budget' : '') . ').'
        : 'No vehicles are currently available for the selected trip dates.';
} else {
    $best = $scored[0];
    $recommended = ai_vehicle_shape($best['vehicle'], $days, $best['hybrid']);
    $reasons = ai_reasons($best, $ctx, $trip, $rec);

    $summaryBits = array_slice($reasons, 1, 3);
    $recommendation = "Recommended vehicle: {$recommended['type']} ({$recommended['plate']}) because it is available for your dates, "
        . ($passengers > 0 ? "fits {$passengers} passenger(s), " : '')
        . 'and best matches your preferences (' . implode('; ', array_map(fn($r) => rtrim($r, '.'), $summaryBits)) . ').';
    if ($dropoffAssumed) {
        $recommendation .= ' (Assuming a same-day return — add the drop-off date to refine this.)';
    }

    foreach (array_slice($scored, 1, 3) as $alt) {
        $alternatives[] = ai_vehicle_shape($alt['vehicle'], $days, $alt['hybrid']);
    }
}

// Exposure logging: a produced recommendation is recorded as a RAW observation.
// training/gate.py alone decides whether it ever becomes training data.
$logId = null;
if ($recommended !== null) {
    $shownIds = array_map(fn($e) => (int)$e['vehicle']['vehicle_id'], $scored);
    $logId = ai_log_exposure(
        $pdo, $trip, $client['email'], $clientId, $passengers, $days, $budget,
        $luggageSize, $preferredType, $shownIds,
        $scored ? (int)$scored[0]['vehicle']['vehicle_id'] : null,
        (int)($model['version'] ?? 0)
    );
}

json_out([
    'logId' => $logId,
    'missing' => $missing,
    'warnings' => $warnings,
    'duplicates' => $duplicates,
    'recommendedVehicle' => $recommended,
    'reasons' => $reasons,
    'alternatives' => $alternatives,
    'recommendation' => $recommendation,
    'ready' => !$missing && $recommended !== null,
    'candidateCount' => count($scored),
    'checkedCount' => $checked,
    'tripDays' => $days,
    'seatBand' => $passengers > 0 ? [
        'min' => $passengers,
        'max' => $bandMax,
        'mode' => $seatBandMode,
    ] : null,
    'model' => [
        'source' => $model['source'],
        'version' => (int)($model['version'] ?? 0),
        'trainedAt' => $model['trained_at'] ?? null,
        'accuracy' => isset($model['metrics']['top1_accuracy']) ? round((float)$model['metrics']['top1_accuracy'], 3) : null,
        'components' => [
            'request' => true,
            'collaborative' => [
                'available' => $cfActive,
                'status' => (string)($rec['status'] ?? 'missing'),
            ],
            'content' => [
                'available' => $cbActive,
                'historyCount' => $historyCount,
            ],
        ],
    ],
]);
