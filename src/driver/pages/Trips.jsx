import { useEffect, useState } from 'react';
import { apiFetch } from '../../services/api.js';
import { Truck, MapPin, User, Check, X, Clock, Navigation, Eye } from 'lucide-react';

const STATUS_STYLES = {
  confirmed: 'confirmed',
  on_trip: 'on-trip',
  completed: 'completed',
  cancelled: 'cancelled',
};

const STATUS_LABELS = {
  confirmed: 'Confirmed',
  on_trip: 'On Trip',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const Trips = () => {
  const [data, setData] = useState({ active: [], history: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [showTripModal, setShowTripModal] = useState(false);

  useEffect(() => {
    apiFetch('trips.php')
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const act = async (trip, action, label) => {
    if (action !== 'accept' && !window.confirm(`${label} trip ${trip.tripCode}?`)) return;
    setError('');
    setBusy(`${action}:${trip.id}`);
    try {
      await apiFetch('trips.php', {
        method: 'POST',
        body: JSON.stringify({ action, id: trip.id })
      });
      const fresh = await apiFetch('trips.php');
      setData(fresh);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };

  const renderActionButtons = (trip) => {
    const disabled = busy !== null;
    if (trip.status === 'confirmed') {
      return (
        <div className="actions-row">
          <button type="button" className="btn sm" onClick={() => { setSelectedTrip(trip); setShowTripModal(true); }} disabled={disabled}>
            <Eye size={15} /> View
          </button>
          <button className="btn btn-primary sm" onClick={() => act(trip, 'accept', 'Accept')} disabled={disabled}>
            <Check size={14} /> Accept
          </button>
          <button className="btn btn-danger-ghost sm" onClick={() => act(trip, 'cancel', 'Cancel')} disabled={disabled}>
            <X size={14} /> Cancel
          </button>
        </div>
      );
    }
    return (
      <div className="actions-row">
        <button type="button" className="btn sm" onClick={() => { setSelectedTrip(trip); setShowTripModal(true); }} disabled={disabled}>
          <Eye size={15} /> View
        </button>
        <button className="btn btn-primary sm" onClick={() => act(trip, 'done', 'Complete')} disabled={disabled}>
          <Check size={14} /> Trip Done
        </button>
        <button className="btn btn-danger-ghost sm" onClick={() => act(trip, 'cancel', 'Cancel')} disabled={disabled}>
          <X size={14} /> Cancel
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="panel">
        <div className="empty">
          <Truck size={46} />
          <div className="help">Loading trips...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div>
      )}

      {/* Active trips */}
      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-head">
          <h3>Active Trips <span className="badge count" style={{ marginLeft: 8 }}>{data.active.length}</span></h3>
          <span className="meta">Accept dispatched trips or mark them done when finished.</span>
        </div>
        {data.active.length === 0 ? (
          <div className="empty">
            <Truck size={40} />
            <div className="help" style={{ marginTop: 6 }}>No active trips. New dispatches from Fleet Management will appear here.</div>
          </div>
        ) : (
          data.active.map((trip) => (
            <div key={trip.id} className="assign-card">
              <div className="assign-avatar"><Truck width={18} height={18} /></div>
              <div className="assign-main">
                <div className="name" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {trip.tripCode}
                  <span className={`status ${STATUS_STYLES[trip.status]}`}>{STATUS_LABELS[trip.status]}</span>
                </div>
                <div className="detail" style={{ display: 'grid', gap: 3, marginTop: 6, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <User size={13} /> {trip.client.name} · {trip.client.contact}
                  </span>
                  {trip.client.email && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <User width={13} height={13} /> {trip.client.email}
                    </span>
                  )}
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock width={13} height={13} /> Dispatch: {trip.schedule}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                    <Clock width={13} height={13} /> Client request: {trip.startDate}{trip.pickupTime ? ` ${trip.pickupTime}` : ''} → {trip.endDate}{trip.returnTime ? ` ${trip.returnTime}` : ''}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={13} /> {trip.destination}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Truck width={13} height={13} /> {trip.vehicle.carCode} · {trip.vehicle.model} · {trip.vehicle.plate}{trip.vehicle.type ? ` · ${trip.vehicle.type}` : ''}{trip.vehicle.seats ? ` · ${trip.vehicle.seats} seats` : ''}
                  </span>
                </div>
                <div className="cell-sub" style={{ marginTop: 6 }}>
                  Passengers: {trip.passengers} · Luggage: {trip.lugSize || 'None'}
                </div>
                {trip.specialRequests && (
                  <div className="cell-sub" style={{ marginTop: 4 }}>
                    Special requests: {trip.specialRequests}
                  </div>
                )}
              </div>
              <div className="assign-fleet">{renderActionButtons(trip)}</div>
            </div>
          ))
        )}
      </div>

      {/* Trip history */}
      <div className="panel">
        <div className="panel-head">
          <h3>Trip History <span className="badge count" style={{ marginLeft: 8 }}>{data.history.length}</span></h3>
          <span className="meta">Completed and cancelled trips.</span>
        </div>
        {data.history.length === 0 ? (
          <div className="empty">
            <Navigation size={40} />
            <div className="help" style={{ marginTop: 6 }}>No completed or cancelled trips yet.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
                <thead>
                  <tr>
                    <th>Trip Code</th>
                    <th>Client</th>
                    <th>Client Request</th>
                    <th>Destination</th>
                    <th>Vehicle</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.history.map((trip) => (
                    <tr key={trip.id}>
                      <td className="cell-strong mono">{trip.tripCode}</td>
                      <td>{trip.client.name}<br /><span className="cell-sub">{trip.client.contact}</span></td>
                      <td>{trip.startDate}{trip.pickupTime ? ` ${trip.pickupTime}` : ''} → {trip.endDate}{trip.returnTime ? ` ${trip.returnTime}` : ''}</td>
                      <td>{trip.destination}</td>
                      <td>{trip.vehicle.carCode}</td>
                      <td>
                        <span className={`status ${STATUS_STYLES[trip.status]}`}>{STATUS_LABELS[trip.status]}</span>
                      </td>
                      <td>
                        <button type="button" className="btn sm" onClick={() => { setSelectedTrip(trip); setShowTripModal(true); }}>
                          <Eye size={15} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Trip Details Modal */}
      {showTripModal && selectedTrip && (
        <div className="overlay" onClick={() => setShowTripModal(false)}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Trip Details</h3>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gap: 16 }}>
                <div>
                  <div className="label" style={{ marginBottom: 4 }}>Trip Code</div>
                  <div className="cell-strong mono">{selectedTrip.tripCode}</div>
                </div>
                <div>
                  <div className="label" style={{ marginBottom: 4 }}>Client Information</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <User size={14} />
                    <span>{selectedTrip.client.name} · {selectedTrip.client.contact}</span>
                  </div>
                </div>
                <div>
                  <div className="label" style={{ marginBottom: 4 }}>Schedule</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={14} />
                    <span>{selectedTrip.schedule}</span>
                  </div>
                </div>
                <div>
                  <div className="label" style={{ marginBottom: 4 }}>Destination</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={14} />
                    <span>{selectedTrip.destination}</span>
                  </div>
                </div>
                <div>
                  <div className="label" style={{ marginBottom: 4 }}>Vehicle Information</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Truck size={14} />
                    <span>{selectedTrip.vehicle.carCode} · {selectedTrip.vehicle.model} · {selectedTrip.vehicle.plate}</span>
                  </div>
                </div>
                <div>
                  <div className="label" style={{ marginBottom: 4 }}>Trip Details</div>
                  <div className="cell-sub">
                    Passengers: {selectedTrip.passengers} · Luggage: {selectedTrip.lugSize || 'None'} · Purpose: {selectedTrip.purpose}
                  </div>
                </div>
                <div>
                  <div className="label" style={{ marginBottom: 4 }}>Status</div>
                  <span className={`status ${STATUS_STYLES[selectedTrip.status]}`}>{STATUS_LABELS[selectedTrip.status]}</span>
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-primary" onClick={() => setShowTripModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Trips;