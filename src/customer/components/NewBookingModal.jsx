import { useEffect, useRef, useState } from 'react';
import { User, MapPin, Car, Wallet, Sparkles, Check, Search, XCircle, Upload, FileText, X } from 'lucide-react';
import Modal from '../../ro/components/Modal.jsx';
import StatusBadge from '../../ro/components/StatusBadge.jsx';
import AIAssistantModal from '../../ro/components/AIAssistantModal.jsx';
import { DatePopupField, TimePopupField } from '../../ro/components/PopupPicker.jsx';
import { calculatePreBilling, findVehicleConflicts } from '../../ro/services/bookingService.js';
import { enrichVehicle } from '../../ro/services/vehicleService.js';
import { describeDuration, formatMoney } from '../../ro/utils/format.js';
import { createBooking } from '../services/customerService.js';

const toMyVehicle = (v) => ({
  id: v.id,
  plate: v.plate,
  carCode: v.carCode,
  type: v.type,
  model: v.model,
  year: v.year,
  seats: v.seats,
  dailyRate: v.dailyRate,
  status: v.status,
  photoUrl: v.photoUrl,
  images: v.images || [],
});

const MAX_IMAGE_DIMENSION = 1280;
const JPEG_QUALITY = 0.8;

const compressImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
      } catch (e) { reject(e); }
      finally { URL.revokeObjectURL(url); }
    };
    img.onerror = reject;
    img.src = url;
  });

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

