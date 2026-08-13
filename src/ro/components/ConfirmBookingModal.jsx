import { useState } from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import Modal from './Modal.jsx';
import { formatDate } from '../utils/format.js';

export default function ConfirmBookingModal({ booking, open, onClose, onConfirm }) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(booking);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Confirm Booking"
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="button" className="btn btn--success" onClick={handleConfirm} disabled={loading}>
            {loading ? <span className="spinner spinner--sm" /> : <ShieldCheck size={16} />}
            {loading ? 'Confirming…' : 'Confirm Booking'}
          </button>
        </>
      }
    >
      {booking && (
        <div style={{ display: 'grid', gap: 14 }}>
          <div className="ai-banner" style={{ background: 'var(--success-soft)', borderColor: '#bfe3cb', color: 'var(--success)' }}>
            <AlertTriangle size={18} />
            <div>
              <strong>Are you sure you want to confirm this booking?</strong>
              <div style={{ fontSize: 13, marginTop: 4, fontWeight: 400 }}>
                This will mark {booking.id} as confirmed and assign a driver to the trip.
              </div>
            </div>
          </div>
          <div className="detail-grid">
            <div className="detail-item">
              <div className="detail-item__label">Client</div>
              <div className="detail-item__value">{booking.client.name}</div>
            </div>
            <div className="detail-item">
              <div className="detail-item__label">Destination</div>
              <div className="detail-item__value">{booking.trip.destination}</div>
            </div>
            <div className="detail-item">
              <div className="detail-item__label">Trip</div>
              <div className="detail-item__value">
                {formatDate(booking.trip.pickupDate)} → {formatDate(booking.trip.returnDate)}
              </div>
            </div>
            <div className="detail-item">
              <div className="detail-item__label">Vehicle</div>
              <div className="detail-item__value">
                {booking.vehicleLabel ? `${booking.vehicleLabel.type} · ${booking.vehicleLabel.plateNumber}` : 'Not assigned'}
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}