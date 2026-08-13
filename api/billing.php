<?php
require_once __DIR__ . '/helpers.php';

$user = require_login();
require_role($user, ['superadmin', 'admin', 'billing_officer']);

$pdo = db();
$method = $_SERVER['REQUEST_METHOD'];

function billing_select(): string
{
    return 'SELECT b.billing_id, b.invoice_number, b.invoice_date, b.amount, b.vat, b.total_amount, b.status,
                   r.reservation_id, r.trip_code, r.destination, r.start_date, r.end_date, r.status AS reservation_status,
                   c.company_name, c.contact_number, c.email_address,
                   v.plate_number, v.model, v.vehicle_type,
                   d.fullname AS driver_name,
                   (SELECT COALESCE(SUM(p.amount_paid), 0) FROM payments p WHERE p.billing_id = b.billing_id) AS paid_amount
            FROM billing b
            JOIN reservations r ON r.reservation_id = b.reservation_id
            JOIN clients c ON c.client_id = r.client_id
            LEFT JOIN vehicles v ON v.vehicle_id = r.vehicle_id
            LEFT JOIN drivers d ON d.driver_id = r.driver_id';
}

function billing_shape(array $r): array
{
    $total = (float)$r['total_amount'];
    $paid = (float)$r['paid_amount'];
    return [
        'id' => (int)$r['billing_id'],
        'invoiceNumber' => $r['invoice_number'],
        'invoiceDate' => $r['invoice_date'],
        'amount' => (float)$r['amount'],
        'vat' => (float)$r['vat'],
        'totalAmount' => round($total, 2),
        'paidAmount' => round($paid, 2),
        'balance' => round(max(0, $total - $paid), 2),
        'status' => ucwords((string)$r['status']),
        'bookingId' => $r['trip_code'] ?? '',
        'reservationId' => (int)$r['reservation_id'],
        'client' => [
            'name' => $r['company_name'],
            'contact' => $r['contact_number'],
            'email' => $r['email_address'],
        ],
        'vehicleLabel' => $r['plate_number']
            ? ['type' => $r['vehicle_type'], 'plateNumber' => $r['plate_number'], 'model' => $r['model']]
            : null,
        'trip' => [
            'destination' => $r['destination'],
            'pickupDate' => $r['start_date'],
            'returnDate' => $r['end_date'],
        ],
        'driverName' => $r['driver_name'] ?? '',
        'reservationStatus' => ucwords(str_replace('_', ' ', (string)$r['reservation_status'])),
    ];
}

function find_invoice(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare(billing_select() . ' WHERE b.billing_id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

// Recompute billing.status from the payments recorded against it.
function refresh_invoice_status(PDO $pdo, int $billingId): void
{
    $stmt = $pdo->prepare('SELECT total_amount, status FROM billing WHERE billing_id = ?');
    $stmt->execute([$billingId]);
    $b = $stmt->fetch();
    if (!$b) return;

    $pay = $pdo->prepare('SELECT COALESCE(SUM(amount_paid), 0) FROM payments WHERE billing_id = ?');
    $pay->execute([$billingId]);
    $paid = (float)$pay->fetchColumn();

    if ($paid >= (float)$b['total_amount']) {
        if ($b['status'] !== 'paid') {
            $pdo->prepare('UPDATE billing SET status = "paid" WHERE billing_id = ?')->execute([$billingId]);
        }
    } elseif ($paid > 0) {
        if ($b['status'] !== 'partial') {
            $pdo->prepare('UPDATE billing SET status = "partial" WHERE billing_id = ?')->execute([$billingId]);
        }
    } elseif (in_array($b['status'], ['paid', 'partial'], true)) {
        $pdo->prepare('UPDATE billing SET status = "draft" WHERE billing_id = ?')->execute([$billingId]);
    }
}

if ($method === 'GET') {
    $view = $_GET['view'] ?? '';

    if ($view === 'payments') {
        $rows = $pdo->query(
            'SELECT p.payment_id, p.payment_date, p.payment_method, p.amount_paid, p.reference_number, p.status,
                    b.invoice_number, c.company_name
             FROM payments p
             JOIN billing b ON b.billing_id = p.billing_id
             JOIN reservations r ON r.reservation_id = b.reservation_id
             JOIN clients c ON c.client_id = r.client_id
             ORDER BY p.payment_date DESC, p.payment_id DESC'
        )->fetchAll();
        json_out(array_map(fn($p) => [
            'id' => (int)$p['payment_id'],
            'invoiceNumber' => $p['invoice_number'],
            'client' => $p['company_name'],
            'date' => $p['payment_date'],
            'method' => $p['payment_method'],
            'amount' => (float)$p['amount_paid'],
            'reference' => $p['reference_number'] ?? '',
            'status' => ucwords((string)$p['status']),
        ], $rows));
    }

    $rows = $pdo->query(
        billing_select() . '
        ORDER BY FIELD(b.status, "overdue", "partial", "draft", "sent", "paid", "cancelled"),
                 b.invoice_date DESC, b.billing_id DESC'
    )->fetchAll();
    json_out(array_map('billing_shape', $rows));
}

if ($method === 'POST') {
    require_permission($pdo, $user, 'Billing', 'Edit');

    $data = body_json();
    $action = trim((string)($data['action'] ?? ''));
    $id = (int)($data['id'] ?? 0);

    if ($action === 'update') {
        $row = find_invoice($pdo, $id);
        if (!$row) {
            json_error('Invoice not found.', 404);
        }
        if (in_array($row['status'], ['paid', 'cancelled'], true)) {
            json_error('A paid or cancelled invoice cannot be edited.', 422);
        }

        $amount = (float)($data['amount'] ?? $row['amount']);
        $vat = (float)($data['vat'] ?? $row['vat']);
        if ($amount < 0 || $vat < 0) {
            json_error('Amount and VAT cannot be negative.', 422);
        }
        if ($amount + $vat <= 0) {
            json_error('Total invoice amount must be greater than zero.', 422);
        }

        $pdo->prepare('UPDATE billing SET amount = ?, vat = ?, total_amount = ? WHERE billing_id = ?')
            ->execute([$amount, $vat, round($amount + $vat, 2), $id]);
        refresh_invoice_status($pdo, $id);

        json_out(billing_shape(find_invoice($pdo, $id)));
    }

    if ($action === 'payment') {
        $row = find_invoice($pdo, $id);
        if (!$row) {
            json_error('Invoice not found.', 404);
        }
        if ($row['status'] === 'cancelled') {
            json_error('Payments cannot be recorded against a cancelled invoice.', 422);
        }
        if ($row['status'] === 'paid') {
            json_error('This invoice is already fully paid.', 422);
        }

        $amountPaid = (float)($data['amountPaid'] ?? 0);
        $method = trim((string)($data['method'] ?? 'cash'));
        $reference = trim((string)($data['reference'] ?? ''));

        if ($amountPaid <= 0) {
            json_error('Payment amount must be greater than zero.', 422);
        }
        if (!in_array($method, ['cash', 'bank_transfer', 'gcash', 'check', 'online'], true)) {
            json_error('Invalid payment method.', 422);
        }

        $pdo->prepare(
            'INSERT INTO payments (billing_id, payment_date, payment_method, amount_paid, reference_number, status)
             VALUES (?, NOW(), ?, ?, ?, "completed")'
        )->execute([$id, $method, $amountPaid, $reference !== '' ? $reference : null]);

        refresh_invoice_status($pdo, $id);

        json_out(billing_shape(find_invoice($pdo, $id)), 201);
    }

    json_error('Action must be one of: update, payment.', 422);
}

json_error('Method not allowed.', 405);
