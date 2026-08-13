import { useState } from 'react';
import { CalendarDays, Clock, CheckCircle2, XCircle, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import SummaryCard from '../components/SummaryCard.jsx';
import BookingTable from '../components/BookingTable.jsx';
import AddBookingModal from '../components/AddBookingModal.jsx';
import BookingDetailsModal from '../components/BookingDetailsModal.jsx';
import ConfirmBookingModal from '../components/ConfirmBookingModal.jsx';
import DenyBookingModal from '../components/DenyBookingModal.jsx';

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
  };

  const handleConfirm = async (booking) => {
    try {
      await confirmBookingAction(booking);
      notify('success', `Booking ${booking.id} has been confirmed.`);
      return true;
    } catch (error) {
      notify('error', error.message || 'Unable to confirm booking.');
      return false;
    }
  };

  const handleDeny = async (booking, reason) => {
    try {
      await denyBookingAction(booking, reason);
      notify('success', `Booking ${booking.id} has been denied.`);
      return true;
    } catch (error) {
      notify('error', error.message || 'Unable to deny booking.');
      return false;
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

      <div className="stats-grid">
        <SummaryCard icon={<CalendarDays size={22} />} label="Total Bookings" value={counts.total} tone="primary" note="All reservation requests" />
        <SummaryCard icon={<Clock size={22} />} label="Pending Bookings" value={counts.pending} tone="pending" note="Awaiting your action" />
        <SummaryCard icon={<CheckCircle2 size={22} />} label="Confirmed Bookings" value={counts.confirmed} tone="confirmed" note="Reservations locked in" />
        <SummaryCard icon={<XCircle size={22} />} label="Denied Bookings" value={counts.denied} tone="denied" note="Requests declined" />
      </div>

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