import { useState } from 'react';
import { User, MapPin, Car, Wallet, Sparkles, Check, Search, XCircle } from 'lucide-react';
import Modal from './Modal.jsx';
import StatusBadge from './StatusBadge.jsx';
import AIAssistantModal from './AIAssistantModal.jsx';
import { useApp } from '../context/AppContext.jsx';
import { calculatePreBilling, findVehicleConflicts } from '../services/bookingService.js';
import { enrichVehicle } from '../services/vehicleService.js';
import { describeDuration, formatMoney } from '../utils/format.js';
import { DatePopupField, TimePopupField } from './PopupPicker.jsx';

const validate = (f) => {
  const errs = {};
  if (!f.clientName.trim()) errs.clientName = 'Client name is required.';
  if (!f.contact.trim()) errs.contact = 'Contact number is required.';
  else if (!/^[0-9+\-()\s]{7,}$/.test(f.contact.trim())) errs.contact = 'Please enter a valid contact number.';
  if (!f.email.trim()) errs.email = 'Email address is required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) errs.email = 'Please enter a valid email address.';
  if (!f.destination.trim()) errs.destination = 'Destination is required.';
  if (!f.pickupDate) errs.pickupDate = 'Pickup date is required.';
  if (!f.returnDate) errs.returnDate = 'Return date is required.';
  if (f.pickupDate && f.returnDate && f.returnDate < f.pickupDate)
    errs.returnDate = 'Return date cannot be earlier than pickup date.';
  if (!f.vehicleId) errs.vehicleId = 'Please select a vehicle.';
  return errs;
};

const EMPTY_FORM = {
  clientName: '',
  contact: '',
  email: '',
  company: '',
  destination: '',
  pickupDate: '',
  pickupTime: '',
  returnDate: '',
  returnTime: '',
  passengers: '',
  specialRequests: '',
  vehicleId: '',
  additionalCharges: 500,
};

const Section = ({ step, icon: Icon, title, sub, actions, children }) => (
  <div className="form-section">
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
      <div>
        <div className="form-section__title">
          <span className="step-num">{step}</span>
          <Icon size={16} style={{ color: 'var(--primary)' }} />
          {title}
        </div>
        <div className="form-section__sub" style={{ marginLeft: 30 }}>
          {sub}
        </div>
      </div>
      {actions}
    </div>
    {children}
  </div>
);

