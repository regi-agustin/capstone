import { useState } from 'react';
import { User, MapPin, Car, ShieldAlert, Image, X } from 'lucide-react';
import Modal from './Modal.jsx';
import StatusBadge from './StatusBadge.jsx';
import { formatMoney, formatDate, formatDateLong, formatTime } from '../utils/format.js';
import { useApp } from '../context/AppContext.jsx';
import { getVehicleById } from '../services/vehicleService.js';

const Section = ({ icon: Icon, title, children }) => (
  <div className="form-section">
    <div className="form-section__title" style={{ marginBottom: 12 }}>
      <Icon size={16} style={{ color: 'var(--primary)' }} />
      {title}
    </div>
    {children}
  </div>
);

const Item = ({ label, value }) => (
  <div className="detail-item">
    <div className="detail-item__label">{label}</div>
    <div className="detail-item__value">{value || '—'}</div>
  </div>
);

export default function BookingDetailsModal({ booking, open, onClose }) {
  const { vehicles, bookings } = useApp();
  const [licensePreview, setLicensePreview] = useState(false);
  if (!booking) return null;
  const vehicleEnriched = booking.vehicleId ? getVehicleById(vehicles, bookings, booking.vehicleId) : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Booking Details — ${booking.id}`}
      subtitle="Full reservation record"
      size="lg"
    >
      <div style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div className="status-hero">
            Booking Status: <StatusBadge status={booking.status} />
          </div>
          <div className="muted nowrap" style={{ fontSize: 12 }}>
            Created {formatDate(booking.createdAt)}
          </div>
        </div>

        <Section icon={User} title="Client Information">
          <div className="detail-grid">
            <Item label="Client Name" value={booking.client?.name} />
            <Item label="Contact Number" value={booking.client?.contact} />
            <Item label="Email" value={booking.client?.email} />
            <Item label="Company / Organization" value={booking.client?.company} />
          </div>
        </Section>

        <Section icon={MapPin} title="Trip Information">
          <div className="detail-grid">
            <Item label="Destination" value={booking.trip?.destination} />
            <Item label="Pickup Date" value={formatDateLong(booking.trip?.pickupDate)} />
            <Item label="Pickup Time" value={formatTime(booking.trip?.pickupTime)} />
            <Item label="Return Date" value={formatDateLong(booking.trip?.returnDate)} />
            <Item label="Return Time" value={formatTime(booking.trip?.returnTime)} />
            <Item label="Trip Duration" value={booking.trip?.durationLabel} />
            <Item label="Need Driver" value={booking.trip?.needDriver === 'yes' ? 'Yes' : booking.trip?.needDriver === 'no' ? 'No' : '—'} />
            <Item label="Passengers" value={booking.trip?.passengers || '—'} />
            <Item label="Special Requests" value={booking.trip?.specialRequests} />
          </div>
        </Section>

        {booking.trip?.needDriver === 'no' && booking.trip?.driverLicenseImage && (
          <Section icon={Image} title="Driver's License">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <img
                src={booking.trip.driverLicenseImage}
                alt="Driver's License"
                style={{
                  maxWidth: 200,
                  maxHeight: 150,
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  objectFit: 'cover',
                }}
                onClick={() => setLicensePreview(true)}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>Uploaded by customer</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Click image to view full size</div>
              </div>
            </div>
          </Section>
        )}

        {licensePreview && booking.trip?.driverLicenseImage && (
          <div
            onClick={(e) => { if (e.target === e.currentTarget) setLicensePreview(false); }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1100,
              background: 'rgba(10, 15, 30, .92)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
          >
            <button
              type="button"
              onClick={() => setLicensePreview(false)}
              aria-label="Close preview"
              style={{
                position: 'absolute',
                top: 18,
                right: 22,
                background: 'none',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                padding: 6,
              }}
            >
              <X size={28} />
            </button>
            <img
              src={booking.trip.driverLicenseImage}
              alt="Driver's License"
              style={{
                maxWidth: 'min(900px, 92vw)',
                maxHeight: '82vh',
                objectFit: 'contain',
                borderRadius: 8,
              }}
            />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Section icon={Car} title="Vehicle Information">
            <div className="detail-grid">
              <Item label="Vehicle Type" value={booking.vehicleLabel?.type} />
              <Item label="Plate Number" value={booking.vehicleLabel?.plateNumber} />
              <Item label="Vehicle Status" value={vehicleEnriched?.status} />
            </div>
          </Section>
          <Section icon={User} title="Driver Information">
            <div className="detail-grid">
              <Item label="Driver Name" value={booking.driver?.name} />
              <Item label="Driver Contact" value={booking.driver?.contact} />
            </div>
          </Section>
        </div>

        <Section icon={ShieldAlert} title="Pre-Billing Information">
          <div className="detail-grid">
            <Item label="Base Rental Fee" value={formatMoney(booking?.preBilling?.baseRate)} />
            <Item label="Estimated Rental Fee" value={formatMoney(booking?.preBilling?.rentalFee)} />
            <Item label="Additional Charges" value={formatMoney(booking?.preBilling?.additionalCharges)} />
            <Item label="Estimated Total" value={formatMoney(booking?.preBilling?.estimatedTotal)} />
          </div>
          <div className="badge badge--neutral" style={{ marginTop: 10 }}>
            Estimated Amount — Subject to Final Billing
          </div>
        </Section>

        {booking.status === 'Denied' && booking.denialReason && (
          <div className="error-banner">
            <ShieldAlert size={17} />
            <span>
              <strong>Denial reason:</strong> {booking.denialReason}
            </span>
          </div>
        )}
      </div>
    </Modal>
  );
}