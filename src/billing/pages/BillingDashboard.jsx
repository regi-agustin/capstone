import { useEffect, useMemo, useState } from 'react';
import { ReceiptText, Wallet, CircleDollarSign, Eye, PenLine, CreditCard, Clock3, SearchX } from 'lucide-react';
import { useBilling } from '../context/BillingContext.jsx';
import { fetchInvoices, updateInvoice, recordPayment } from '../services/billingService.js';
import SummaryCard from '../../ro/components/SummaryCard.jsx';
import SearchBar from '../../ro/components/SearchBar.jsx';
import StatusBadge from '../../ro/components/StatusBadge.jsx';
import Modal from '../../ro/components/Modal.jsx';
import Notification from '../components/Notification.jsx';
import { formatMoney, formatDate } from '../../ro/utils/format.js';

const STATUS_FILTERS = ['All', 'Draft', 'Partial', 'Paid'];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'gcash', label: 'GCash' },
  { value: 'check', label: 'Check' },
  { value: 'online', label: 'Online' },
];

const DetailItem = ({ label, value }) => (
  <div className="detail-item">
    <div className="detail-item__label">{label}</div>
    <div className="detail-item__value">{value || '—'}</div>
  </div>
);

function RecordPaymentModal({ invoice, onClose, onRecord }) {
  const [amount, setAmount] = useState(String(invoice?.balance || ''));
  const [method, setMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value <= 0) return;
    setSaving(true);
    try {
      await onRecord({ id: invoice.id, amountPaid: value, method, reference });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={Boolean(invoice)} onClose={onClose} title="Record Payment" subtitle={invoice ? `${invoice.client?.name} — ${invoice.invoiceNumber}` : ''}>
      <form onSubmit={submit}>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="pay-amount">Amount Paid (₱)</label>
            <input id="pay-amount" className="form-input" type="number" step="0.01" min="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
            <div className="form-hint">Outstanding balance: {formatMoney(invoice?.balance)}</div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="pay-method">Payment Method</label>
            <select id="pay-method" className="form-select" value={method} onChange={(e) => setMethod(e.target.value)}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-group" style={{ marginTop: 16 }}>
          <label className="form-label" htmlFor="pay-ref">Reference Number</label>
          <input id="pay-ref" className="form-input" type="text" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional (OR #, transfer ref, etc.)" />
        </div>
        <div className="bill-preview">
          <span>Balance after this payment</span>
          <strong>{formatMoney(Math.max(0, (invoice?.balance || 0) - (Number(amount) || 0)))}</strong>
        </div>
        <div className="modal__footer">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={saving || !(Number(amount) > 0)}>
            {saving ? 'Recording…' : 'Record Payment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditInvoiceModal({ invoice, onClose, onSave }) {
  const [amount, setAmount] = useState(String(invoice?.amount ?? ''));
  const [vat, setVat] = useState(String(invoice?.vat ?? ''));
  const [saving, setSaving] = useState(false);

  const total = (Number(amount) || 0) + (Number(vat) || 0);

  const submit = async (e) => {
    e.preventDefault();
    if (total <= 0) return;
    setSaving(true);
    try {
      await onSave({ id: invoice.id, amount: Number(amount), vat: Number(vat) });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={Boolean(invoice)} onClose={onClose} title="Edit Invoice Details" subtitle={invoice ? `${invoice.invoiceNumber} — adjust pricing and fees` : ''}>
      <form onSubmit={submit}>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="edit-amount">Rental Amount (₱)</label>
            <input id="edit-amount" className="form-input" type="number" step="0.01" min="0" required value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-vat">VAT (12%) (₱)</label>
            <input id="edit-vat" className="form-input" type="number" step="0.01" min="0" required value={vat} onChange={(e) => setVat(e.target.value)} />
          </div>
        </div>
        <div className="bill-preview">
          <span>Total invoice amount</span>
          <strong>{formatMoney(total)}</strong>
        </div>
        <div className="modal__footer">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={saving || total <= 0}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function InvoiceDetailsModal({ invoice, onClose }) {
  if (!invoice) return null;
  return (
    <Modal open onClose={onClose} title={`Invoice Details — ${invoice.invoiceNumber}`} subtitle={`Booking ${invoice.bookingId || '—'} · Issued ${formatDate(invoice.invoiceDate)}`} size="lg">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: 16 }}>
        <div className="status-hero">
          Invoice Status: <StatusBadge status={invoice.status} />
        </div>
        <div className="muted" style={{ fontSize: 13 }}>
          Reservation: {invoice.reservationStatus} · Driver: {invoice.driverName || '—'}
        </div>
      </div>
      <div className="form-section">
        <div className="form-section__title" style={{ marginBottom: 12 }}>
          <ReceiptText size={16} style={{ color: 'var(--primary)' }} /> Client Information
        </div>
        <div className="detail-grid">
          <DetailItem label="Client Name" value={invoice.client?.name} />
          <DetailItem label="Contact Number" value={invoice.client?.contact} />
          <DetailItem label="Email" value={invoice.client?.email} />
        </div>
      </div>
      <div className="form-section">
        <div className="form-section__title" style={{ marginBottom: 12 }}>
          <ReceiptText size={16} style={{ color: 'var(--primary)' }} /> Trip Information
        </div>
        <div className="detail-grid">
          <DetailItem label="Destination" value={invoice.trip?.destination} />
          <DetailItem label="Pickup Date" value={formatDate(invoice.trip?.pickupDate)} />
          <DetailItem label="Return Date" value={formatDate(invoice.trip?.returnDate)} />
          <DetailItem label="Vehicle" value={invoice.vehicleLabel ? `${invoice.vehicleLabel.type} · ${invoice.vehicleLabel.plateNumber}` : '—'} />
        </div>
      </div>
      <div className="form-section">
        <div className="form-section__title" style={{ marginBottom: 12 }}>
          <Wallet size={16} style={{ color: 'var(--primary)' }} /> Amounts
        </div>
        <div className="detail-grid">
          <DetailItem label="Rental Amount" value={formatMoney(invoice.amount)} />
          <DetailItem label="VAT (12%)" value={formatMoney(invoice.vat)} />
          <DetailItem label="Total Amount" value={formatMoney(invoice.totalAmount)} />
          <DetailItem label="Paid" value={formatMoney(invoice.paidAmount)} />
          <DetailItem label="Balance" value={formatMoney(invoice.balance)} />
        </div>
      </div>
    </Modal>
  );
}

export default function BillingDashboard() {
  const { notify } = useBilling();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [paying, setPaying] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetchInvoices()
      .then((rows) => { if (mounted) setInvoices(rows); })
      .catch((e) => { if (mounted) notify('error', e.message || 'Unable to load invoices.'); })
      .finally(() => { if (mounted) setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (statusFilter !== 'All' && inv.status !== statusFilter) return false;
      if (!q) return true;
      return [inv.invoiceNumber, inv.bookingId, inv.client?.name, inv.client?.contact, inv.vehicleLabel?.plateNumber, inv.trip?.destination]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [invoices, query, statusFilter]);

  const summary = useMemo(() => {
    const totalBilled = invoices.reduce((s, i) => s + i.totalAmount, 0);
    const collected = invoices.reduce((s, i) => s + i.paidAmount, 0);
    const outstanding = invoices.reduce((s, i) => s + i.balance, 0);
    const unpaid = invoices.filter((i) => i.status !== 'Paid').length;
    return { count: invoices.length, totalBilled, collected, outstanding, unpaid };
  }, [invoices]);

  const patchInvoice = (updated) =>
    setInvoices((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));

  const handleSave = async (payload) => {
    try {
      const updated = await updateInvoice(payload);
      patchInvoice(updated);
      notify('success', `Invoice ${updated.invoiceNumber} updated.`);
    } catch (e) {
      notify('error', e.message);
      throw e;
    }
  };

  const handleRecord = async (payload) => {
    try {
      const updated = await recordPayment(payload);
      patchInvoice(updated);
      notify('success', `Payment of ${formatMoney(payload.amountPaid)} recorded for ${updated.invoiceNumber}.`);
    } catch (e) {
      notify('error', e.message);
      throw e;
    }
  };

  return (
    <div>
      <Notification />

      <div className="stats-grid">
        <SummaryCard icon={<ReceiptText size={22} />} label="Total Invoices" value={summary.count} note={`${summary.unpaid} unpaid`} tone="primary" />
        <SummaryCard icon={<CircleDollarSign size={22} />} label="Total Billed" value={formatMoney(summary.totalBilled)} tone="confirmed" />
        <SummaryCard icon={<Wallet size={22} />} label="Collected" value={formatMoney(summary.collected)} tone="available" />
        <SummaryCard icon={<Clock3 size={22} />} label="Outstanding" value={formatMoney(summary.outstanding)} tone="pending" />
      </div>

      <section className="card">
        <div className="card__header">
          <div>
            <div className="card__title">
              Client Billing List
              <span className="badge badge--neutral">{filtered.length}</span>
            </div>
            <div className="card__subtitle">Invoices, collections, and payment status.</div>
          </div>
        </div>

        <div className="card__body">
          <div className="toolbar" style={{ marginBottom: 16 }}>
            <SearchBar
              value={query}
              onChange={setQuery}
              placeholder="Search invoice #, booking ID, client, vehicle, destination…"
            />
            <div className="filter-tabs" role="tablist" aria-label="Filter by status">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === f}
                  className={`filter-tab${statusFilter === f ? ' filter-tab--active' : ''}`}
                  onClick={() => setStatusFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="loading-state">
              <span className="spinner" /> Loading invoices…
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <SearchX size={36} />
              <div className="empty-state__title">No invoices found</div>
              <div className="empty-state__sub">
                Invoices are generated automatically when a trip is marked done. Try adjusting your filters.
              </div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Client</th>
                    <th>Vehicle</th>
                    <th>Destination</th>
                    <th>Total</th>
                    <th>Paid</th>
                    <th>Balance</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => (
                    <tr key={inv.id}>
                      <td>
                        <div className="cell-main">{inv.invoiceNumber}</div>
                        <div className="cell-sub">{inv.bookingId || '—'} · {formatDate(inv.invoiceDate)}</div>
                      </td>
                      <td>
                        <div className="cell-main">{inv.client?.name || '—'}</div>
                        <div className="cell-sub">{inv.client?.contact || ''}</div>
                      </td>
                      <td>
                        {inv.vehicleLabel ? (
                          <>
                            <div className="cell-main">{inv.vehicleLabel.plateNumber}</div>
                            <div className="cell-sub">{inv.vehicleLabel.type}</div>
                          </>
                        ) : (
                          <span className="cell-muted">—</span>
                        )}
                      </td>
                      <td>{inv.trip?.destination || '—'}</td>
                      <td className="cell-main">{formatMoney(inv.totalAmount)}</td>
                      <td>{formatMoney(inv.paidAmount)}</td>
                      <td style={{ fontWeight: 600, color: inv.balance > 0 ? 'var(--danger)' : 'inherit' }}>
                        {formatMoney(inv.balance)}
                      </td>
                      <td>
                        <StatusBadge status={inv.status} />
                        {inv.status === 'Paid' && (
                          <div className="badge badge--neutral" style={{ marginTop: 4, fontSize: 11 }}>settled</div>
                        )}
                      </td>
                      <td>
                        <div className="actions-row">
                          <button type="button" className="btn btn--secondary btn--sm" onClick={() => setViewing(inv)}>
                            <Eye size={14} /> View
                          </button>
                          <button
                            type="button"
                            className="btn btn--secondary btn--sm"
                            onClick={() => setEditing(inv)}
                            disabled={inv.status === 'Paid' || inv.status === 'Cancelled'}
                            title={inv.status === 'Paid' || inv.status === 'Cancelled' ? 'Only unpaid invoices can be edited' : 'Edit pricing and fees'}
                          >
                            <PenLine size={14} /> Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn--success btn--sm"
                            onClick={() => setPaying(inv)}
                            disabled={inv.status === 'Paid' || inv.status === 'Cancelled'}
                            title={inv.status === 'Paid' || inv.status === 'Cancelled' ? 'No payment needed' : 'Record a payment'}
                          >
                            <CreditCard size={14} /> Pay
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <InvoiceDetailsModal invoice={viewing} onClose={() => setViewing(null)} />
      <EditInvoiceModal invoice={editing} onClose={() => setEditing(null)} onSave={handleSave} />
      <RecordPaymentModal invoice={paying} onClose={() => setPaying(null)} onRecord={handleRecord} />
    </div>
  );
}
