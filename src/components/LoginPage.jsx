import { useState } from 'react'
import { authenticate } from '../services/auth.js'

export default function LoginPage({ onLogin }) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPass, setShowPass] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const user = await authenticate(identifier, password)
      onLogin(user)
    } catch (err) {
      setError(err.message || 'Unable to sign in. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-wrap">
      <aside className="login-brand">
        <div>
          <div className="login-logo">
            <div className="logo-mark">FO</div>
            FleetOps
          </div>
          <h1 className="login-tagline">
            AI-Driven Fleet <span>Operations</span> System
          </h1>
          <p className="login-sub">
            Centralized fleet management for Hollydot Car Rental &mdash; driver assignment,
            dispatch, real-time GPS tracking, payroll, and dynamic pricing in one platform.
          </p>
          <div className="login-pills">
            <span className="pill">Real-Time GPS Tracking</span>
            <span className="pill">Predictive Maintenance</span>
            <span className="pill">Dynamic Pricing</span>
            <span className="pill">Automated Payroll</span>
            <span className="pill">OCR Record Digitization</span>
          </div>
        </div>
        <footer>
          Hollydot Car Rental &middot; BSIT Capstone 2026 &middot; Eulogio &ldquo;Amang&rdquo; Rodriguez Institute of Science and Technology
        </footer>
      </aside>

      <main className="login-card">
        <form className="login-form" onSubmit={handleSubmit}>
          <h1>Sign In</h1>
          <p className="sub">Your dashboard loads automatically based on your role.</p>

          {error && <div className="error-msg">{error}</div>}

          <div className="field">
            <label htmlFor="identifier">Username / E-Mail</label>
            <input
              id="identifier"
              type="text"
              placeholder="e.g. miggy.basina or email@hollydotcarrental.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type={showPass ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <span className="help" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12.5, color: 'var(--muted)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 500 }}>
                <input type="checkbox" checked={showPass} onChange={() => setShowPass(!showPass)} /> Show password
              </label>
            </span>
          </div>

          <button type="submit" className="btn-accent" disabled={busy}>
            {busy ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </main>
    </div>
  )
}
