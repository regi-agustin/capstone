import { Car } from 'lucide-react';
import Modal from './Modal.jsx';
import StatusBadge from './StatusBadge.jsx';
import VehiclePhotos from './VehiclePhotos.jsx';
import { formatDateLong } from '../utils/format.js';

const Item = ({ label, value }) => (
  <div className="detail-item">
    <div className="detail-item__label">{label}</div>
    <div className="detail-item__value">{value || '—'}</div>
  </div>
);

export default function VehicleDetailsModal({ vehicle, open, onClose }) {
  if (!vehicle) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Vehicle Details — ${vehicle.carCode || vehicle.plate}`}
      subtitle={vehicle.type}
      size="lg"
    >
      <div style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {vehicle.photoUrl || (vehicle.images && vehicle.images.length) ? (
              <VehiclePhotos vehicle={vehicle} thumb={{ width: 56, height: 42, borderRadius: 8 }} />
            ) : (
              <div className="stat-card__icon" style={{ width: 40, height: 40 }}>
                <Car size={20} />
              </div>
            )}
            <div>
              <div className="cell-main" style={{ fontSize: 15 }}>{vehicle.type} — {vehicle.carCode}</div>
              <div className="cell-sub">
                {vehicle.model} · {vehicle.year}
              </div>
            </div>
          </div>
          <StatusBadge status={vehicle.status} />
        </div>

        <div className="form-section">
          <div className="form-section__title" style={{ marginBottom: 12 }}>
            <Car size={16} style={{ color: 'var(--primary)' }} />
            Vehicle Information
          </div>
          <div className="detail-grid">
            <Item label="Fleet / Car Code" value={vehicle.carCode} />
            <Item label="Plate Number" value={vehicle.plate} />
            <Item label="Vehicle Type" value={vehicle.type} />
            <Item label="Model" value={vehicle.model} />
            <Item label="Year" value={vehicle.year} />
            <Item label="Seating Capacity" value={`${vehicle.seats} passengers`} />
            <Item label="Daily Rate" value={`₱${vehicle.dailyRate?.toLocaleString()}`} />
            <Item label="Ownership" value={vehicle.carCode?.startsWith('HD') ? 'Internal' : 'Subcontracted'} />
          </div>
        </div>

        <div className="form-section">
          <div className="form-section__title" style={{ marginBottom: 12 }}>
            Current Status
          </div>
          <StatusBadge status={vehicle.status} />
          <div className="detail-grid" style={{ marginTop: 14 }}>
            <Item label="Current Booking" value={vehicle.currentBooking || 'No Active Booking'} />
            <Item label="Client" value={vehicle.currentClient} />
            <Item label="Destination" value={vehicle.currentDestination} />
            <Item label="Trip Date" value={formatDateLong(vehicle.currentTripDate)} />
          </div>
        </div>

        <div className="form-section">
          <div className="form-section__title" style={{ marginBottom: 12 }}>
            Driver Information
          </div>
          <div className="detail-grid">
            <Item label="Driver Name" value={vehicle.driver?.name} />
            <Item label="Contact Number" value={vehicle.driver?.contact} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
