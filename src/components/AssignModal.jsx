import { useState } from 'react'
import { Icon } from './Icons.jsx'

export default function AssignModal({ driver, vehicles, assignments, drivers, onConfirm, onClose }) {
  const [clientName, setClientName] = useState('BDO')
  const [clientContact, setClientContact] = useState('')
  const [tripCode, setTripCode] = useState('')
  const [schedule, setSchedule] = useState('')
  const [destination, setDestination] = useState('')
  const [passengers, setPassengers] = useState(1)
  const [lugSize, setLugSize] = useState('')
  const [vehicleId, setVehicleId] = useState('')
  const [error, setError] = useState('')

  const availableVehicles = vehicles.filter(
    (v) =>
      v.status === 'Available' ||
      (v.status === 'Assigned' &&
        assignments.some((a) => a.vehicleId === v.id && a.driverId === driver.id))
  )

  const suggestedType = passengers >= 8 ? 'L300' : passengers >= 5 ? 'AUV' : 'SUV'

  function confirm() {
    if (!clientName.trim() || !clientContact.trim()) return setError('Client credentials are required.')
    if (!schedule || !destination.trim()) return setError('Trip schedule and destination are required.')
    if (!vehicleId) return setError('Please select a vehicle to assign (Car Code / Plate Number).')
    setError('')
    onConfirm({
      driverId: driver.id,
      client: { name: clientName.trim(), contact: clientContact.trim() },
      trip: {
        tripCode: tripCode.trim() || `TRP-${String(Date.now()).slice(-6)}`,
        schedule,
        destination: destination.trim(),
        passengers: Number(passengers),
        lugSize: lugSize.trim() || 'Medium luggage',
      },
      vehicleId
    })
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h3>Assign Driver to Fleet Trip</h3>
          <button className="x" onClick={onClose} aria-label="Close"><Icon.x /></button>
        </div>

        <div className="modal-body">
          {/* Driver Credentials */}
          <fieldset>
            <legend>Driver Credentials</legend>
            <div className="form-row">
              <label>Driver Name</label>
              <input value={driver.name} readOnly disabled />
            </div>
            <div className="form-row">
              <label>Contact Number</label>
              <input value={driver.contact} readOnly disabled />
            </div>
            <div className="form-row">
              <label>Current Availability</label>
              <input value={`${driver.status}`} readOnly disabled />
            </div>
          </fieldset>

          {/* Fleet Data - Client Credentials */}
          <div className="form-grid">
            <div>
              <label className="cell-sub" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--navy-800)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 8 }}>
                Client Credentials
              </label>
              <div className="form-row">
                <label>Client Name</label>
                <input list="clients" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="e.g. BDO, PRODUCTION (BITAG)" />
                <datalist id="clients">
                  <option value="BDO" />
                  <option value="PRODUCTION (BITAG)" />
                </datalist>
              </div>
              <div className="form-row">
                <label>Client Contact #</label>
                <input placeholder="0921 034 5678" value={clientContact} onChange={(e) => setClientContact(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="form-sub" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--navy-800)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 8 }}>
                Trip Details
              </label>
              <div className="form-row">
                <label>Trip Code</label>
                <input placeholder="Auto-generated" value={tripCode} onChange={(e) => setTripCode(e.target.value)} />
              </div>
              <div className="form-row">
                <label>Schedule (Date &amp; Time)</label>
                <input type="datetime-local" value={schedule} onChange={(e) => setSchedule(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-row full">
              <label>Destination</label>
              <input placeholder="e.g. NAIA Terminal 3, Pasay City" value={destination} onChange={(e) => setDestination(e.target.value)} />
            </div>
            <div className="form-row">
              <label>Passengers</label>
              <input type="number" min="1" max="18" value={passengers} onChange={(e) => setPassengers(e.target.value)} />
            </div>
            <div className="form-row">
              <label>Luggage Size</label>
              <select value={lugSize} onChange={(e) => setLugSize(e.target.value)}>
                <option value="">Select luggage size</option>
                <option value="Small luggage">Small luggage</option>
                <option value="Medium luggage">Medium luggage</option>
                <option value="Large luggage">Large luggage</option>
              </select>
            </div>
            <div className="form-row full" style={{ fontSize: 12.5, color: 'var(--navy-700)', background: 'var(--blue-bg)', padding: '8px 12px', borderRadius: 8 }}>
              <Icon.car style={{ verticalAlign: '-3px', marginRight: 6 }} width={15} height={15} />
              AI vehicle recommendation: suitable type for {passengers} passenger(s) is <strong>{suggestedType}</strong>.
            </div>
          </div>

          {/* Fleet Data - Vehicle Assigned */}
          <fieldset style={{ marginTop: 4 }}>
            <legend>Vehicle Assigned</legend>
            <div className="form-row">
              <label>Available Vehicles (Car Code / Plate Number)</label>
              <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
                <option value="">-- Select vehicle --</option>
                {availableVehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.carCode} &mdash; {v.plate} &middot; {v.type} ({v.model})
                  </option>
                ))}
              </select>
              <div className="help">{availableVehicles.length} vehicle(s) currently available; assigned &amp; maintenance units are excluded.</div>
            </div>
          </fieldset>

          {error && <div className="error-msg">{error}</div>}
        </div>

        <div className="modal-foot">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={confirm} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon.check width={15} height={15} /> Confirm Assignment
          </button>
        </div>
      </div>
    </div>
  )
}