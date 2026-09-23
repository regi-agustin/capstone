import { useState } from 'react'
import { Icon } from './Icons.jsx'

function AwaitingCard({ a, drivers, vehicles, onAssignDriver }) {
  const [driverId, setDriverId] = useState('')
  const vehicle = vehicles.find((v) => v.id === a.vehicleId)
  const eligible = drivers.filter((d) => d.status === 'Unassigned')

  return (
    <div className="assign-card">
      <div className="assign-avatar" style={{ background: 'var(--amber-soft, #fef3c7)', color: 'var(--amber, #b45309)' }}>!</div>
      <div className="assign-main">
        <div className="name">Unassigned <span className="cell-sub">(Booking #{a.id})</span></div>
        <div className="detail">
          {a.trip.tripCode} &middot; {a.trip.schedule}
        </div>
        <div className="detail">
          <Icon.mapPin width={12} height={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />
          {a.trip.destination} &middot; {a.trip.passengers} pax
        </div>
      </div>
      <div className="assign-fleet">
        <div className="client-chip">{a.client.name}</div>
        <div className="cell-sub" style={{ marginTop: 4 }}>{a.client.contact}</div>
        {vehicle && (
          <div style={{ marginTop: 6 }}>
            <span className="vehicle-chip">{vehicle.carCode} / {vehicle.plate}</span>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <select
          value={driverId}
          onChange={(e) => setDriverId(e.target.value)}
          style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', minWidth: 150 }}
          aria-label="Select driver"
        >
          <option value="">Select driver…</option>
          {eligible.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <button
          className="btn btn-primary"
          disabled={!driverId}
          onClick={() => onAssignDriver(a.id, Number(driverId))}
        >
          Assign
        </button>
      </div>
    </div>
  )
}

export default function AssignmentsPage({ assignments, drivers, vehicles, onRelease, onAssignDriver }) {
  const awaiting = assignments.filter((a) => a.status === 'pricing_approved')
  const active = assignments.filter((a) => a.status !== 'pricing_approved')

  return (
    <div>
      <div className="stats">
        <div className="stat">
          <div className="label">Total Dispatches</div>
          <div className="value">{active.length}</div>
        </div>
        <div className="stat">
          <div className="label">In Transit</div>
          <div className="value" style={{ color: 'var(--blue)' }}>{active.length}</div>
          <div className="cell-sub">GPS-tracked live</div>
        </div>
        <div className="stat">
          <div className="label">Awaiting Dispatch</div>
          <div className="value" style={{ color: 'var(--amber)' }}>{awaiting.length}</div>
          <div className="cell-sub">pricing approved</div>
        </div>
        <div className="stat">
          <div className="label">Clients Served</div>
          <div className="value">{new Set(assignments.map((a) => a.client.name)).size}</div>
          <div className="cell-sub">BDO &amp; PRODUCTION (BITAG)</div>
        </div>
      </div>

      {awaiting.length > 0 && (
        <div className="panel" style={{ marginBottom: 18 }}>
          <div className="panel-head">
            <div>
              <h3>Awaiting Driver Assignment</h3>
              <div className="meta">Pricing approved by the billing desk — pick a driver to dispatch</div>
            </div>
          </div>
          {awaiting.map((a) => (
            <AwaitingCard
              key={a.id}
              a={a}
              drivers={drivers}
              vehicles={vehicles}
              onAssignDriver={onAssignDriver}
            />
          ))}
        </div>
      )}

      <div className="panel">
        <div className="panel-head">
          <div>
            <h3>Fleet Assigning &amp; Dispatch Log</h3>
            <div className="meta">Every assignment captures driver, client, trip, and vehicle data</div>
          </div>
        </div>
        {active.length === 0 && (
          <div className="empty">
            <Icon.clipboard width={42} height={42} />
            <div>No dispatch records yet.</div>
          </div>
        )}
        {active.map((a) => {
          const driver = drivers.find((d) => d.id === a.driverId)
          const vehicle = vehicles.find((v) => v.id === a.vehicleId)
          return (
            <div className="assign-card" key={a.id}>
              <div className="assign-avatar">{(driver?.name || '?')[0]}</div>
              <div className="assign-main">
                <div className="name">{driver?.name} <span className="cell-sub">(Driver #{String(a.driverId).padStart(3, '0')})</span></div>
                <div className="detail">
                  {a.trip.tripCode} &middot; {a.trip.schedule}
                </div>
                <div className="detail"><Icon.mapPin width={12} height={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />{a.trip.destination} &middot; {a.trip.passengers} pax &middot; {a.trip.lugSize}</div>
              </div>
              <div className="assign-fleet">
                <div className="client-chip">{a.client.name}</div>
                <div className="cell-sub" style={{ marginTop: 4 }}>{a.client.contact}</div>
                {vehicle && (
                  <div style={{ marginTop: 6 }}>
                    <span className="vehicle-chip">{vehicle.carCode} / {vehicle.plate}</span>
                  </div>
                )}
              </div>
              <button className="btn sm btn-danger-ghost" onClick={() => onRelease(a.id)}>
                Trip Done
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
