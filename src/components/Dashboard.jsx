import { Icon } from './Icons.jsx'

export default function Dashboard({ drivers, vehicles, assignments, onNavigate }) {
  const availableVehicles = vehicles.filter((v) => v.status === 'Available').length
  const fleetUtilization = Math.round(
    (assignments.length / Math.max(vehicles.length, 1)) * 100
  )

  return (
    <div>
      <div className="stats">
        <div className="stat">
          <div className="label">Active Fleet</div>
          <div className="value">{vehicles.length}</div>
          <div className="cell-sub">{availableVehicles} units available</div>
        </div>
        <div className="stat">
          <div className="label">Drivers on Duty</div>
          <div className="value">{drivers.filter((d) => d.status === 'Assigned').length}</div>
          <div className="cell-sub">{drivers.filter((d) => d.status === 'Unassigned').length} waiting for dispatch</div>
        </div>
        <div className="stat">
          <div className="label">Active Trips</div>
          <div className="value">{assignments.length}</div>
          <div className="cell-sub">assigned right now</div>
        </div>
        <div className="stat">
          <div className="label">Fleet Utilization</div>
          <div className="value">{fleetUtilization}%</div>
          <div className="cell-sub">computed by FleetOps</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <div>
              <h3>Active Assignments</h3>
              <div className="meta">Latest dispatch instructions issued by you</div>
            </div>
            <button className="btn sm" onClick={() => onNavigate('assignments')}>
              View all
            </button>
          </div>
          {assignments.length === 0 && (
            <div className="empty">
              <Icon.clipboard width={42} height={42} />
              <div>No drivers assigned yet. Dispatch your first trip.</div>
            </div>
          )}
          <div>
            {assignments.map((a) => {
              const driver = drivers.find((d) => d.id === a.driverId)
              const vehicle = vehicles.find((v) => v.id === a.vehicleId)
              return (
                <div className="assign-card" key={a.id}>
                  <div className="assign-avatar">{(driver?.name || '?')[0]}</div>
                  <div className="assign-main">
                    <div className="name">{driver?.name}</div>
                    <div className="detail">
                      {a.trip.tripCode} &middot; {a.trip.schedule} &middot; {a.trip.destination}
                    </div>
                  </div>
                  <div className="assign-fleet">
                    {vehicle && <span className="vehicle-chip">{vehicle.plate}</span>}
                    <div className="client-chip"><Icon.mapPin width={11} height={11} /> {a.client.name}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <h3>Live Fleet Monitor</h3>
              <div className="meta">GPS tracking via Google Maps API</div>
            </div>
          </div>
          <div style={{ padding: 16 }}>
            <div
              style={{
                minHeight: 180,
                borderRadius: 10,
                background: 'linear-gradient(140deg, #e8eefc, #f9fbf7)',
                border: '1px solid var(--border)',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--muted)',
                fontSize: 13.5,
                textAlign: 'center',
                padding: 20
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 10 }}>
                  <Icon.mapPin /><Icon.car />
                </div>
                Google Maps base layer loads here with
                <br />live vehicle markers synced from the driver mobile app.
                <div className="help" style={{ marginTop: 8 }}>
                  {availableVehicles} of {vehicles.length} units on standby
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}