export default function NewBookingModal({ open, onClose, vehicles = [], bookings = [], profile = null, initialVehicleId = null, notify }) {
  const [aiOpen, setAiOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [vehicleListOpen, setVehicleListOpen] = useState(false);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [licenseImage, setLicenseImage] = useState(null);
  const [licenseDragging, setLicenseDragging] = useState(false);
  const licenseFileRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const today = new Date().toISOString().slice(0, 10);
    setForm({
      clientName: profile?.account?.name || '',
      contact: profile?.account?.contactNumber || '',
      email: profile?.account?.email || '',
      destination: '',
      pickupDate: today,
      pickupTime: '',
      returnDate: today,
      returnTime: '',
      passengers: '',
      needDriver: '',
      specialRequests: '',
      vehicleId: initialVehicleId || '',
      additionalCharges: 0,
    });
    setErrors({});
    setVehicleSearch('');
    setVehicleListOpen(false);
    setLicenseImage(null);
  }, [open, profile, initialVehicleId]);

  if (!form) return null;

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const handleLicensePick = async (files) => {
    const file = files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const dataUrl = await compressImage(file);
    setLicenseImage({ name: file.name, dataUrl });
  };

  const handleLicenseDrop = (e) => {
    e.preventDefault();
    setLicenseDragging(false);
    handleLicensePick(e.dataTransfer.files);
  };

  const removeLicense = () => {
    setLicenseImage(null);
    setForm((p) => ({ ...p, driverLicenseImage: '' }));
  };

  const myVehicles = vehicles.map(toMyVehicle);

  const duration = describeDuration({
    pickupDate: form.pickupDate,
    pickupTime: form.pickupTime,
    returnDate: form.returnDate,
    returnTime: form.returnTime,
  });
  const durationLabel = duration.durationLabel;
  const datesInvalid = Boolean(form.pickupDate && form.returnDate && form.returnDate < form.pickupDate);
  const datesComplete = Boolean(form.pickupDate && form.returnDate && !datesInvalid);

  const baseCandidates = myVehicles
    .map((v) => enrichVehicle(v, bookings))
    .filter((v) => v.status === 'Available')
    .filter((v) =>
      vehicleSearch.trim()
        ? `${v.type} ${v.plate} ${v.model}`.toLowerCase().includes(vehicleSearch.trim().toLowerCase())
        : true,
    );

  const range = { pickupDate: form.pickupDate, returnDate: form.returnDate };
  const candidates = datesComplete
    ? baseCandidates.filter((v) => findVehicleConflicts(bookings, v.id, range).length === 0)
    : baseCandidates;

  const selectedVehicle = myVehicles.find((v) => v.id === form.vehicleId) || null;
  const preBilling = calculatePreBilling(
    selectedVehicle,
    datesComplete ? Math.max(1, duration.days) : 0,
    Number(form.additionalCharges) || 0,
  );

  const validate = (f) => {
    const errs = {};
    if (!f.needDriver) errs.needDriver = 'Please select whether you need a driver.';
    if (f.needDriver === 'no' && !licenseImage) errs.driverLicenseImage = 'Driver\'s license image is required for self-drive.';
    if (!f.clientName.trim()) errs.clientName = 'Full name is required.';
    if (!f.contact.trim()) errs.contact = 'Contact number is required.';
    else if (!/^[0-9+\-()\s]{7,}$/.test(f.contact.trim())) errs.contact = 'Please enter a valid contact number.';
    if (!f.email.trim()) errs.email = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) errs.email = 'Please enter a valid email address.';
    if (!f.destination.trim()) errs.destination = 'Destination is required.';
    if (!f.pickupDate) errs.pickupDate = 'Pickup date is required.';
    if (!f.returnDate) errs.returnDate = 'Return date is required.';
    if (f.pickupDate && f.returnDate && f.returnDate < f.pickupDate)
      errs.returnDate = 'Return date cannot be earlier than pickup date.';
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) {
      notify?.('error', 'Please fix the highlighted fields before submitting your reservation.');
      return;
    }
    if (form.vehicleId && findVehicleConflicts(bookings, form.vehicleId, range).length) {
      notify?.('error', 'Vehicle unavailable for the selected trip dates. Please choose another vehicle.');
      setForm((p) => ({ ...p, vehicleId: '' }));
      return;
    }
    setSubmitting(true);
    try {
      const days = datesComplete ? Math.max(1, duration.days) : 1;
      await createBooking({
        vehicleId: selectedVehicle ? selectedVehicle.id : null,
        client: {
          name: form.clientName.trim(),
          contact: form.contact.trim(),
          email: form.email.trim(),
        },
        trip: {
          destination: form.destination.trim(),
          pickupDate: form.pickupDate,
          pickupTime: form.pickupTime,
          returnDate: form.returnDate,
          returnTime: form.returnTime || '18:00',
          passengers: Number(form.passengers) || 0,
          needDriver: form.needDriver || null,
          driverLicenseImage: licenseImage?.dataUrl || null,
          specialRequests: form.specialRequests.trim(),
        },
        estimatedTotal: selectedVehicle ? selectedVehicle.dailyRate * days : 0,
      });
      notify?.('success', 'Reservation submitted! It is now pending approval. Check My Reservations.');
      onClose?.();
    } catch (error) {
      notify?.('error', error.message || 'Unable to submit reservation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        lockClose
        title="Book a Vehicle"
        subtitle="Enter your trip details first, then choose the vehicle — or let the AI assistant help."
        size="xl"
        footer={
          <>
            <button type="button" className="btn btn--secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="button" className="btn btn--primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <span className="spinner spinner--sm" /> : <Check size={16} />}
              {submitting ? 'Submitting…' : 'Submit Reservation'}
            </button>
          </>
        }
      >
        <div style={{ display: 'grid', gap: 16 }}>
          <Section step={1} icon={User} title="Your Details" sub="Who is this booking for?">
            <div className="form-grid">
              <div className="form-group full">
                <label className="form-label">Do you need a driver? <span className="req">*</span></label>
                <div style={{ display: 'flex', gap: 12 }}>
                  {[
                    { value: 'yes', label: 'Yes, with driver' },
                    { value: 'no', label: 'No, self-drive' },
                  ].map((opt) => {
                    const selected = form.needDriver === opt.value;
                    return (
                      <label
                        key={opt.value}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          padding: '12px 16px',
                          borderRadius: 10,
                          border: selected ? '2px solid var(--primary)' : '2px solid var(--border)',
                          background: selected ? 'var(--primary-soft)' : '#fff',
                          cursor: 'pointer',
                          fontWeight: selected ? 700 : 500,
                          fontSize: 14,
                          color: selected ? 'var(--primary-dark)' : 'var(--text)',
                          transition: 'all .15s',
                          userSelect: 'none',
                        }}
                      >
                        <input
                          type="radio"
                          name="needDriver"
                          value={opt.value}
                          checked={selected}
                          onChange={set('needDriver')}
                          style={{ display: 'none' }}
                        />
                        <span
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            border: selected ? '6px solid var(--primary)' : '2px solid var(--muted)',
                            flexShrink: 0,
                            transition: 'all .15s',
                          }}
                        />
                        {opt.label}
                      </label>
                    );
                  })}
                </div>
                {errors.needDriver && <div className="form-error">{errors.needDriver}</div>}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="cust-name">Full Name</label>
                <input id="cust-name" className={`form-input${errors.clientName ? ' is-invalid' : ''}`} type="text" placeholder="Enter full name" value={form.clientName} onChange={set('clientName')} />
                {errors.clientName && <div className="form-error">{errors.clientName}</div>}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="cust-contact">Contact Number</label>
                <input id="cust-contact" className={`form-input${errors.contact ? ' is-invalid' : ''}`} type="tel" placeholder="Enter contact number" value={form.contact} onChange={set('contact')} />
                {errors.contact && <div className="form-error">{errors.contact}</div>}
              </div>
              <div className="form-group full">
                <label className="form-label" htmlFor="cust-email">Email Address</label>
                <input id="cust-email" className={`form-input${errors.email ? ' is-invalid' : ''}`} type="email" placeholder="Enter email address" value={form.email} onChange={set('email')} />
                {errors.email && <div className="form-error">{errors.email}</div>}
              </div>

              {form.needDriver === 'no' && (
                <div className="form-group full">
                  <label className="form-label">Upload Driver's License <span className="req">*</span></label>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setLicenseDragging(true); }}
                    onDragLeave={() => setLicenseDragging(false)}
                    onDrop={handleLicenseDrop}
                    style={{
                      border: `2px dashed ${licenseDragging ? '#991b1b' : 'var(--border)'}`,
                      background: licenseDragging ? 'var(--red-bg)' : '#fbfdff',
                      borderRadius: 12,
                      padding: '26px 18px',
                      textAlign: 'center',
                      transition: 'border-color .15s, background .15s',
                    }}
                  >
                    <input
                      ref={licenseFileRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      style={{ display: 'none' }}
                      onChange={(e) => { handleLicensePick(e.target.files); e.target.value = ''; }}
                    />
                    <label htmlFor="cust-license" style={{ cursor: 'pointer', display: 'block' }}>
                      <span
                        style={{
                          width: 58,
                          height: 58,
                          borderRadius: '50%',
                          background: 'var(--red-bg)',
                          color: '#991b1b',
                          display: 'grid',
                          placeItems: 'center',
                          margin: '0 auto 12px',
                        }}
                      >
                        <Upload size={26} />
                      </span>
                      <span style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>
                        Drag and drop or{' '}
                        <span style={{ color: '#991b1b', fontWeight: 700, textDecoration: 'underline' }}>Browse</span>{' '}
                        to choose a file
                      </span>
                    </label>
                    <input
                      id="cust-license"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      style={{ display: 'none' }}
                      onChange={(e) => { handleLicensePick(e.target.files); e.target.value = ''; }}
                    />
                  </div>
                  <span style={{ display: 'block', textAlign: 'center', marginTop: 8, fontSize: 12, color: 'var(--text-faint)' }}>
                    PNG, JPG and WebP image formats are supported.
                  </span>

                  {licenseImage && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ display: 'grid', gap: 8 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px 10px',
                            borderRadius: 10,
                            background: 'var(--red-bg)',
                            border: '1px solid #991b1b',
                          }}
                        >
                          <FileText size={18} style={{ color: '#991b1b', flexShrink: 0 }} />
                          <span
                            style={{
                              flex: 1,
                              fontSize: 13,
                              fontWeight: 600,
                              color: 'var(--text)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {licenseImage.name}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              color: '#991b1b',
                              background: '#fff',
                              borderRadius: 999,
                              padding: '3px 10px',
                              border: '1px solid #991b1b',
                              flexShrink: 0,
                            }}
                          >
                            Uploaded
                          </span>
                          <button
                            type="button"
                            onClick={removeLicense}
                            aria-label="Remove license image"
                            style={{
                              border: 'none',
                              background: 'none',
                              color: 'var(--muted)',
                              cursor: 'pointer',
                              display: 'grid',
                              placeItems: 'center',
                              padding: 4,
                              borderRadius: 6,
                              flexShrink: 0,
                            }}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {errors.driverLicenseImage && <div className="form-error" style={{ marginTop: 8 }}>{errors.driverLicenseImage}</div>}
                </div>
              )}

              <div className="form-group full">
                <label className="form-label" htmlFor="cust-special">Special Requests <span className="req" style={{ color: 'var(--text-faint)' }}>(optional)</span></label>
                <textarea id="cust-special" className="form-textarea" placeholder="Any special requests or notes for this trip" value={form.specialRequests} onChange={set('specialRequests')} />
              </div>
            </div>
          </Section>

          <Section step={2} icon={MapPin} title="Trip Details" sub="Where and when will you travel?">
            <div className="form-grid">
              <div className="form-group full">
                <label className="form-label" htmlFor="cust-destination">Destination</label>
                <div className={`form-input input-with-icon${errors.destination ? ' is-invalid' : ''}`}>
                  <MapPin size={15} className="input-with-icon__icon" />
                  <input
                    id="cust-destination"
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
                    <label className="form-label" htmlFor="cust-pickupDate">Date</label>
                    <DatePopupField
                      value={form.pickupDate}
                      invalid={Boolean(errors.pickupDate)}
                      onSelect={(v) => setForm((p) => ({ ...p, pickupDate: v }))}
                    />
                    {errors.pickupDate && <div className="form-error">{errors.pickupDate}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="cust-pickupTime">Time</label>
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
                </div>
                <div className="trip-point__row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="cust-returnDate">Date</label>
                    <DatePopupField
                      value={form.returnDate}
                      invalid={Boolean(errors.returnDate)}
                      onSelect={(v) => setForm((p) => ({ ...p, returnDate: v }))}
                    />
                    {errors.returnDate && <div className="form-error">{errors.returnDate}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="cust-returnTime">Time</label>
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
                <label className="form-label" htmlFor="cust-passengers">Number of Passengers <span className="req" style={{ color: 'var(--text-faint)' }}>(optional)</span></label>
                <input id="cust-passengers" className="form-input" type="number" min="1" max="50" placeholder="e.g. 8" value={form.passengers} onChange={set('passengers')} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="cust-duration">Trip Duration</label>
                <div id="cust-duration">
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
            sub="Only vehicles free on your selected dates are selectable. You can also submit without a vehicle — we'll assign the best match."
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
                  id="cust-vehicle-search"
                  className="form-input"
                  style={{ border: 'none', boxShadow: 'none' }}
                  type="search"
                  placeholder="Search vehicle type or plate…"
                  value={vehicleSearch}
                  onChange={(e) => setVehicleSearch(e.target.value)}
                  onFocus={() => setVehicleListOpen(true)}
                  onBlur={() => setTimeout(() => setVehicleListOpen(false), 150)}
                />
              </div>
            </div>

            {vehicleListOpen ? (
              candidates.length === 0 ? (
                <div className="empty-state" style={{ padding: '28px' }}>
                  <XCircle size={30} />
                  <div className="empty-state__title">No vehicles currently available for the selected trip period.</div>
                  <div className="empty-state__sub">Try adjusting the trip dates — or submit without a vehicle and we will assign the best match.</div>
                </div>
              ) : (
                <div className="vehicle-picker">
                  {candidates.map((v) => (
                    <button
                      type="button"
                      key={v.id}
                      className={`vehicle-option${form.vehicleId === v.id ? ' vehicle-option--selected' : ''}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setForm((p) => ({ ...p, vehicleId: v.id }));
                        setVehicleListOpen(false);
                        setVehicleSearch('');
                      }}
                    >
                      <div>
                        <div className="vehicle-option__main">
                          {v.type} — {v.plate}
                        </div>
                        <div className="vehicle-option__sub">
                          {v.model} · {v.seats} seats · {formatMoney(v.dailyRate)}/day
                        </div>
                      </div>
                      <div className="vehicle-option__meta">
                        <StatusBadge status={v.status} dot />
                        {form.vehicleId === v.id && <Check size={18} style={{ color: 'var(--primary)' }} />}
                      </div>
                    </button>
                  ))}
                </div>
              )
            ) : selectedVehicle ? (
              <div
                className="vehicle-option vehicle-option--selected"
                style={{ cursor: 'default', marginBottom: 8 }}
              >
                <div>
                  <div className="vehicle-option__main">
                    {selectedVehicle.type} — {selectedVehicle.plate}
                  </div>
                  <div className="vehicle-option__sub">
                    {selectedVehicle.model} · {selectedVehicle.seats} seats · {formatMoney(selectedVehicle.dailyRate)}/day
                  </div>
                </div>
                <div className="vehicle-option__meta">
                  <StatusBadge status={enrichVehicle(selectedVehicle, bookings).status} dot />
                  <Check size={18} style={{ color: 'var(--primary)' }} />
                </div>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '20px' }}>
                <Car size={28} />
                <div className="empty-state__title">No vehicle selected</div>
                <div className="empty-state__sub">Click the search box to browse available vehicles, or use the AI Assistant.</div>
              </div>
            )}
            <div className="form-hint" style={{ marginTop: 8 }}>
              Vehicles marked <strong>In Use</strong> or <strong>In Maintenance</strong> are not selectable.
              {!vehicleListOpen && Boolean(candidates.length) && datesComplete && (
                <span style={{ color: 'var(--success)' }}>
                  {' '}— {candidates.length} free for {range.pickupDate} → {range.returnDate}.
                </span>
              )}
              {vehicleListOpen && Boolean(candidates.length) && datesComplete && (
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
                <div className="detail-item__value">{selectedVehicle ? formatMoney(selectedVehicle.dailyRate) : '—'}</div>
              </div>
              <div className="detail-item" style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                <div className="detail-item__label">Trip Duration</div>
                <div className="detail-item__value">{datesComplete && durationLabel ? durationLabel : '—'}</div>
              </div>
              <div className="form-group" style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                <label className="form-label" htmlFor="cust-charges">Additional Charges (₱)</label>
                <input id="cust-charges" className="form-input" type="number" min="0" step="50" value={form.additionalCharges} onChange={set('additionalCharges')} />
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
        client={{ name: form.clientName, contact: form.contact, email: form.email }}
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
        bookings={bookings}
        vehicles={myVehicles}
        notify={notify}
        onPickVehicle={(id) => {
          setForm((p) => ({ ...p, vehicleId: id }));
        }}
      />
    </>
  );
}