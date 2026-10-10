import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, MapPin, Car, User, Check, ArrowRight, ArrowLeft,
  AlertTriangle, CircleAlert, CalendarClock, Upload, FileText, X,
} from 'lucide-react';
import Modal from '../../ro/components/Modal.jsx';
import StatusBadge from '../../ro/components/StatusBadge.jsx';
import { DatePopupField, TimePopupField } from '../../ro/components/PopupPicker.jsx';
import { fetchRecommendation, logChoice } from '../../ro/services/aiAssistantService.js';
import { describeDuration, formatMoney } from '../../ro/utils/format.js';
import { createBooking } from '../services/customerService.js';

const STEPS = [
  { n: 1, label: 'Trip Details' },
  { n: 2, label: 'AI Recommendations' },
  { n: 3, label: 'Customer Details' },
];

const scoreBadge = (pct) => (
  <span className="badge badge--info" title="Model match score">{pct}% match</span>
);

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

function StepBar({ step }) {
  return (
    <ol className="ideal-steps" aria-label="Reservation progress">
      {STEPS.map((s, i) => {
        const state = step > s.n ? 'is-done' : step === s.n ? 'is-active' : '';
        return (
          <li key={s.n} className={`ideal-steps__item ${state}`}>
            <span className="step-num">{s.n}</span>
            <span className="ideal-steps__label">{s.label}</span>
            {i < STEPS.length - 1 && (
              <span
                className={`ideal-steps__line${step > s.n ? ' is-done' : ''}`}
                aria-hidden="true"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default function FindIdealVehicleModal({ open, onClose, vehicles = [], bookings = [], profile = null, notify }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [trip, setTrip] = useState(null);
  const [details, setDetails] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [selected, setSelected] = useState(null);
  const [recommendationLogId, setRecommendationLogId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [licenseImage, setLicenseImage] = useState(null);
  const [licenseDragging, setLicenseDragging] = useState(false);
  const licenseFileRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const today = new Date().toISOString().slice(0, 10);
    setTrip({
      destination: '',
      pickupDate: today,
      pickupTime: '12:00',
      returnDate: today,
      returnTime: '18:00',
      passengers: '',
      budget: '',
      luggageSize: '',
      preferredType: '',
    });
    setDetails({
      needDriver: '',
      clientName: profile?.account?.name || '',
      contact: profile?.account?.contactNumber || '',
      email: profile?.account?.email || '',
      specialRequests: '',
    });
    setErrors({});
    setStep(1);
    setLoading(false);
    setAnalysis(null);
    setSelected(null);
    setRecommendationLogId(null);
    setSubmitting(false);
    setLicenseImage(null);
  }, [open, profile]);

  if (!trip || !details) return null;

  const setTripField = (key) => (e) => setTrip((p) => ({ ...p, [key]: e.target.value }));
  const setDetailField = (key) => (e) => setDetails((p) => ({ ...p, [key]: e.target.value }));

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

  const removeLicense = () => setLicenseImage(null);

  const datesInvalid = Boolean(trip.pickupDate && trip.returnDate && trip.returnDate < trip.pickupDate);

  const validateTrip = () => {
    const errs = {};
    if (!trip.destination.trim()) errs.destination = 'Destination is required.';
    if (!trip.pickupDate) errs.pickupDate = 'Pickup date is required.';
    if (!trip.pickupTime) errs.pickupTime = 'Pickup time is required.';
    if (!trip.returnDate) errs.returnDate = 'Return date is required.';
    if (!trip.returnTime) errs.returnTime = 'Return time is required.';
    if (trip.pickupDate && trip.returnDate && trip.returnDate < trip.pickupDate)
      errs.returnDate = 'Return date cannot be earlier than pickup date.';
    if (trip.pickupDate === trip.returnDate && trip.pickupTime && trip.returnTime && trip.returnTime < trip.pickupTime)
      errs.returnTime = 'Drop-off time cannot be earlier than pickup time on the same day.';
    const pax = Number(trip.passengers);
    if (!trip.passengers || !Number.isInteger(pax) || pax < 1 || pax > 50)
      errs.passengers = 'Number of passengers must be between 1 and 50.';
    const budget = Number(trip.budget);
    if (!trip.budget || Number.isNaN(budget) || budget <= 0)
      errs.budget = 'Trip budget is required.';
    if (!trip.luggageSize) errs.luggageSize = 'Luggage size is required.';
    if (!trip.preferredType) errs.preferredType = 'Preferred vehicle type is required.';
    if (!details.clientName.trim()) errs.clientName = 'Full name is required.';
    if (!details.contact.trim()) errs.contact = 'Contact number is required.';
    if (!details.email.trim()) errs.email = 'Email address is required.';
    return errs;
  };

  const validateDetails = () => {
    const errs = {};
    if (!details.needDriver) errs.needDriver = 'Please select whether you need a driver.';
    if (details.needDriver === 'no' && !licenseImage)
      errs.driverLicenseImage = "Driver's license image is required for self-drive.";
    if (!details.clientName.trim()) errs.clientName = 'Full name is required.';
    if (!details.contact.trim()) errs.contact = 'Contact number is required.';
    else if (!/^[0-9+\-()\s]{7,}$/.test(details.contact.trim())) errs.contact = 'Please enter a valid contact number.';
    if (!details.email.trim()) errs.email = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email.trim())) errs.email = 'Please enter a valid email address.';
    return errs;
  };

  const runAnalysis = async () => {
    const errs = validateTrip();
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSelected(null);
    setRecommendationLogId(null);
    setAnalysis(null);
    setLoading(true);
    setStep(2);
    try {
      const result = await fetchRecommendation({
        client: {
          name: details.clientName.trim(),
          contact: details.contact.trim(),
          email: details.email.trim(),
        },
        trip: {
          destination: trip.destination.trim(),
          pickupDate: trip.pickupDate,
          pickupTime: trip.pickupTime,
          returnDate: trip.returnDate,
          returnTime: trip.returnTime,
          specialRequests: '',
        },
        passengers: Number(trip.passengers) || 0,
        selectedVehicleId: null,
        budget: Number(trip.budget) || null,
        luggageSize: trip.luggageSize || null,
        preferredType: trip.preferredType || null,
        needDriver: null,
      });
      if (!result) throw new Error('The AI service returned an unreadable response. Please try again.');
      setAnalysis(result);
    } catch (err) {
      setStep(1);
      notify?.('error', err.message || 'The AI could not analyze this request.');
    } finally {
      setLoading(false);
    }
  };

  const pickVehicle = (vehicle, rankIndex) => {
    setSelected(vehicle);
    const logId = analysis?.logId ?? null;
    setRecommendationLogId(logId);
    // Raw behavior for the training gate (validated/classified server-side).
    logChoice({ logId, vehicleId: vehicle.id, pickedFrom: rankIndex === 0 ? 'recommended' : 'alternative' });
  };

  const handleSubmit = async () => {
    const errs = validateDetails();
    setErrors(errs);
    if (Object.keys(errs).length) {
      notify?.('error', 'Please fix the highlighted fields before submitting your reservation.');
      return;
    }
    setSubmitting(true);
    try {
      const duration = describeDuration({
        pickupDate: trip.pickupDate,
        pickupTime: trip.pickupTime,
        returnDate: trip.returnDate,
        returnTime: trip.returnTime,
      });
      const days = Math.max(1, duration.days || 1);
      await createBooking({
        vehicleId: selected.id,
        client: {
          name: details.clientName.trim(),
          contact: details.contact.trim(),
          email: details.email.trim(),
        },
        trip: {
          destination: trip.destination.trim(),
          pickupDate: trip.pickupDate,
          pickupTime: trip.pickupTime,
          returnDate: trip.returnDate,
          returnTime: trip.returnTime,
          passengers: Number(trip.passengers) || 0,
          needDriver: details.needDriver || null,
          driverLicenseImage: licenseImage?.dataUrl || null,
          specialRequests: details.specialRequests.trim(),
        },
        estimatedTotal: selected.dailyRate * days,
        recommendationLogId: recommendationLogId || null,
      });
      setStep(4);
    } catch (err) {
      notify?.('error', err.message || 'Unable to submit reservation.');
    } finally {
      setSubmitting(false);
    }
  };

  const ranked = analysis?.recommendedVehicle
    ? [analysis.recommendedVehicle, ...(analysis.alternatives || [])]
    : [];
  const duration = describeDuration({
    pickupDate: trip.pickupDate,
    pickupTime: trip.pickupTime,
    returnDate: trip.returnDate,
    returnTime: trip.returnTime,
  });

  const vehicleLine = (v) => (
    <>
      <div className="vehicle-option__main">
        {v.type} — {v.plate}
      </div>
      <div className="vehicle-option__sub">
        {v.model} · {v.seats} seats
        {v.luggageCapacity != null ? ` · ${v.luggageCapacity}-piece luggage` : ''} · {formatMoney(v.dailyRate)}/day
        {v.estimatedTotal ? ` · est. ${formatMoney(v.estimatedTotal)} total` : ''}
      </div>
    </>
  );

  const renderRankItem = (v, idx) => {
    const isSelected = selected?.id === v.id;
    return (
      <div
        key={v.id}
        className={`vehicle-option${isSelected ? ' vehicle-option--selected' : ''}`}
        style={{ cursor: 'pointer', marginBottom: 8 }}
        onClick={() => pickVehicle(v, idx)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') pickVehicle(v, idx); }}
      >
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
          <span
            className="badge badge--neutral"
            style={{ minWidth: 24, justifyContent: 'center', flexShrink: 0 }}
          >
            {idx + 1}
          </span>
          <div style={{ minWidth: 0 }}>
            {vehicleLine(v)}
            {idx === 0 && (
              <span className="badge badge--info" style={{ marginTop: 4 }}>
                <Sparkles size={11} style={{ marginRight: 3, verticalAlign: -1 }} /> Best match
              </span>
            )}
          </div>
        </div>
        <div className="vehicle-option__meta">
          {v.scorePct != null && scoreBadge(v.scorePct)}
          <StatusBadge status={v.status} />
          {isSelected ? (
            <span className="badge badge--info"><Check size={12} style={{ marginRight: 3 }} /> Selected</span>
          ) : (
            <span className="btn btn--secondary btn--sm" style={{ pointerEvents: 'none' }}>Select</span>
          )}
        </div>
      </div>
    );
  };

  const footerByStep = {
    1: (
      <>
        <button type="button" className="btn btn--secondary" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn--primary" onClick={runAnalysis} disabled={loading}>
          <Sparkles size={16} /> Get Recommendations
        </button>
      </>
    ),
    2: (
      <>
        <button type="button" className="btn btn--secondary" onClick={() => setStep(1)} disabled={loading}>
          <ArrowLeft size={16} /> Back
        </button>
        <button type="button" className="btn btn--primary" onClick={() => setStep(3)} disabled={!selected}>
          Next <ArrowRight size={16} />
        </button>
      </>
    ),
    3: (
      <>
        <button type="button" className="btn btn--secondary" onClick={() => setStep(2)} disabled={submitting}>
          <ArrowLeft size={16} /> Back
        </button>
        <button type="button" className="btn btn--primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? <span className="spinner spinner--sm" /> : <Check size={16} />}
          {submitting ? 'Submitting…' : 'Submit Reservation'}
        </button>
      </>
    ),
    4: (
      <>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => { onClose?.(); navigate('/reservations'); }}
        >
          Close
        </button>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => { onClose?.(); navigate('/reservations'); }}
        >
          View My Reservations <ArrowRight size={16} />
        </button>
      </>
    ),
  };

  const subtitleByStep = {
    1: 'Tell us about your trip — the AI analyzes it against the live fleet.',
    2: 'Vehicles ranked best match first — pick one to continue.',
    3: 'Confirm who is booking, then submit your reservation.',
    4: 'Reservation submitted successfully.',
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      lockClose={submitting}
      title="Find My Ideal Vehicle"
      subtitle={subtitleByStep[step]}
      size="xl"
      className="ai-modal ideal-wizard"
      footer={footerByStep[step]}
    >
      <div style={{ display: 'grid', gap: 20 }}>
        {step < 4 && <StepBar step={step} />}

        {step === 1 && (
          <>
            <div className="form-section">
              <div className="form-section__title" style={{ marginBottom: 12 }}>
                <MapPin size={16} style={{ color: 'var(--primary)' }} /> Trip Details
              </div>
              <div className="form-grid">
                <div className="form-group full">
                  <label className="form-label" htmlFor="ideal-destination">
                    Destination <span className="req">*</span>
                  </label>
                  <div className={`form-input input-with-icon${errors.destination ? ' is-invalid' : ''}`}>
                    <MapPin size={15} className="input-with-icon__icon" />
                    <input
                      id="ideal-destination"
                      type="text"
                      placeholder="Enter destination"
                      value={trip.destination}
                      onChange={setTripField('destination')}
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
                      <label className="form-label" htmlFor="ideal-pickupDate">Date <span className="req">*</span></label>
                      <DatePopupField
                        value={trip.pickupDate}
                        invalid={Boolean(errors.pickupDate)}
                        onSelect={(v) =>
                          setTrip((p) => ({
                            ...p,
                            pickupDate: v,
                            returnDate: p.returnDate && p.returnDate < v ? v : p.returnDate,
                          }))
                        }
                      />
                      {errors.pickupDate && <div className="form-error">{errors.pickupDate}</div>}
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="ideal-pickupTime">Time <span className="req">*</span></label>
                      <TimePopupField
                        value={trip.pickupTime}
                        onSelect={(v) => setTrip((p) => ({ ...p, pickupTime: v }))}
                      />
                      {errors.pickupTime && <div className="form-error">{errors.pickupTime}</div>}
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
                      <label className="form-label" htmlFor="ideal-returnDate">Date <span className="req">*</span></label>
                      <DatePopupField
                        value={trip.returnDate}
                        minDate={trip.pickupDate || undefined}
                        invalid={Boolean(errors.returnDate)}
                        onSelect={(v) => setTrip((p) => ({ ...p, returnDate: v }))}
                      />
                      {errors.returnDate && <div className="form-error">{errors.returnDate}</div>}
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="ideal-returnTime">Time <span className="req">*</span></label>
                      <TimePopupField
                        value={trip.returnTime}
                        onSelect={(v) => setTrip((p) => ({ ...p, returnTime: v }))}
                      />
                      {errors.returnTime && <div className="form-error">{errors.returnTime}</div>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-grid" style={{ marginTop: 14 }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="ideal-passengers">
                    Number of Passengers <span className="req">*</span>
                  </label>
                  <input
                    id="ideal-passengers"
                    className={`form-input${errors.passengers ? ' is-invalid' : ''}`}
                    type="number"
                    min="1"
                    max="50"
                    placeholder="e.g. 4"
                    value={trip.passengers}
                    onChange={setTripField('passengers')}
                  />
                  {errors.passengers && <div className="form-error">{errors.passengers}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ideal-budget">
                    Budget (₱ total) <span className="req">*</span>
                  </label>
                  <input
                    id="ideal-budget"
                    className={`form-input${errors.budget ? ' is-invalid' : ''}`}
                    type="number"
                    min="0"
                    step="100"
                    placeholder="e.g. 15000 for the whole trip"
                    value={trip.budget}
                    onChange={setTripField('budget')}
                  />
                  {errors.budget && <div className="form-error">{errors.budget}</div>}
                  <div className="form-hint">Total for all rental days.</div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ideal-luggage">
                    Luggage Size <span className="req">*</span>
                  </label>
                  <select
                    id="ideal-luggage"
                    className={`form-select${errors.luggageSize ? ' is-invalid' : ''}`}
                    value={trip.luggageSize}
                    onChange={setTripField('luggageSize')}
                  >
                    <option value="">Select size…</option>
                    <option value="small">Small (2 pieces)</option>
                    <option value="medium">Medium (4 pieces)</option>
                    <option value="large">Large (6+ pieces)</option>
                  </select>
                  {errors.luggageSize && <div className="form-error">{errors.luggageSize}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ideal-type">
                    Preferred Vehicle Type <span className="req">*</span>
                  </label>
                  <select
                    id="ideal-type"
                    className={`form-select${errors.preferredType ? ' is-invalid' : ''}`}
                    value={trip.preferredType}
                    onChange={setTripField('preferredType')}
                  >
                    <option value="">Select type…</option>
                    <option value="AUV">AUV</option>
                    <option value="SEDAN">Sedan</option>
                    <option value="L300">Utility Van (L300)</option>
                  </select>
                  {errors.preferredType && <div className="form-error">{errors.preferredType}</div>}
                </div>
              </div>

              <div className="form-section__title" style={{ margin: '16px 0 10px' }}>
                <User size={15} style={{ color: 'var(--primary)' }} /> Your Details
                <span style={{ fontWeight: 400, color: 'var(--text-faint)', marginLeft: 6 }}>
                  (needed for the AI analysis)
                </span>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="ideal-name">Full Name <span className="req">*</span></label>
                  <input
                    id="ideal-name"
                    className={`form-input${errors.clientName ? ' is-invalid' : ''}`}
                    type="text"
                    value={details.clientName}
                    onChange={setDetailField('clientName')}
                  />
                  {errors.clientName && <div className="form-error">{errors.clientName}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ideal-contact">Contact Number <span className="req">*</span></label>
                  <input
                    id="ideal-contact"
                    className={`form-input${errors.contact ? ' is-invalid' : ''}`}
                    type="text"
                    value={details.contact}
                    onChange={setDetailField('contact')}
                  />
                  {errors.contact && <div className="form-error">{errors.contact}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ideal-email">Email Address <span className="req">*</span></label>
                  <input
                    id="ideal-email"
                    className={`form-input${errors.email ? ' is-invalid' : ''}`}
                    type="email"
                    value={details.email}
                    onChange={setDetailField('email')}
                  />
                  {errors.email && <div className="form-error">{errors.email}</div>}
                </div>
              </div>

              {datesInvalid && (
                <div className="form-error" style={{ marginTop: 10 }}>
                  Return date cannot be earlier than pickup date.
                </div>
              )}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            {loading ? (
              <div className="loading-state">
                <span className="spinner" /> Analyzing your trip against the live fleet…
              </div>
            ) : analysis ? (
              <>
                {analysis.recommendedVehicle && (
                  <div className="ai-banner">
                    <Sparkles size={18} />
                    <div className="ai-summary">
                      <strong>AI Recommendation</strong>
                      <div style={{ marginTop: 4, fontWeight: 400 }}>{analysis.recommendation}</div>
                      {typeof analysis.candidateCount === 'number' && (
                        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-2)' }}>
                          Scored {analysis.candidateCount} available vehicle{analysis.candidateCount === 1 ? '' : 's'}
                          {analysis.tripDays ? ` · ${analysis.tripDays} rental day${analysis.tripDays === 1 ? '' : 's'}` : ''}
                          {duration.durationLabel ? ` · ${duration.durationLabel}` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {ranked.length > 0 ? (
                  <>
                    <div className="form-section" style={{ borderColor: 'var(--primary)', background: 'var(--primary-soft)' }}>
                      <div className="form-section__title" style={{ marginBottom: 10 }}>
                        <Car size={16} /> Ranked Matches — best first
                      </div>
                      {ranked.map((v, idx) => renderRankItem(v, idx))}

                      {analysis.reasons?.length > 0 && (
                        <ul className="ai-list" style={{ marginTop: 10 }}>
                          {analysis.reasons.map((r, i) => (
                            <li key={i} className="ai-list__item ai-list__item--green">
                              <Check size={16} style={{ color: 'var(--success)', marginTop: 1 }} />
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div style={{ fontSize: 13, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ArrowRight size={14} style={{ color: 'var(--primary)' }} />
                      Select a vehicle above to enable <strong>Next</strong>.
                    </div>
                  </>
                ) : (
                  <div className="empty-state">
                    <Car size={36} />
                    <div className="empty-state__title">No vehicles match this trip</div>
                    <div className="empty-state__sub">
                      Try adjusting your budget, dates, or passenger count.
                    </div>
                  </div>
                )}

                {analysis.missing?.length > 0 && (
                  <div className="ai-section">
                    <h4>Required information to complete</h4>
                    <ul className="ai-list">
                      {analysis.missing.map((m, i) => (
                        <li key={i} className="ai-list__item ai-list__item--red">
                          <CircleAlert size={16} style={{ color: 'var(--danger)', marginTop: 1 }} />
                          <span><strong>{m.field}:</strong> {m.message}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.warnings?.length > 0 && (
                  <div className="ai-section">
                    <h4>Scheduling &amp; availability warnings</h4>
                    <ul className="ai-list">
                      {analysis.warnings.map((w, i) => (
                        <li key={i} className="ai-list__item ai-list__item--amber">
                          <AlertTriangle size={16} style={{ color: 'var(--warning)', marginTop: 1 }} />
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.duplicates?.length > 0 && (
                  <div className="ai-section">
                    <h4>Possible duplicate bookings detected</h4>
                    <ul className="ai-list">
                      {analysis.duplicates.map((d) => (
                        <li key={d.id} className="ai-list__item ai-list__item--red">
                          <CircleAlert size={16} style={{ color: 'var(--danger)', marginTop: 1 }} />
                          <span>
                            <strong>{d.id}</strong> matches this client ({d.clientName}) for an overlapping period.
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : null}
          </>
        )}

        {step === 3 && (
          <>
            <div className="form-section">
              <div className="form-section__title" style={{ marginBottom: 12 }}>
                <User size={16} style={{ color: 'var(--primary)' }} /> Customer Details
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">
                  Do You Need a Driver? <span className="req">*</span>
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['yes', 'no'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={`btn ${details.needDriver === opt ? 'btn--primary' : 'btn--secondary'}`}
                      style={{ flex: 1 }}
                      onClick={() => setDetails((p) => ({ ...p, needDriver: opt }))}
                    >
                      {opt === 'yes' ? 'Yes — with driver' : 'No — self-drive'}
                    </button>
                  ))}
                </div>
                {errors.needDriver && <div className="form-error">{errors.needDriver}</div>}
              </div>

              {details.needDriver === 'no' && (
                <div className="form-group" style={{ marginBottom: 14 }}>
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
                    <label htmlFor="ideal-license" style={{ cursor: 'pointer', display: 'block' }}>
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
                      id="ideal-license"
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
                  )}

                  {errors.driverLicenseImage && <div className="form-error" style={{ marginTop: 8 }}>{errors.driverLicenseImage}</div>}
                </div>
              )}

              <div className="form-grid">
                <div className="form-group full">
                  <label className="form-label" htmlFor="ideal-fullname">
                    Full Name <span className="req">*</span>
                  </label>
                  <input
                    id="ideal-fullname"
                    className={`form-input${errors.clientName ? ' is-invalid' : ''}`}
                    type="text"
                    placeholder="Your full name"
                    value={details.clientName}
                    onChange={setDetailField('clientName')}
                  />
                  {errors.clientName && <div className="form-error">{errors.clientName}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ideal-fullcontact">
                    Contact Number <span className="req">*</span>
                  </label>
                  <input
                    id="ideal-fullcontact"
                    className={`form-input${errors.contact ? ' is-invalid' : ''}`}
                    type="text"
                    placeholder="09XX XXX XXXX"
                    value={details.contact}
                    onChange={setDetailField('contact')}
                  />
                  {errors.contact && <div className="form-error">{errors.contact}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ideal-fullemail">
                    Email Address <span className="req">*</span>
                  </label>
                  <input
                    id="ideal-fullemail"
                    className={`form-input${errors.email ? ' is-invalid' : ''}`}
                    type="email"
                    placeholder="you@example.com"
                    value={details.email}
                    onChange={setDetailField('email')}
                  />
                  {errors.email && <div className="form-error">{errors.email}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ideal-special">Special Request</label>
                  <textarea
                    id="ideal-special"
                    className="form-textarea"
                    rows={3}
                    maxLength={500}
                    placeholder="Any special requests or notes for this trip"
                    value={details.specialRequests}
                    onChange={setDetailField('specialRequests')}
                  />
                </div>
              </div>
            </div>

            <div className="form-section" style={{ background: 'var(--bg-2, #f6f8fb)' }}>
              <div className="form-section__title" style={{ marginBottom: 10 }}>
                <CalendarClock size={16} style={{ color: 'var(--primary)' }} /> Reservation Summary
              </div>
              <div className="detail-grid">
                <div className="detail-item" style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                  <div className="detail-item__label">Vehicle</div>
                  <div className="detail-item__value">
                    {selected ? `${selected.type} — ${selected.plate} (${selected.model})` : '—'}
                  </div>
                </div>
                <div className="detail-item" style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                  <div className="detail-item__label">Trip</div>
                  <div className="detail-item__value">
                    {trip.destination || '—'} · {trip.pickupDate} → {trip.returnDate}
                  </div>
                </div>
                <div className="detail-item" style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                  <div className="detail-item__label">Trip Duration</div>
                  <div className="detail-item__value">{duration.durationLabel || '—'}</div>
                </div>
                <div className="detail-item" style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                  <div className="detail-item__label">Estimated Total</div>
                  <div className="detail-item__value">
                    {selected ? formatMoney(selected.dailyRate * Math.max(1, duration.days || 1)) : '—'}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {step === 4 && (
          <div className="empty-state" style={{ padding: '28px 12px' }}>
            <div
              style={{
                width: 56, height: 56, borderRadius: '50%', background: 'var(--success-soft)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
              }}
            >
              <Check size={28} style={{ color: 'var(--success)' }} />
            </div>
            <div className="empty-state__title">Reservation submitted!</div>
            <div className="empty-state__sub">
              Your reservation for the {selected?.type} ({selected?.plate}) is now <strong>pending approval</strong>.
              {recommendationLogId ? ' Your AI pick was recorded to improve future recommendations.' : ''}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
