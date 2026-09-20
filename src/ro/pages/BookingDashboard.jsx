import { useState } from 'react';
import { CalendarDays, Clock, CheckCircle2, XCircle, Ban, Plus, UserRound, Car } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import SummaryCard from '../components/SummaryCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import BookingTable from '../components/BookingTable.jsx';
import AddBookingModal from '../components/AddBookingModal.jsx';
import BookingDetailsModal from '../components/BookingDetailsModal.jsx';
import ConfirmBookingModal from '../components/ConfirmBookingModal.jsx';
import DenyBookingModal from '../components/DenyBookingModal.jsx';
import { formatDate } from '../utils/format.js';

export default function BookingDashboard() {
  const { bookings, hydrating, notify, confirmBookingAction, denyBookingAction } = useApp();

  const [addOpen, setAddOpen] = useState(false);
  const [viewBooking, setViewBooking] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [denyTarget, setDenyTarget] = useState(null);

  const counts = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === 'Pending').length,
    confirmed: bookings.filter((b) => b.status === 'Confirmed').length,
    denied: bookings.filter((b) => b.status === 'Denied').length,
    cancelled: bookings.filter((b) => b.status === 'Cancelled').length,
  };

  const assignments = bookings.filter(
    (b) => b.driver && (b.status === 'Confirmed' || b.status === 'On trip'),
  );

  const handleConfirm = async (booking) => {
    try {
      await confirmBookingAction(booking);
      notify('success', `Booking ${booking.id} has been confirmed.`);
      return true;
    } catch (error) {
      notify('error', error.message || 'Unable to confirm booking.');
      throw error;
    }
  };

  const handleDeny = async (booking, reason) => {
    try {
      await denyBookingAction(booking, reason);
      notify('success', `Booking ${booking.id} has been denied.`);
      return true;
    } catch (error) {
      notify('error', error.message || 'Unable to deny booking.');
      throw error;
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Booking Dashboard</h1>
          <p className="page-head__sub">Manage client reservations, confirmations, and denials.</p>
        </div>
      </div>

      <div className="stats-grid stats-grid--five">
        <SummaryCard icon={<CalendarDays size={22} />} label="Total Bookings" value={counts.total} tone="primary" note="All reservation requests" />
        <SummaryCard icon={<Clock size={22} />} label="Pending Bookings" value={counts.pending} tone="pending" note="Awaiting your action" />
        <SummaryCard icon={<CheckCircle2 size={22} />} label="Confirmed Bookings" value={counts.confirmed} tone="confirmed" note="Reservations locked in" />
        <SummaryCard icon={<XCircle size={22} />} label="Denied Bookings" value={counts.denied} tone="denied" note="Requests declined" />
        <SummaryCard icon={<Ban size={22} />} label="Cancelled Bookings" value={counts.cancelled} tone="cancelled" note="Bookings cancelled" />
      </div>

      <section className="card" style={{ marginBottom: 22 }}>
        <div className="card__header">
          <div>
            <div className="card__title">
              Current Driver Assignments
              <span className="badge badge--neutral">{assignments.length}</span>
            </div>
            <div className="card__subtitle">Drivers assigned to vehicles on confirmed and ongoing trips.</div>
          </div>
        </div>
        <div className="card__body">
          {assignments.length === 0 ? (
            <div className="empty-state">
              <UserRound size={30} />
              <div className="empty-state__title">No active driver assignments</div>
              <div className="empty-state__sub">Confirmed bookings appear here with their assigned driver and vehicle.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
              {assignments.map((b) => (
                <div key={b.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div className="cell-main">
                      <Car size={14} style={{ color: 'var(--text-faint)', verticalAlign: '-2px' }} />
                      {b.vehicleLabel ? `${b.vehicleLabel.type} · ${b.vehicleLabel.model}` : 'Vehicle'}
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                  <div className="cell-sub">{b.vehicleLabel ? b.vehicleLabel.plateNumber : '—'}</div>
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                    <div className="cell-main">
                      <UserRound size={14} style={{ color: 'var(--text-faint)', verticalAlign: '-2px' }} />
                      {b.driver.name}
                    </div>
                    <div className="cell-sub">{b.driver.contact}</div>
                  </div>
                  <div className="cell-muted" style={{ marginTop: 8 }}>
                    <CalendarDays size={13} style={{ display: 'inline', verticalAlign: '-2px' }} />
                    {formatDate(b.trip.pickupDate)} → {formatDate(b.trip.returnDate)} · {b.id}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <BookingTable
        loading={hydrating}
        onView={setViewBooking}
        onConfirm={setConfirmTarget}
        onDeny={setDenyTarget}
        onAdd={() => setAddOpen(true)}
      />

      <AddBookingModal open={addOpen} onClose={() => setAddOpen(false)} />
      <BookingDetailsModal booking={viewBooking} open={Boolean(viewBooking)} onClose={() => setViewBooking(null)} />
      <ConfirmBookingModal booking={confirmTarget} open={Boolean(confirmTarget)} onClose={() => setConfirmTarget(null)} onConfirm={handleConfirm} />
      <DenyBookingModal booking={denyTarget} open={Boolean(denyTarget)} onClose={() => setDenyTarget(null)} onDeny={handleDeny} />
    </div>
  );
}