export default function AddBookingModal({ open, onClose }) {
  const { createBooking, notify, bookings, vehicles } = useApp();
  const [aiOpen, setAiOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const duration = describeDuration({
    pickupDate: form.pickupDate,
    pickupTime: form.pickupTime,
    returnDate: form.returnDate,
    returnTime: form.returnTime,
  });
  const durationLabel = duration.durationLabel;
  const datesInvalid = Boolean(form.pickupDate && form.returnDate && form.returnDate < form.pickupDate);
  const datesComplete = Boolean(form.pickupDate && form.returnDate && !datesInvalid);

  const baseCandidates = vehicles
    .map((v) => enrichVehicle(v, bookings))
    .filter((v) => v.status === 'Available')
    .filter((v) =>
      vehicleSearch.trim()
        ? `${v.type} ${v.plateNumber} ${v.model}`.toLowerCase().includes(vehicleSearch.trim().toLowerCase())
        : true,
    );

  const range = { pickupDate: form.pickupDate, returnDate: form.returnDate };
  const candidates = datesComplete
    ? baseCandidates.filter((v) => findVehicleConflicts(bookings, v.id, range).length === 0)
    : baseCandidates;

  const selectedVehicle = vehicles.find((v) => v.id === form.vehicleId);
  const preBilling = calculatePreBilling(
    selectedVehicle,
    datesComplete ? Math.max(1, duration.days) : 0,
    Number(form.additionalCharges) || 0,
  );

  const handleSubmit = async () => {
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) {
      notify('error', 'Please fix the highlighted fields before creating the booking.');
      return;
    }
    if (findVehicleConflicts(bookings, form.vehicleId, range).length) {
      notify(
        'error',
        'Vehicle unavailable for the selected trip dates. Please choose another vehicle.',
      );
      setForm((p) => ({ ...p, vehicleId: '' }));
      return;
    }
    setSubmitting(true);
    try {
      const tripDuration = describeDuration({ pickupDate: form.pickupDate, pickupTime: form.pickupTime, returnDate: form.returnDate, returnTime: form.returnTime });
      const trip = {
        destination: form.destination.trim(),
        pickupDate: form.pickupDate,
        pickupTime: form.pickupTime,
        returnDate: form.returnDate,
        returnTime: form.returnTime || '18:00',
        specialRequests: form.specialRequests.trim(),
        passengers: Number(form.passengers) || 0,
        ...tripDuration,
      };
      const client = {
        name: form.clientName.trim(),
        contact: form.contact.trim(),
        email: form.email.trim(),
        company: form.company.trim(),
      };
      const id = await createBooking({ client, trip, vehicle: selectedVehicle, additionalCharges: Number(form.additionalCharges) || 0 });
      notify('success', `Booking ${id} has been successfully created.`);
      onClose();
      setForm(EMPTY_FORM);
      setErrors({});
      setVehicleSearch('');
    } catch (error) {
      notify('error', error.message || 'Unable to create booking.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Add New Booking"
        subtitle="Create a new reservation request (starts as Pending)"
        size="xl"
        footer={
          <>
            <button type="button" className="btn btn--secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="button" className="btn btn--primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <span className="spinner spinner--sm" /> : <Check size={16} />}
              {submitting ? 'Creating…' : 'Create Booking'}
            </button>
          </>
        }
      >
        <div style={{ display: 'grid', gap: 16 }}>
          <Section step={1} icon={User} title="Client Information" sub="Who is the booking for?">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label" htmlFor="add-clientName">Client Name</label>
                <input id="add-clientName" className={`form-input${errors.clientName ? ' is-invalid' : ''}`} type="text" placeholder="Enter client name" value={form.clientName} onChange={set('clientName')} />
                {errors.clientName && <div className="form-error">{errors.clientName}</div>}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="add-contact">Contact Number</label>
                <input id="add-contact" className={`form-input${errors.contact ? ' is-invalid' : ''}`} type="tel" placeholder="Enter contact number" value={form.contact} onChange={set('contact')} />
                {errors.contact && <div className="form-error">{errors.contact}</div>}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="add-email">Email Address</label>
                <input id="add-email" className={`form-input${errors.email ? ' is-invalid' : ''}`} type="email" placeholder="Enter email address" value={form.email} onChange={set('email')} />
                {errors.email && <div className="form-error">{errors.email}</div>}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="add-company">Company / Organization <span className="req" style={{ color: 'var(--text-faint)' }}>(optional)</span></label>
                <input id="add-company" className="form-input" type="text" placeholder="Enter company or organization" value={form.company} onChange={set('company')} />
              </div>
            </div>
            <div className="form-group" style={{ marginTop: 14 }}>
              <label className="form-label" htmlFor="add-special">Special Requests <span className="req" style={{ color: 'var(--text-faint)' }}>(optional)</span></label>
              <textarea id="add-special" className="form-textarea" placeholder="Any special requests or notes for this trip" value={form.specialRequests} onChange={set('specialRequests')} />
            </div>
          </Section>

          <Section step={2} icon={MapPin} title="Trip Details" sub="Where and when will the client travel?">
            <div className="form-grid">
              <div className="form-group full">
                <label className="form-label" htmlFor="add-destination">Destination</label>
                <div className={`form-input input-with-icon${errors.destination ? ' is-invalid' : ''}`}>
                  <MapPin size={15} className="input-with-icon__icon" />
                  <input
                    id="add-destination"
                    type="text"
                    placeholder="Enter destination"
                    value={form.destination}
                    onChange={set('destination')}
                  />
                </div>
                {errors.destination && <div className="form-error">{errors.destination}</div>}
              </div>
            </div>

            <div className="trip-points">
              <div className="trip-point">
                <div className="trip-point__head">
                  <span className="trip-point__badge"><MapPin size={14} /></span>
                  <strong>Pickup</strong>
                </div>
                <div className="trip-point__row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="add-pickupDate">Date</label>
                    <DatePopupField
                      value={form.pickupDate}
                      invalid={Boolean(errors.pickupDate)}
                      onSelect={(v) => setForm((p) => ({ ...p, pickupDate: v }))}
                    />
                    {errors.pickupDate && <div className="form-error">{errors.pickupDate}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="add-pickupTime">Time</label>
                    <TimePopupField
                      value={form.pickupTime}
                      onSelect={(v) => setForm((p) => ({ ...p, pickupTime: v }))}
                    />
                    <div className="form-hint">Defaults to 12:00 PM</div>
                  </div>
                </div>
              </div>

              <div className="trip-point">
                <div className="trip-point__head">
                  <span className="trip-point__badge trip-point__badge--return"><MapPin size={14} /></span>
                  <strong>Return</strong>
                  <span className="form-hint" style={{ marginLeft: 'auto', fontSize: 11 }}>optional</span>
                </div>
                <div className="trip-point__row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="add-returnDate">Date</label>
                    <DatePopupField
                      value={form.returnDate}
                      invalid={Boolean(errors.returnDate)}
                      onSelect={(v) => setForm((p) => ({ ...p, returnDate: v }))}
                    />
                    {errors.returnDate && <div className="form-error">{errors.returnDate}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="add-returnTime">Time</label>
                    <TimePopupField
                      value={form.returnTime}
                      onSelect={(v) => setForm((p) => ({ ...p, returnTime: v }))}
                    />
                    <div className="form-hint">Defaults to 6:00 PM</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="form-grid" style={{ marginTop: 14 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="add-passengers">Number of Passengers <span className="req" style={{ color: 'var(--text-faint)' }}>(optional)</span></label>
                <input id="add-passengers" className="form-input" type="number" min="1" max="50" placeholder="e.g. 8" value={form.passengers} onChange={set('passengers')} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="add-duration">Trip Duration</label>
                <div id="add-duration">
                  {form.pickupDate && form.returnDate && !datesInvalid ? (
                    <div className="form-input" style={{ fontWeight: 700, color: 'var(--ink)', background: 'var(--success-soft)' }}>
                      {durationLabel}
                    </div>
                  ) : form.returnDate && datesInvalid ? (
                    <div className="form-error">Return date cannot be earlier than pickup date.</div>
                  ) : (
                    <div className="form-input" style={{ color: 'var(--text-faint)' }}>
                      Auto-calculated when both dates are set.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Section>

          <Section
            step={3}
            icon={Car}
            title="Vehicle Choice"
            sub="Only available vehicles are selectable; availability is checked against the selected dates."
            actions={
              <button type="button" className="btn btn-pill btn--sm" onClick={() => setAiOpen(true)}>
                <Sparkles size={15} /> AI Assistant
              </button>
            }
          >
            <div className="form-group" style={{ marginBottom: 12 }}>
              <div className="form-input" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 0 }}>
                <Search size={15} style={{ marginLeft: 12, color: 'var(--text-faint)' }} />
                <input
                  id="add-vehicle-search"
                  className="form-input"
                  style={{ border: 'none', boxShadow: 'none' }}
                  type="search"
                  placeholder="Search vehicle type or plate…"
                  value={vehicleSearch}
                  onChange={(e) => setVehicleSearch(e.target.value)}
                />
              </div>
            </div>

            {candidates.length === 0 ? (
              <div className="empty-state" style={{ padding: '28px' }}>
                <XCircle size={30} />
                <div className="empty-state__title">No vehicles currently available for the selected trip period.</div>
                <div className="empty-state__sub">Try adjusting the trip dates or visit the Vehicle Availability dashboard.</div>
              </div>
            ) : (
              <div className="vehicle-picker">
                {candidates.map((v) => (
                  <button
                    type="button"
                    key={v.id}
                    className={`vehicle-option${form.vehicleId === v.id ? ' vehicle-option--selected' : ''}`}
                    onClick={() => setForm((p) => ({ ...p, vehicleId: v.id }))}
                  >
                    <div>
                      <div className="vehicle-option__main">
                        {v.type} — {v.plateNumber}
                      </div>
                      <div className="vehicle-option__sub">
                        {v.model} · {v.seats} seats · {formatMoney(v.rate)}/day
                      </div>
                    </div>
                    <div className="vehicle-option__meta">
                      <StatusBadge status={v.status} dot />
                      {form.vehicleId === v.id && <Check size={18} style={{ color: 'var(--primary)' }} />}
                    </div>
                  </button>
                ))}
              </div>
            )}
            <div className="form-hint" style={{ marginTop: 8 }}>
              Vehicles marked <strong>In Use</strong> or <strong>In Maintenance</strong> are not selectable.
              {Boolean(candidates.length) && datesComplete && (
                <span style={{ color: 'var(--success)' }}>
                  {' '}— {candidates.length} free for {range.pickupDate} → {range.returnDate}.
                </span>
              )}
            </div>
            {errors.vehicleId && <div className="form-error" style={{ marginTop: 8 }}>{errors.vehicleId}</div>}
          </Section>

          <Section step={4} icon={Wallet} title="Pre-Billing Estimate" sub="Estimated Amount — Subject to Final Billing">
            <div className="detail-grid">
              <div className="detail-item" style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                <div className="detail-item__label">Vehicle Rental Rate</div>
                <div className="detail-item__value">{selectedVehicle ? formatMoney(selectedVehicle.rate) : '—'}</div>
              </div>
              <div className="detail-item" style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                <div className="detail-item__label">Trip Duration</div>
                <div className="detail-item__value">{datesComplete && durationLabel ? durationLabel : '—'}</div>
              </div>
              <div className="form-group" style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                <label className="form-label" htmlFor="add-charges">Additional Charges (₱)</label>
                <input id="add-charges" className="form-input" type="number" min="0" step="50" value={form.additionalCharges} onChange={set('additionalCharges')} />
              </div>
            </div>
            <div className="mt-16" style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <div className="muted" style={{ fontSize: 12 }}>Estimated Rental Fee</div>
                <div className="cell-main">{selectedVehicle ? formatMoney(preBilling.rentalFee) : '—'}</div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: 12 }}>Additional Charges</div>
                <div className="cell-main">{formatMoney(preBilling.additionalCharges)}</div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div className="muted" style={{ fontSize: 12 }}>Estimated Total</div>
                <div className="cell-main" style={{ fontSize: 22 }}>
                  {selectedVehicle ? formatMoney(preBilling.estimatedTotal) : '—'}
                </div>
                <div className="badge badge--neutral" style={{ marginTop: 4 }}>
                  Estimated Amount — Subject to Final Billing
                </div>
              </div>
            </div>
          </Section>
        </div>
      </Modal>

      <AIAssistantModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        client={{ name: form.clientName, contact: form.contact, email: form.email, company: form.company }}
        trip={{
          destination: form.destination,
          pickupDate: form.pickupDate,
          pickupTime: form.pickupTime,
          returnDate: form.returnDate,
          returnTime: form.returnTime,
          specialRequests: form.specialRequests,
        }}
        passengers={Number(form.passengers) || 0}
        selectedVehicleId={form.vehicleId}
        onPickVehicle={(id) => {
          setForm((p) => ({ ...p, vehicleId: id }));
        }}
      />
    </>
  );
}