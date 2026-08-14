import { useEffect, useState } from 'react'
import { FiShield, FiLock, FiUser, FiClock, FiCheckCircle, FiAlertCircle } from 'react-icons/fi'
import { fetchSecurity } from '../services/customerService.js'

function timeAgo(ts) {
  if (!ts) return ''
  const d = new Date(ts.replace(' ', 'T'))
  if (isNaN(d.getTime())) return ts
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Now'
  if (mins < 60) return `${mins} minute${mins > 1 ? 's' : ''} ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}

export default function Security() {
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' })
  const [notice, setNotice] = useState('')
  const [security, setSecurity] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchSecurity()
      .then(setSecurity)
      .catch((e) => setError(e.message))
  }, [])

  const settings = security?.settings || {}
  const sessions = security?.sessions || []

  function handleUpdate(e) {
    e.preventDefault()
    if (passwords.new !== passwords.confirm) {
      setNotice('New password and confirmation do not match.')
      return
    }
    if (passwords.new.length < 8) {
      setNotice('Password must be at least 8 characters.')
      return
    }
    setNotice('Password change is handled by the administrator. Please contact support.')
  }

  const noticeIsError = notice && (notice.includes('do not match') || notice.includes('at least 8'))
  const faceEnabled = Boolean(settings.faceRecognitionEnabled)

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Security</h1>
          <p className="page-head__sub">Manage your account security and authentication settings.</p>
        </div>
      </div>

      {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}
      {notice && (
        noticeIsError ? (
          <div className="error-banner" style={{ marginBottom: 16 }}>{notice}</div>
        ) : (
          <div className="success-banner" style={{ marginBottom: 16 }}>{notice}</div>
        )
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 22, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 16 }}>
          <section className="card">
            <div className="card__header">
              <div className="card__title">Face Recognition Authentication</div>
            </div>
            <div className="card__body">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 14,
                  padding: 14,
                  background: faceEnabled ? 'var(--success-soft)' : 'var(--surface-2)',
                  borderRadius: 'var(--r-sm)',
                  border: `1px solid ${faceEnabled ? 'var(--success)' : 'var(--border)'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="stat-card__icon" style={{ background: faceEnabled ? 'var(--success-soft)' : 'var(--surface-2)', color: faceEnabled ? 'var(--success)' : 'var(--text-2)' }}>
                    <FiShield size={24} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, color: 'var(--ink)' }}>{faceEnabled ? 'Enabled' : 'Disabled'}</p>
                    <p className="muted" style={{ fontSize: 13 }}>Face recognition is used to securely verify your identity when logging in.</p>
                  </div>
                </div>
                <span className={faceEnabled ? 'badge badge--confirmed' : 'badge badge--neutral'}>
                  {faceEnabled ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </section>

          <form onSubmit={handleUpdate} className="card">
            <div className="card__header">
              <div>
                <div className="card__title">Change Password</div>
                <div className="card__sub">Update your password regularly to keep your account secure.</div>
              </div>
            </div>
            <div className="card__body" style={{ display: 'grid', gap: 14 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="pw-current">Current Password</label>
                <input
                  id="pw-current"
                  type="password"
                  value={passwords.current}
                  onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                  className="form-input"
                  placeholder="Enter current password"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="pw-new">New Password</label>
                <input
                  id="pw-new"
                  type="password"
                  value={passwords.new}
                  onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                  className="form-input"
                  placeholder="Enter new password"
                />
                <div className="form-hint">Use at least 8 characters with a mix of letters, numbers, and symbols.</div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="pw-confirm">Confirm New Password</label>
                <input
                  id="pw-confirm"
                  type="password"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                  className="form-input"
                  placeholder="Confirm new password"
                />
              </div>
              <button type="submit" className="btn btn--primary" style={{ justifySelf: 'start' }}>
                Update Password
              </button>
            </div>
          </form>

          <section className="card">
            <div className="card__header">
              <div>
                <div className="card__title">Login Activity</div>
                <div className="card__sub">Review your recent account activity.</div>
              </div>
            </div>
            <div className="card__body" style={{ display: 'grid' }}>
              {sessions.length === 0 ? (
                <p className="muted">No login activity recorded yet.</p>
              ) : (
                sessions.map((activity, i) => (
                  <div
                    key={activity.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '12px 0',
                      borderBottom: i < sessions.length - 1 ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        className="stat-card__icon"
                        style={{
                          width: 38,
                          height: 38,
                          background: activity.status === 'current' ? 'var(--warning-soft)' : 'var(--surface-2)',
                          color: activity.status === 'current' ? 'var(--warning)' : 'var(--text-2)',
                        }}
                      >
                        <FiUser size={17} />
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, color: 'var(--ink)' }}>{activity.device}</p>
                        <p className="muted" style={{ fontSize: 13 }}>{activity.location}</p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {activity.status === 'current' ? (
                        <span className="badge badge--pending">Current Session</span>
                      ) : (
                        <span className="faint" style={{ fontSize: 13 }}>{timeAgo(activity.time)}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          <section className="card">
            <div className="card__body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <FiCheckCircle size={26} style={{ color: 'var(--success)' }} />
                <div>
                  <h3>Account Protection</h3>
                  <p style={{ fontSize: 13, color: 'var(--success)' }}>Your account is protected</p>
                </div>
              </div>
              <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <div className="detail-item__label">Last security check:</div>
                <div className="detail-item__value">{settings.lastSecurityCheck || '—'}</div>
              </div>
            </div>
          </section>

          <section className="card">
            <div className="card__header">
              <div className="card__title">Security Tips</div>
            </div>
            <div className="card__body" style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <FiLock size={16} className="faint" style={{ marginTop: 2 }} />
                <span className="muted" style={{ fontSize: 13 }}>Keep your password strong and unique.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <FiAlertCircle size={16} className="faint" style={{ marginTop: 2 }} />
                <span className="muted" style={{ fontSize: 13 }}>Do not share your account information with anyone.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <FiClock size={16} className="faint" style={{ marginTop: 2 }} />
                <span className="muted" style={{ fontSize: 13 }}>Always log out after using a public or shared device.</span>
              </div>
            </div>
          </section>

          <section className="card">
            <div className="card__body">
              <h3 style={{ marginBottom: 4 }}>Need Help?</h3>
              <p className="muted" style={{ fontSize: 13 }}>We're here to help you keep your account secure.</p>
              <p style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: 'var(--warning)' }}>📞 0912 345 6789 · support@hollydot.com</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}