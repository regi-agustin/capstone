import { useState } from 'react'
import { Icon } from './Icons.jsx'
import AssignModal from './AssignModal.jsx'

const FILTERS = ['All', 'Unassigned', 'Assigned', 'Unavailable']

export default function DriversPage({ drivers, vehicles, assignments, onAssign, onAddDriver, onToggleUnavailable }) {
  const [filter, setFilter] = useState('All')
  const [query, setQuery] = useState('')
  const [assignTarget, setAssignTarget] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newDriver, setNewDriver] = useState({ name: '', contact: '' })
  const [addError, setAddError] = useState('')

  const counts = {
    All: drivers.length,
    Unassigned: drivers.filter((d) => d.status === 'Unassigned').length,
    Assigned: drivers.filter((d) => d.status === 'Assigned').length,
    Unavailable: drivers.filter((d) => d.status === 'Unavailable').length
  }

  const visible = drivers.filter((d) => {
    const matchStatus = filter === 'All' || d.status === filter
    const q = query.trim().toLowerCase()
    const matchQuery =
      !q ||
      d.name.toLowerCase().includes(q) ||
      d.contact.replace(/\s/g, '').includes(q.replace(/\s/g, ''))
    return matchStatus && matchQuery
  })

  function addDriver() {
    if (!newDriver.name.trim() || !newDriver.contact.trim()) {
      setAddError('Name and Contact # are required.')
      return
    }
    onAddDriver({ name: newDriver.name.trim(), contact: newDriver.contact.trim() })
    setNewDriver({ name: '', contact: '' })
    setAddError('')
    setShowAdd(false)
  }

  return (
    <div>
      <div className="stats">
        <div className="stat">
          <div className="label">Total Drivers</div>
          <div className="value">{drivers.length}</div>
        </div>
        <div className="stat">
          <div className="label"><span className="dot" style={{ background: 'var(--blue)' }} />Unassigned</div>
          <div className="value" style={{ color: 'var(--blue)' }}>{counts.Unassigned}</div>
        </div>
        <div className="stat">
          <div className="label"><span className="dot" style={{ background: 'var(--green)' }} />Assigned</div>
          <div className="value" style={{ color: 'var(--green)' }}>{counts.Assigned}</div>
        </div>
        <div className="stat">
          <div className="label"><span className="dot" style={{ background: 'var(--red)' }} />Unavailable</div>
          <div className="value" style={{ color: 'var(--red)' }}>{counts.Unavailable}</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <h3>Drivers Credentials</h3>
            <div className="meta">Manage driver information, availability, and fleet assignment</div>
          </div>
          <button className="btn btn-accent-solid" onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon.plus width={16} height={16} /> Assign New Driver
          </button>
        </div>

        <div className="panel-head" style={{ borderBottom: '1px solid var(--border)', background: '#fbfdff' }}>
          <div className="tabs">
            {FILTERS.map((f) => (
              <button key={f} className={`tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {f} <span className="count">{counts[f]}</span>
              </button>
            ))}
          </div>
          <div className="search">
            <Icon.search width={15} height={15} />
            <input placeholder="Search driver or contact #..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Driver</th>
                <th>Contact #</th>
                <th>Availability</th>
                <th>Vehicle Assigned</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="empty">
                      <Icon.users width={42} height={42} />
                      <div>No drivers match the current filter.</div>
                    </div>
                  </td>
                </tr>
              )}
              {visible.map((d) => {
                const assignment = assignments.find((a) => a.driverId === d.id)
                const vehicle = assignment && vehicles.find((v) => v.id === assignment.vehicleId)
                return (
                  <tr key={d.id}>
                    <td>
                      <div className="cell-strong">{d.name}</div>
                      <div className="cell-sub">Driver #{String(d.id).padStart(3, '0')}</div>
                    </td>
                    <td className="mono">{d.contact}</td>
                    <td>
                      <span className={`status ${d.status.toLowerCase()}`}>{d.status}</span>
                    </td>
                    <td>
                      {vehicle ? (
                        <>
                          <div className="cell-strong mono">{vehicle.plate}</div>
                          <div className="cell-sub">{vehicle.carCode} &middot; {vehicle.model}</div>
                        </>
                      ) : (
                        <span className="cell-sub">No vehicle assigned</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button
                          className="btn sm"
                          disabled={d.status === 'Unavailable'}
                          title={d.status === 'Unavailable' ? 'Driver unavailable' : 'Assign to fleet'}
                          onClick={() => setAssignTarget(d)}
                          style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                        >
                          <Icon.clipboard width={14} height={14} /> Assign
                        </button>
                        <button
                          className={`btn sm ${d.status === 'Unavailable' ? 'btn-danger-ghost' : ''}`}
                          onClick={() => onToggleUnavailable(d.id)}
                        >
                          {d.status === 'Unavailable' ? 'Set Available' : 'Mark Unavailable'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {assignTarget && (
        <AssignModal
          driver={assignTarget}
          drivers={drivers}
          vehicles={vehicles}
          assignments={assignments}
          onConfirm={(payload) => {
            onAssign(payload)
            setAssignTarget(null)
          }}
          onClose={() => setAssignTarget(null)}
        />
      )}

      {showAdd && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal" style={{ maxWidth: 460 }}>
            <div className="modal-head">
              <h3>Register New Driver</h3>
              <button className="x" onClick={() => setShowAdd(false)} aria-label="Close"><Icon.x /></button>
            </div>
            <div className="modal-body">
              <fieldset>
                <legend>Driver Credentials</legend>
                <div className="form-row">
                  <label>Full Name</label>
                  <input
                    placeholder="e.g. Juan Dela Cruz"
                    value={newDriver.name}
                    onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                  />
                </div>
                <div className="form-row">
                  <label>Contact #</label>
                  <input
                    placeholder="09XX XXX XXXX"
                    value={newDriver.contact}
                    onChange={(e) => setNewDriver({ ...newDriver, contact: e.target.value })}
                  />
                </div>
              </fieldset>
              {addError && <div className="error-msg">{addError}</div>}
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addDriver} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon.plus width={15} height={15} /> Add Driver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}