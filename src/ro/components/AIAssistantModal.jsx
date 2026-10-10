import { useEffect, useState } from 'react';
import { Sparkles, Check, AlertTriangle, Info, CircleAlert, Car, Wallet } from 'lucide-react';
import Modal from './Modal.jsx';
import { fetchRecommendationWithFallback, logChoice } from '../services/aiAssistantService.js';
import StatusBadge from './StatusBadge.jsx';
import { formatMoney } from '../utils/format.js';

const EMPTY_PREFS = { budget: '', luggageSize: '', preferredType: '', driverPref: '' };

const scoreBadge = (pct) => (
  <span className="badge badge--info" title="Model match score">
    {pct}% match
  </span>
);

export default function AIAssistantModal({
  open,
  onClose,
  client,
  trip,
  passengers,
  selectedVehicleId,
  onPickVehicle,
  bookings = [],
  vehicles = [],
  notify,
  needDriver = null,
}) {
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [prefs, setPrefs] = useState(EMPTY_PREFS);

  // When the booking form provides "Do You Need a Driver?" (customer flow),
  // Driver Preference is a read-only mirror of that choice instead of an
  // independent setting. Reservation-officer flow has no such section, so it
  // keeps the editable dropdown.
  const mirrorDriver = needDriver !== null;

  const setPref = (key) => (e) => setPrefs((p) => ({ ...p, [key]: e.target.value }));

  useEffect(() => {
    if (!open) return;
    setPrefs({ ...EMPTY_PREFS });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const timer = setTimeout(async () => {
      try {
        const result = await fetchRecommendationWithFallback({
          client,
          trip,
          passengers,
          selectedVehicleId,
          bookings,
          vehicles,
          budget: prefs.budget !== '' ? Number(prefs.budget) : null,
          luggageSize: prefs.luggageSize || null,
          preferredType: prefs.preferredType || null,
          needDriver: mirrorDriver ? needDriver || null : prefs.driverPref || null,
        });
        if (!cancelled) {
          setAnalysis(result);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'The assistant could not analyze this request.');
          setLoading(false);
        }
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, client, trip, passengers, selectedVehicleId, prefs, needDriver]);

  const model = analysis?.model || null;
  const baseModelNote =
    model?.source === 'trained'
      ? `Ranker model v${model.version} · trained ${model.trainedAt ? model.trainedAt.slice(0, 10) : '—'}` +
        (model.accuracy != null ? ` · ${Math.round(model.accuracy * 100)}% top-1 accuracy` : '')
      : model?.source === 'default'
        ? 'Built-in default weights — run training/train.py to activate the trained model.'
        : model?.source === 'offline'
          ? 'Offline mode — basic capacity/rate analysis (assistant API unreachable).'
          : '';
  const comp = model?.components;
  const activeComponents = ['request'];
  if (comp?.collaborative?.available) activeComponents.push('CF');
  if (comp?.content?.available) activeComponents.push('CB');
  const modelNote =
    baseModelNote + (comp && activeComponents.length > 1 ? ` · hybrid: ${activeComponents.join('+')}` : '');

  const useVehicle = (vehicle) => {
    // Raw behavior for the training gate (validated/classified server-side).
    logChoice({ logId: analysis?.logId, vehicleId: vehicle.id, pickedFrom: 'assistant' });
    onPickVehicle?.(vehicle.id, analysis?.logId ?? null);
    notify?.('info', `${vehicle.type} ${vehicle.plate} added to your booking.`);
    onClose?.();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="AI Assistant"
      subtitle="Booking assistance — recommendations only, final decision is yours"
      size="lg"
      className="ai-modal"
    >
      <div style={{ display: 'grid', gap: 16 }}>
        {/* Preferences the ranker evaluates (optional) */}
        <div className="form-section">
          <div className="form-section__title" style={{ marginBottom: 12 }}>
            <Car size={16} style={{ color: 'var(--primary)' }} />
            Your Preferences <span style={{ fontWeight: 400, color: 'var(--text-faint)' }}>(optional — refine the recommendation)</span>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="ai-budget">
                <Wallet size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
                Trip Budget (₱ total)
              </label>
              <input
                id="ai-budget"
                className="form-input"
                type="number"
                min="0"
                step="100"
                placeholder="e.g. 15000 for the whole trip"
                value={prefs.budget}
                onChange={setPref('budget')}
              />
              <div className="form-hint">Total for all rental days.</div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="ai-luggage">Luggage</label>
              <select id="ai-luggage" className="form-select" value={prefs.luggageSize} onChange={setPref('luggageSize')}>
                <option value="">Any / not specified</option>
                <option value="small">Small (2 pieces)</option>
                <option value="medium">Medium (4 pieces)</option>
                <option value="large">Large (6+ pieces)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="ai-type">Preferred Vehicle Type</label>
              <select id="ai-type" className="form-select" value={prefs.preferredType} onChange={setPref('preferredType')}>
                <option value="">No preference</option>
                <option value="AUV">AUV (compact)</option>
                <option value="SEDAN">Sedan</option>
                <option value="L300">Utility Van (L300)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="ai-driver">Driver Preference</label>
              {mirrorDriver ? (
                <>
                  <div
                    className="form-input"
                    style={{ background: 'var(--bg-2, #f6f8fb)', opacity: 0.9, display: 'flex', alignItems: 'center' }}
                    aria-readonly="true"
                  >
                    {needDriver === 'yes'
                      ? 'Yes — with driver'
                      : needDriver === 'no'
                        ? 'No — self-drive'
                        : 'Not selected yet'}
                  </div>
                  <div className="form-hint">
                    Synced with “Do You Need a Driver?” on the booking form — change it there.
                  </div>
                </>
              ) : (
                <select id="ai-driver" className="form-select" value={prefs.driverPref} onChange={setPref('driverPref')}>
                  <option value="">Any</option>
                  <option value="yes">With driver</option>
                  <option value="no">Self-drive</option>
                </select>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <span className="spinner" /> Analyzing booking request against the live fleet…
          </div>
        ) : error ? (
          <div className="ai-list__item ai-list__item--red" style={{ padding: 12 }}>
            <CircleAlert size={16} style={{ color: 'var(--danger)', marginTop: 1 }} />
            <span>{error}</span>
          </div>
        ) : analysis ? (
          <>
            <div className="ai-banner">
              <Sparkles size={18} />
              <div className="ai-summary">
                <strong>AI Recommendation</strong>
                <div style={{ marginTop: 4, fontWeight: 400 }}>{analysis.recommendation}</div>
                {typeof analysis.candidateCount === 'number' && (
                  <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-2)' }}>
                    Scored {analysis.candidateCount} available vehicle{analysis.candidateCount === 1 ? '' : 's'} ·
                    checked {analysis.checkedCount} in fleet
                    {analysis.tripDays ? ` · ${analysis.tripDays} rental day${analysis.tripDays === 1 ? '' : 's'}` : ''}
                  </div>
                )}
              </div>
            </div>

            {analysis.recommendedVehicle && (
              <div className="form-section" style={{ borderColor: 'var(--primary)', background: 'var(--primary-soft)' }}>
                <div className="form-section__title" style={{ marginBottom: 10 }}>
                  <Sparkles size={16} /> Suggested Vehicle
                </div>
                <div className="vehicle-option vehicle-option--selected" style={{ cursor: 'default' }}>
                  <div>
                    <div className="vehicle-option__main">
                      {analysis.recommendedVehicle.type} — {analysis.recommendedVehicle.plate}
                    </div>
                    <div className="vehicle-option__sub">
                      {analysis.recommendedVehicle.model} · {analysis.recommendedVehicle.seats} seats ·{' '}
                      {analysis.recommendedVehicle.luggageCapacity != null
                        ? `${analysis.recommendedVehicle.luggageCapacity}-piece luggage · `
                        : ''}
                      {formatMoney(analysis.recommendedVehicle.dailyRate)}/day
                      {analysis.recommendedVehicle.estimatedTotal
                        ? ` · est. ${formatMoney(analysis.recommendedVehicle.estimatedTotal)} total`
                        : ''}
                    </div>
                  </div>
                  <div className="vehicle-option__meta">
                    {analysis.recommendedVehicle.scorePct != null && scoreBadge(analysis.recommendedVehicle.scorePct)}
                    <StatusBadge status={analysis.recommendedVehicle.status} />
                    <button type="button" className="btn btn--primary btn--sm" onClick={() => useVehicle(analysis.recommendedVehicle)}>
                      <Check size={15} /> Use this vehicle
                    </button>
                  </div>
                </div>

                {analysis.reasons?.length > 0 && (
                  <ul className="ai-list" style={{ marginTop: 12 }}>
                    {analysis.reasons.map((r, i) => (
                      <li key={i} className="ai-list__item ai-list__item--green">
                        <Check size={16} style={{ color: 'var(--success)', marginTop: 1 }} />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {analysis.alternatives?.length > 0 && (
              <div className="ai-section">
                <h4>Other suitable vehicles</h4>
                <div className="vehicle-picker">
                  {analysis.alternatives.map((v) => (
                    <div key={v.id} className="vehicle-option" style={{ cursor: 'default' }}>
                      <div>
                        <div className="vehicle-option__main">
                          {v.type} — {v.plate}
                        </div>
                        <div className="vehicle-option__sub">
                          {v.model} · {v.seats} seats · {formatMoney(v.dailyRate)}/day
                          {v.estimatedTotal ? ` · est. ${formatMoney(v.estimatedTotal)} total` : ''}
                        </div>
                      </div>
                      <div className="vehicle-option__meta">
                        {v.scorePct != null && scoreBadge(v.scorePct)}
                        <button type="button" className="btn btn--secondary btn--sm" onClick={() => useVehicle(v)}>
                          Use
                        </button>
                      </div>
                    </div>
                  ))}
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
                      <span>
                        <strong>{m.field}:</strong> {m.message}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.warnings?.length > 0 && (
              <div className="ai-section">
                <h4>Scheduling & availability warnings</h4>
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

            {!analysis.missing?.length &&
              !analysis.warnings?.length &&
              !analysis.duplicates?.length && (
                <div className="ai-list__item ai-list__item--green">
                  <Check size={16} style={{ color: 'var(--success)', marginTop: 1 }} />
                  <span>No conflicts detected. The booking details look complete and available for the selected dates.</span>
                </div>
              )}

            <div className="ai-section">
              <h4>What the assistant can do</h4>
              <ul className="ai-list">
                <li className="ai-list__item">
                  <Info size={16} style={{ color: 'var(--primary)', marginTop: 1 }} />
                  <span>Rank every vehicle that is actually available for the trip dates against your passengers, budget, luggage and type preferences.</span>
                </li>
                <li className="ai-list__item">
                  <Info size={16} style={{ color: 'var(--primary)', marginTop: 1 }} />
                  <span>Flag scheduling conflicts, missing booking details, and possible duplicates.</span>
                </li>
                <li className="ai-list__item">
                  <Info size={16} style={{ color: 'var(--primary)', marginTop: 1 }} />
                  <span>The AI never auto-confirms a booking — the final decision stays with you.</span>
                </li>
              </ul>
              {modelNote && (
                <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--text-faint)' }}>{modelNote}</div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  );
}
