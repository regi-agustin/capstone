import { useEffect, useState } from 'react'
import { Shield, Lock, Mail, CheckCircle, Pencil, Smartphone, Eye, AlertCircle } from 'lucide-react'
import { fetchSecurity } from '../services/payrollService.js'

function StatusBadge({ enabled }) {
  return enabled ? (
    <span className="badge badge--confirmed">Enabled</span>
  ) : (
    <span className="badge badge--neutral">Disabled</span>
  )
}

export default function Security() {
  const [security, setSecurity] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchSecurity()
      .then(setSecurity)
      .catch((e) => setError(e.message))
  }, [])

  const settings = security?.settings || {}
  const twoFactor = Boolean(settings.twoFactorEnabled)
  const loginNotifs = Boolean(settings.loginNotifications)
  const backupRemaining = Math.max(0, (settings.backupCodesTotal || 10) - (settings.backupCodesUsed || 0))

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Security</h1>
          <p className="page-head__sub">Manage your account security settings and monitor account activity.</p>
        </div>
      </div>

      {error && <div className="error-banner" style={{ marginBottom: 22 }}>{error}</div>}

      <section className="card" style={{ marginBottom: 22 }}>
        <div className="card__body">
          <div className="toolbar" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div className="toolbar" style={{ gap: 18, flex: 1 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'var(--primary-soft)',
                  color: 'var(--primary-dark)',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                <Shield size={32} />
              </div>
              <div>
                <h3 className="card__title" style={{ marginBottom: 2 }}>Keep your account secure</h3>
                <p className="muted">Your account is protected. Review your security settings and activity regularly.</p>
                <div className="toolbar" style={{ gap: 8, marginTop: 6, color: 'var(--success)', fontWeight: 500 }}>
                  <CheckCircle size={14} /> All security settings look good
                </div>
              </div>
            </div>

            <div className="toolbar" style={{ gap: 28 }}>
              <div className="toolbar" style={{ gap: 12 }}>
                <Lock size={22} style={{ color: 'var(--primary-dark)' }} />
                <div>
                  <div className="cell-muted">Password Strength</div>
                  <div className="cell-main" style={{ color: settings.passwordStrength === 'Strong' ? 'var(--success)' : 'var(--warning)' }}>
                    {settings.passwordStrength || 'Strong'}
                  </div>
                </div>
              </div>
              <div className="toolbar" style={{ gap: 12 }}>
                <Shield size={22} style={{ color: 'var(--primary-dark)' }} />
                <div>
                  <div className="cell-muted">Two-Factor Authentication</div>
                  <div className="cell-main" style={{ color: twoFactor ? 'var(--success)' : 'var(--warning)' }}>
                    {twoFactor ? 'Enabled' : 'Disabled'}
                  </div>
                </div>
              </div>
              <div className="toolbar" style={{ gap: 12 }}>
                <Mail size={22} style={{ color: 'var(--primary-dark)' }} />
                <div>
                  <div className="cell-muted">Login Notifications</div>
                  <div className="cell-main" style={{ color: loginNotifs ? 'var(--success)' : 'var(--warning)' }}>
                    {loginNotifs ? 'Enabled' : 'Disabled'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="form-grid">
        <div className="form-section">
          <div className="form-section__title">
            <Pencil size={16} /> Change Password
          </div>
          <p className="form-hint" style={{ margin: '4px 0 14px' }}>
            Password changes are managed by the system administrator. Contact support for assistance.
          </p>
          <div style={{ display: 'grid', gap: 14 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="sec-current">Current Password</label>
              <div style={{ position: 'relative' }}>
                <input id="sec-current" type="password" defaultValue="********" disabled className="form-input" />
                <Eye size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="sec-new">New Password</label>
              <div style={{ position: 'relative' }}>
                <input id="sec-new" type="password" defaultValue="********" disabled className="form-input" />
                <Eye size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="sec-confirm">Confirm New Password</label>
              <div style={{ position: 'relative' }}>
                <input id="sec-confirm" type="password" defaultValue="********" disabled className="form-input" />
                <Eye size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
              </div>
            </div>
            <button className="btn btn--primary btn--block">
              Update Password
            </button>
          </div>
        </div>

        <div className="form-section">
          <div className="form-section__title">
            <Smartphone size={16} /> Two-Factor Authentication (2FA)
          </div>
          <p className="form-hint" style={{ margin: '4px 0 16px' }}>Add an extra layer of security to your account.</p>
          <div className="toolbar" style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ display: 'grid', gap: 12, flex: 1 }}>
              <div className="detail-grid">
                <div className="detail-item">
                  <div className="detail-item__label">Status</div>
                  <StatusBadge enabled={twoFactor} />
                </div>
                <div className="detail-item">
                  <div className="detail-item__label">Method</div>
                  <div className="detail-item__value">{settings.twoFactorMethod || 'Authenticator App (TOTP)'}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-item__label">Backup Codes</div>
                  <div className="detail-item__value">{backupRemaining} of {settings.backupCodesTotal || 10} remaining</div>
                </div>
              </div>
            </div>
            <div
              style={{
                width: 112,
                height: 160,
                background: twoFactor ? 'var(--primary-soft)' : 'var(--surface-2)',
                borderRadius: 12,
                border: `2px solid ${twoFactor ? 'var(--primary)' : 'var(--border)'}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: twoFactor ? 'var(--primary-dark)' : 'var(--text-faint)',
                flexShrink: 0,
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <Smartphone size={32} style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', display: 'flex', gap: 4, marginTop: 8 }}>
                <span>6</span><span>7</span><span>8</span><span>9</span><span>1</span><span>2</span>
              </div>
            </div>
          </div>
          <div className="toolbar" style={{ marginTop: 24, gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn--secondary" style={{ flex: 1, color: 'var(--primary-dark)', borderColor: 'var(--primary)' }}>
              View Backup Codes
            </button>
            <button className="btn btn--secondary" style={{ flex: 1 }}>
              {twoFactor ? 'Disable 2FA' : 'Enable 2FA'}
            </button>
          </div>
        </div>
      </div>

      <div className="ai-banner" style={{ marginTop: 22 }}>
        <div className="toolbar" style={{ gap: 14, alignItems: 'flex-start', flex: 1 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'var(--primary-soft)',
              color: 'var(--primary-dark)',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <Shield size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontWeight: 700, color: 'var(--ink)' }}>Security Tips</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px 24px', marginTop: 8 }}>
              <div className="toolbar" style={{ gap: 8 }}>
                <CheckCircle size={14} style={{ color: 'var(--primary-dark)' }} /> Use a strong password and change it regularly.
              </div>
              <div className="toolbar" style={{ gap: 8 }}>
                <CheckCircle size={14} style={{ color: 'var(--primary-dark)' }} /> Do not share your account with anyone.
              </div>
              <div className="toolbar" style={{ gap: 8 }}>
                <CheckCircle size={14} style={{ color: 'var(--primary-dark)' }} /> Enable two-factor authentication for extra security.
              </div>
              <div className="toolbar" style={{ gap: 8 }}>
                <CheckCircle size={14} style={{ color: 'var(--primary-dark)' }} /> Log out when using shared devices.
              </div>
            </div>
          </div>
        </div>
      </div>

      {!twoFactor && (
        <div className="error-banner" style={{ marginTop: 16 }}>
          <AlertCircle size={16} /> Two-factor authentication is currently disabled. Consider enabling it for better protection.
        </div>
      )}
    </div>
  )
}