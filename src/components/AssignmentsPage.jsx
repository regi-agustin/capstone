import { Icon } from './Icons.jsx'

export default function AssignmentsPage({ assignments, drivers, vehicles, onRelease }) {
  return (
    <div>
      <div className="stats">
        <div className="stat">
          <div className="label">Total Dispatches</div>
          <div className="value">{assignments.length}</div>
        </div>
        <div className="stat">
          <div className="label">In Transit</div>
          <div className="value" style={{ color: 'var(--blue)' }}>{assignments.length}</div>
          <div className="cell-sub">GPS-tracked live</div>
        </div>
        <div className="stat">
          <div className="label">Vehicles in Use</div>
          <div className="value" style={{ color: 'var(--green)' }}>{assignments.length}</div>
        </div>
        <div className="stat">
          <div className="label">Clients Served</div>
          <div className="value">{new Set(assignments.map((a) => a.client.name)).size}</div>
          <div className="cell-sub">BDO &amp; PRODUCTION (BITAG)</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <h3>Fleet Assigning &amp; Dispatch Log</h3>
            <div className="meta">Every assignment captures driver, client, trip, and vehicle data</div>
          </div>
        </div>
        {assignments.length === 0 && (
          <div className="empty">
            <Icon.clipboard width={42} height={42} />
            <div>No dispatch records yet.</div>
          </div>
        )}
        {assignments.map((a) => {
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
                <div className="detail"><Icon.mapPin width={12} height={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />{a.trip.destination} &middot; {a.trip.passengers} pax &middot; {a.trip.lugSize} &middot; {a.trip.purpose}</div>
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