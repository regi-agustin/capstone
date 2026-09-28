import { useState } from 'react';
import { AlertTriangle, XCircle } from 'lucide-react';
import Modal from './Modal.jsx';
import { formatDate } from '../utils/format.js';

export default function DenyBookingModal({ booking, open, onClose, onDeny }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDeny = async () => {
    setLoading(true);
    try {
      await onDeny(booking, reason.trim());
      onClose();
      setReason('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Deny Booking"
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="button" className="btn btn--danger" onClick={handleDeny} disabled={loading}>
            {loading ? <span className="spinner spinner--sm" /> : <XCircle size={16} />}
            {loading ? 'Denying…' : 'Deny Booking'}
          </button>
        </>
      }
    >
      {booking && (
        <div style={{ display: 'grid', gap: 14 }}>
          <div className="ai-banner" style={{ background: 'var(--danger-soft)', borderColor: '#f4c6cc', color: 'var(--danger)' }}>
            <AlertTriangle size={18} />
            <div>
              <strong>Are you sure you want to deny this booking?</strong>
              <div style={{ fontSize: 13, marginTop: 4, fontWeight: 400 }}>
                {booking.id} will be marked as denied and its reserved vehicle will be released.
              </div>
            </div>
          </div>
          <div className="detail-grid">
            <div className="detail-item">
              <div className="detail-item__label">Client</div>
              <div className="detail-item__value">{booking.client?.name}</div>
            </div>
            <div className="detail-item">
              <div className="detail-item__label">Trip</div>
              <div className="detail-item__value">
                {formatDate(booking.trip?.pickupDate)} → {formatDate(booking.trip?.returnDate)}
              </div>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="deny-reason">
              Reason for Denial <span className="req">(optional)</span>
            </label>
            <textarea
              id="deny-reason"
              className="form-textarea"
              placeholder="e.g. No available vehicle for the requested period."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
            />
            <div className="form-hint">{reason.length}/500</div>
          </div>
        </div>
      )}
    </Modal>
  );
}