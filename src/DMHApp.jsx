import { useCallback, useEffect, useState } from 'react'
import { Icon } from './components/Icons.jsx'
import AppShell from './components/AppShell.jsx'
import Dashboard from './components/Dashboard.jsx'
import DriversPage from './components/DriversPage.jsx'
import FleetPage from './components/FleetPage.jsx'
import AssignmentsPage from './components/AssignmentsPage.jsx'
import { apiFetch } from './services/api.js'

const NAV = [
  { key: 'dashboard', label: 'My Dashboard', icon: Icon.dashboard },
  { key: 'drivers', label: 'Drivers', icon: Icon.users },
  { key: 'assignments', label: 'Fleet Assignments', icon: Icon.clipboard },
  { key: 'fleet', label: 'Fleet Inventory', icon: Icon.car },
]

export default function DMHApp({ user, onLogout, onSwitchToAdmin }) {
  const [page, setPage] = useState('dashboard')
  const [drivers, setDrivers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadAll = useCallback(async () => {
    const [d, v, a] = await Promise.all([
      apiFetch('drivers.php'),
      apiFetch('vehicles.php'),
      apiFetch('assignments.php')
    ])
    setDrivers(d)
    setVehicles(v)
    setAssignments(a)
  }, [])

  useEffect(() => {
    loadAll()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [loadAll])

  async function run(fn) {
    setError('')
    try {
      await fn()
      await loadAll()
    } catch (e) {
      setError(e.message)
    }
  }

  function handleLogout() {
    onLogout()
    setPage('dashboard')
  }

  function addDriver({ name, contact }) {
    return run(() =>
      apiFetch('drivers.php', { method: 'POST', body: JSON.stringify({ name, contact }) })
    )
  }

  function addVehicle({ plate, type, model, year, seats, dailyRate }) {
    return run(() =>
      apiFetch('vehicles.php', {
        method: 'POST',
        body: JSON.stringify({ plate, type, model, year: Number(year), seats: Number(seats), dailyRate: Number(dailyRate) })
      })
    )
  }

  function toggleUnavailable(id) {
    return run(() =>
      apiFetch('drivers.php', { method: 'PATCH', body: JSON.stringify({ id }) })
    )
  }

  function assign(payload) {
    return run(() =>
      apiFetch('assignments.php', { method: 'POST', body: JSON.stringify(payload) })
    ).then(() => setPage('assignments'))
  }

  function release(id) {
    return run(() => apiFetch(`assignments.php?id=${id}`, { method: 'DELETE' }))
  }

  const pageMeta = {
    dashboard: ['My Dashboard', 'FleetOps / Driver Management Head'],
    drivers: ['Drivers Dashboard', 'FleetOps / Drivers'],
    assignments: ['Fleet Assigning', 'FleetOps / Dispatch Log'],
    fleet: ['Fleet Inventory', 'FleetOps / Vehicles'],
  }

  return (
    <AppShell
      groups={[
        {
          label: 'Modules',
          items: NAV,
        },
        ...(onSwitchToAdmin
          ? [
              {
                label: 'Account',
                items: [
                  { key: 'admin', label: 'Super Admin Console', icon: Icon.shield, onClick: onSwitchToAdmin },
                ],
              },
            ]
          : []),
      ]}
      activeKey={page}
      onNavigate={setPage}
      role="Driver Management Head"
      roleSub="Assign drivers · dispatch trips"
      user={user}
      userSub="Driver Management Head"
      title={pageMeta[page][0]}
      crumb={pageMeta[page][1]}
      onLogout={handleLogout}
    >
      {error && <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div>}
      {loading ? (
        <div className="panel">
          <div className="empty">
            <Icon.gauge width={46} height={46} />
            <div className="help">Loading fleet data...</div>
          </div>
        </div>
      ) : (
        <>
          {page === 'dashboard' && <Dashboard drivers={drivers} vehicles={vehicles} assignments={assignments} onNavigate={setPage} />}
          {page === 'drivers' && (
            <DriversPage
              drivers={drivers}
              vehicles={vehicles}
              assignments={assignments}
              onAssign={assign}
              onAddDriver={addDriver}
              onToggleUnavailable={toggleUnavailable}
            />
          )}
          {page === 'assignments' && (
            <AssignmentsPage assignments={assignments} drivers={drivers} vehicles={vehicles} onRelease={release} />
          )}
{page === 'fleet' && <FleetPage vehicles={vehicles} onAddVehicle={addVehicle} />}
          </>
        )}
      </AppShell>
    )
  }
