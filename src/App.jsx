import { useState, useEffect } from 'react'
import LoginPage from './components/LoginPage.jsx'
import DMHApp from './DMHApp.jsx'
import DriverApp from './driver/DriverApp.jsx'
import ROApp from './ro/ROApp.jsx'
import BillingApp from './billing/BillingApp.jsx'
import AdminApp from './admin/AdminApp.jsx'
import { Icon } from './components/Icons.jsx'
import { logout, fetchMe, canAccessModule } from './services/auth.js'

function DashboardForRole({ session, onLogout, module, onSwitchModule }) {
  const role = session.role

  if (module === 'admin') {
    return <AdminApp user={session.name} onLogout={onLogout} onSwitchModule={onSwitchModule} />
  }
  if (module === 'dmh') {
    return (
      <DMHApp
        user={session.name}
        onLogout={onLogout}
        onSwitchToAdmin={canAccessModule(role, 'admin') ? () => onSwitchModule('admin') : null}
      />
    )
  }
  if (module === 'ro') {
    return (
      <ROApp
        user={{ name: session.name, role: 'Reservation Officer', email: '' }}
        onLogout={onLogout}
        onSwitchToAdmin={canAccessModule(role, 'admin') ? () => onSwitchModule('admin') : null}
      />
    )
  }
  if (module === 'billing') {
    return (
      <BillingApp
        user={{ name: session.name, role: 'Billing Officer', email: '' }}
        onLogout={onLogout}
        onSwitchToAdmin={canAccessModule(role, 'admin') ? () => onSwitchModule('admin') : null}
      />
    )
  }

  if (role === 'driver' && canAccessModule(role, 'driver')) {
    return <DriverApp user={session.name} onLogout={onLogout} />
  }
  if (role === 'reservation_officer' && canAccessModule(role, 'ro')) {
    return <ROApp user={{ name: session.name, role: 'Reservation Officer', email: '' }} onLogout={onLogout} />
  }
  if (role === 'billing_officer' && canAccessModule(role, 'billing')) {
    return <BillingApp user={{ name: session.name, role: 'Billing Officer', email: '' }} onLogout={onLogout} />
  }
  if (role === 'superadmin' && canAccessModule(role, 'admin')) {
    return <AdminApp user={session.name} onLogout={onLogout} onSwitchModule={onSwitchModule} />
  }
  if (canAccessModule(role, 'dmh')) {
    return <DMHApp user={session.name} onLogout={onLogout} />
  }
  return (
    <div className="panel" style={{ maxWidth: 560, margin: '64px auto' }}>
      <div className="empty">
        <Icon.gauge width={46} height={46} />
        <div style={{ fontWeight: 700, color: 'var(--text)' }}>
          No dashboard configured for this role
        </div>
        <div className="help" style={{ marginTop: 6, maxWidth: 380 }}>
          Your account ({session.name}, role: {role}) has no assigned module yet.
        </div>
        <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={onLogout}>
          Log out
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [module, setModule] = useState(null)
  const [restoring, setRestoring] = useState(true)

  // Restore the server-side session (cookie) on refresh; only show the
  // login page when the server says there is no active session.
  useEffect(() => {
    fetchMe()
      .then((user) => setSession({ role: user.role, name: user.fullname }))
      .catch(() => {})
      .finally(() => setRestoring(false))
  }, [])

  async function handleLogin(user) {
    setSession({ role: user.role, name: user.fullname })
    setModule(null)
  }

  async function handleLogout() {
    await logout()
    setSession(null)
    setModule(null)
  }

  function handleSwitchModule(key) {
    setModule(key)
  }

  if (restoring) {
    return (
      <div className="panel" style={{ maxWidth: 480, margin: '25vh auto' }}>
        <div className="empty">
          <Icon.gauge width={46} height={46} />
          <div className="help">Restoring your session...</div>
        </div>
      </div>
    )
  }

  if (!session) return <LoginPage onLogin={handleLogin} />
  return <DashboardForRole session={session} onLogout={handleLogout} module={module} onSwitchModule={handleSwitchModule} />
}
