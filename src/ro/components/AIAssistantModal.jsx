import { useEffect, useState } from 'react';
import { Sparkles, Check, AlertTriangle, Info, CircleAlert } from 'lucide-react';
import Modal from './Modal.jsx';
import { analyzeTrip } from '../services/aiAssistantService.js';
import StatusBadge from './StatusBadge.jsx';

export default function AIAssistantModal({ open, onClose, client, trip, passengers, selectedVehicleId, onPickVehicle, bookings = [], vehicles = [], notify }) {
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const timer = setTimeout(() => {
      setAnalysis(
        analyzeTrip({ client, trip, bookings, vehicles, passengers, selectedVehicleId }),
      );
      setLoading(false);
    }, 550);
    return () => clearTimeout(timer);
}, [open, client, trip, passengers, selectedVehicleId, bookings, vehicles]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="AI Assistant"
      subtitle="Booking assistance — recommendations only, final decision is yours"
      size="lg"
      className="ai-modal"
    >
      {loading ? (
        <div className="loading-state">
          <span className="spinner" /> Analyzing booking request…
        </div>
      ) : analysis ? (
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="ai-banner">
            <Sparkles size={18} />
            <div className="ai-summary">
              <strong>AI Recommendation</strong>
              <div style={{ marginTop: 4, fontWeight: 400 }}>{analysis.recommendation}</div>
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
                    {analysis.recommendedVehicle.model} · {analysis.recommendedVehicle.seats} seats · ₱{' '}
                    {analysis.recommendedVehicle.dailyRate.toLocaleString()}/day
                  </div>
                </div>
                <div className="vehicle-option__meta">
                  <StatusBadge status={analysis.recommendedVehicle.status} />
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={() => {
                      onPickVehicle?.(analysis.recommendedVehicle.id);
                      notify?.('info', `${analysis.recommendedVehicle.type} added to your booking.`);
                      onClose?.();
                    }}
                  >
                    <Check size={15} /> Use this vehicle
                  </button>
                </div>
              </div>
            </div>
          )}

          {analysis.missing.length > 0 && (
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

          {analysis.warnings.length > 0 && (
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

          {analysis.duplicates.length > 0 && (
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

          {analysis.missing.length === 0 &&
            analysis.warnings.length === 0 &&
            analysis.duplicates.length === 0 && (
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
                <span>Suggest the most suitable available vehicle for the trip dates and party size.</span>
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
          </div>
        </div>
      ) : null}
    </Modal>
  );
}