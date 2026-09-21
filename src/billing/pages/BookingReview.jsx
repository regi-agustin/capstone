import { useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, UserRoundCheck, ReceiptText, SearchX, Eye, BadgeCheck, XCircle } from 'lucide-react';
import { useBilling } from '../context/BillingContext.jsx';
import { fetchBookings, approveBookingPricing, denyBooking } from '../services/billingService.js';
import SummaryCard from '../../ro/components/SummaryCard.jsx';
import SearchBar from '../../ro/components/SearchBar.jsx';
import StatusBadge from '../../ro/components/StatusBadge.jsx';
import Modal from '../../ro/components/Modal.jsx';
import DenyBookingModal from '../../ro/components/DenyBookingModal.jsx';
import Notification from '../components/Notification.jsx';
import { formatMoney, formatDate } from '../../ro/utils/format.js';

const STATUS_FILTERS = ['All', 'Pending', 'Pricing Approved'];

const DetailItem = ({ label, value }) => (
  <div className="detail-item">
    <div className="detail-item__label">{label}</div>
    <div className="detail-item__value">{value || '—'}</div>
  </div>
);

function ApprovePricingModal({ booking, onClose, onApprove }) {
  const [additionalCharges, setAdditionalCharges] = useState(String(booking?.preBilling?.additionalCharges ?? '0'));
  const [saving, setSaving] = useState(false);

  const rental = Number(booking?.preBilling?.rentalFee || 0) || 0;
  const extra = Number(additionalCharges) || 0;
  const total = rental + extra;

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onApprove({ id: booking.id, additionalCharges: total > 0 ? extra : 0 });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={Boolean(booking)}
      onClose={onClose}
      title="Approve Booking Pricing"
      subtitle={booking ? `${booking.id} — ${booking.client?.name} · ${booking.vehicleLabel?.plateNumber || 'Vehicle TBD'}` : ''}
    >
      <form onSubmit={submit}>
        <div style={{ display: 'grid', gap: 14 }}>
          <div className="bill-preview">
            <span>Daily rate</span>
            <strong>{formatMoney(booking?.preBilling?.baseRate)}</strong>
          </div>
          <div className="bill-preview">
            <span>Trip duration</span>
            <strong>{booking?.trip?.durationLabel}</strong>
          </div>
          <div className="bill-preview">
            <span>Rental fee ({formatMoney(booking?.preBilling?.baseRate)} × {booking?.trip?.days ?? 1} day)</span>
            <strong>{formatMoney(rental)}</strong>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="extra-charges">
              Additional Charges (₱) <span className="req">(editable)</span>
            </label>
            <input
              id="extra-charges"
              className="form-input"
              type="number"
              step="0.01"
              min="0"
              value={additionalCharges}
              onChange={(e) => setAdditionalCharges(e.target.value)}
            />
            <div className="form-hint">Correct the quoted surcharges here before approving.</div>
          </div>
          <div className="bill-preview">
            <span>Approved total</span>
            <strong>{formatMoney(total)}</strong>
          </div>
        </div>
        <div className="modal__footer">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn--success" disabled={saving || total <= 0}>
            {saving ? 'Approving…' : 'Approve Pricing'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function BookingReview() {
  const { notify } = useBilling();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [approving, setApproving] = useState(null);
  const [denying, setDenying] = useState(null);
  const [viewing, setViewing] = useState(null);

  const refresh = () =>
    fetchBookings()
      .then(setBookings)
      .catch((e) => notify('error', e.message || 'Unable to load bookings.'));

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bookings.filter((b) => {
      if (statusFilter !== 'All' && b.status !== statusFilter) return false;
      if (!q) return true;
      return [b.id, b.client?.name, b.client?.contact, b.vehicleLabel?.plateNumber, b.vehicleLabel?.type, b.trip?.destination]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [bookings, query, statusFilter]);

  const summary = useMemo(() => {
    const pending = bookings.filter((b) => b.status === 'Pending').length;
    const approved = bookings.filter((b) => b.status === 'Pricing Approved').length;
    const denied = bookings.filter((b) => b.status === 'Denied').length;
    return { pending, approved, denied, total: bookings.length };
  }, [bookings]);

  const handleApprove = async (payload) => {
    try {
      const updated = await approveBookingPricing(payload);
      setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      notify('success', `${updated.id} approved — ${formatMoney(updated.preBilling.estimatedTotal)}. Awaiting DMH dispatch.`);
    } catch (e) {
      notify('error', e.message);
    }
  };

  const handleDeny = async (booking, reason) => {
    try {
      const updated = await denyBooking({ id: booking.id, reason });
      setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      notify('success', `${updated.id} denied.`);
    } catch (e) {
      notify('error', e.message);
    }
  };

  return (
    <div>
      <Notification />

      <div className="stats-grid">
        <SummaryCard icon={<ClipboardCheck size={22} />} label="Pending Review" value={summary.pending} note="awaiting your approval" tone="pending" />
        <SummaryCard icon={<UserRoundCheck size={22} />} label="Awaiting Dispatch" value={summary.approved} note="pricing approved, DMH assigns driver" tone="confirmed" />
        <SummaryCard icon={<ReceiptText size={22} />} label="Total Bookings" value={summary.total} tone="primary" />
        <SummaryCard icon={<XCircle size={22} />} label="Denied" value={summary.denied} tone="danger" />
      </div>

      <section className="card">
        <div className="card__header">
          <div>
            <div className="card__title">
              Booking Pricing Review
              <span className="badge badge--neutral">{filtered.length}</span>
            </div>
            <div className="card__subtitle">Verify the quoted rental rate and surcharges, then approve or deny before dispatch.</div>
          </div>
        </div>

        <div className="card__body">
          <div className="toolbar" style={{ marginBottom: 16 }}>
            <SearchBar
              value={query}
              onChange={setQuery}
              placeholder="Search booking ID, client, plate, destination…"
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
              <span className="spinner" /> Loading bookings…
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <SearchX size={36} />
              <div className="empty-state__title">No bookings in this view</div>
              <div className="empty-state__sub">
                Pending bookings from the customer portal appear here for pricing approval.
              </div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Booking</th>
                    <th>Client</th>
                    <th>Vehicle</th>
                    <th>Trip</th>
                    <th>Pricing</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <div className="cell-main">{b.id}</div>
                        <div className="cell-sub">Created {b.createdAt}</div>
                      </td>
                      <td>
                        <div className="cell-main">{b.client?.name}</div>
                        <div className="cell-sub">{b.client?.contact}</div>
                        <div className="cell-sub">{b.client?.email}</div>
                      </td>
                      <td>
                        {b.vehicleLabel ? (
                          <>
                            <div className="cell-main">{b.vehicleLabel.plateNumber}</div>
                            <div className="cell-sub">{b.vehicleLabel.type} · {b.vehicleLabel.model}</div>
                            <div className="cell-sub">{formatMoney(b.vehicleLabel.rate)}/day</div>
                          </>
                        ) : (
                          <span className="cell-muted">—</span>
                        )}
                      </td>
                      <td>
                        <div className="cell-main">{b.trip?.destination}</div>
                        <div className="cell-sub">{formatDate(b.trip?.pickupDate)} → {formatDate(b.trip?.returnDate)}</div>
                        <div className="cell-sub">{b.trip?.durationLabel} · {b.trip?.passengers} pax</div>
                      </td>
                      <td>
                        <div className="cell-main">{formatMoney(b.preBilling?.estimatedTotal)}</div>
                        <div className="cell-sub">Rental {formatMoney(b.preBilling?.rentalFee)}</div>
                        <div className="cell-sub">Charges {formatMoney(b.preBilling?.additionalCharges)}</div>
                      </td>
                      <td>
                        <StatusBadge status={b.status} />
                        {b.status === 'Denied' && b.denialReason && (
                          <div className="cell-muted" title={b.denialReason}>{b.denialReason}</div>
                        )}
                      </td>
                      <td>
                        <div className="actions-row">
                          <button type="button" className="btn btn--secondary btn--sm" onClick={() => setViewing(b)}>
                            <Eye size={14} /> View
                          </button>
                          {b.status === 'Pending' && (
                            <>
                              <button type="button" className="btn btn--success btn--sm" onClick={() => setApproving(b)}>
                                <BadgeCheck size={14} /> Approve
                              </button>
                              <button type="button" className="btn btn--danger btn--sm" onClick={() => setDenying(b)}>
                                <XCircle size={14} /> Deny
                              </button>
                            </>
                          )}
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

      {viewing && (
        <Modal open onClose={() => setViewing(null)} title={`Booking ${viewing.id}`} subtitle={viewing.client?.name} size="lg">
          <div className="detail-grid">
            <DetailItem label="Client" value={viewing.client?.name} />
            <DetailItem label="Contact" value={viewing.client?.contact} />
            <DetailItem label="Email" value={viewing.client?.email} />
            <DetailItem label="Destination" value={viewing.trip?.destination} />
            <DetailItem label="Pickup" value={`${formatDate(viewing.trip?.pickupDate)} · ${viewing.trip?.pickupTime}`} />
            <DetailItem label="Return" value={`${formatDate(viewing.trip?.returnDate)} · ${viewing.trip?.returnTime}`} />
            <DetailItem label="Duration" value={viewing.trip?.durationLabel} />
            <DetailItem label="Passengers" value={viewing.trip?.passengers} />
            <DetailItem label="Special Requests" value={viewing.trip?.specialRequests || '—'} />
            <DetailItem label="Rental Fee" value={formatMoney(viewing.preBilling?.rentalFee)} />
            <DetailItem label="Additional Charges" value={formatMoney(viewing.preBilling?.additionalCharges)} />
            <DetailItem label="Estimated Total" value={formatMoney(viewing.preBilling?.estimatedTotal)} />
          </div>
        </Modal>
      )}

      <ApprovePricingModal booking={approving} onClose={() => setApproving(null)} onApprove={handleApprove} />
      <DenyBookingModal booking={denying} open={Boolean(denying)} onClose={() => setDenying(null)} onDeny={handleDeny} />
    </div>
  );
}