import { useEffect, useState } from 'react'
import { Shield, Lock, Mail, CheckCircle, Pencil, Smartphone, AlertCircle, RefreshCw, KeyRound } from 'lucide-react'
import { fetchSecurity, securityAction, changePassword } from '../services/payrollService.js'
import Modal from '../../ro/components/Modal.jsx'

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
  const [msg, setMsg] = useState(null)
  const [pw, setPw] = useState({ current: '', new: '', confirm: '' })
  const [savingPw, setSavingPw] = useState(false)
  const [busy2fa, setBusy2fa] = useState(false)
  const [busyNotifs, setBusyNotifs] = useState(false)
  const [codes, setCodes] = useState(null)

  const load = () =>
    fetchSecurity()
      .then(setSecurity)
      .catch((e) => setError(e.message))

  useEffect(() => {
    load()
  }, [])

  function showMsg(text, ok = true) {
    setMsg({ text, ok })
    setTimeout(() => setMsg(null), 4000)
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    if (pw.new !== pw.confirm) return showMsg('New password and confirmation do not match.', false)
    if (pw.new.length < 8) return showMsg('Password must be at least 8 characters.', false)
    setSavingPw(true)
    try {
      await changePassword({ currentPassword: pw.current, newPassword: pw.new, confirmPassword: pw.confirm })
      setPw({ current: '', new: '', confirm: '' })
      showMsg('Password updated successfully.')
    } catch (e) {
      showMsg(e.message, false)
    } finally {
      setSavingPw(false)
    }
  }

  async function handleToggle2fa() {
    setBusy2fa(true)
    try {
      await securityAction('toggle_2fa', { enabled: !twoFactor })
      showMsg(twoFactor ? 'Two-factor authentication disabled.' : 'Two-factor authentication enabled.')
      await load()
    } catch (e) {
      showMsg(e.message, false)
    } finally {
      setBusy2fa(false)
    }
  }

  async function handleToggleLoginNotifs() {
    setBusyNotifs(true)
    try {
      await securityAction('toggle_login_notifications', { enabled: !loginNotifs })
      showMsg(loginNotifs ? 'Login notifications disabled.' : 'Login notifications enabled.')
      await load()
    } catch (e) {
      showMsg(e.message, false)
    } finally {
      setBusyNotifs(false)
    }
  }

  async function handleViewCodes() {
    try {
      const res = await securityAction('view_backup_codes')
      setCodes(res.codes)
    } catch (e) {
      showMsg(e.message, false)
    }
  }

  async function handleRegenerateCodes() {
    try {
      const res = await securityAction('regenerate_backup_codes')
      setCodes(res.codes)
      showMsg('Backup codes regenerated.')
    } catch (e) {
      showMsg(e.message, false)
    }
  }

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
      {msg && (
        <div className={msg.ok ? 'success-banner' : 'error-banner'} style={{ marginBottom: 22 }}>
          {msg.text}
        </div>
      )}

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
            Update your password regularly to keep your account secure.
          </p>
          <form onSubmit={handleChangePassword} style={{ display: 'grid', gap: 14 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="sec-current">Current Password</label>
              <input
                id="sec-current"
                type="password"
                className="form-input"
                value={pw.current}
                onChange={(e) => setPw({ ...pw, current: e.target.value })}
                placeholder="Enter current password"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="sec-new">New Password</label>
              <input
                id="sec-new"
                type="password"
                className="form-input"
                value={pw.new}
                onChange={(e) => setPw({ ...pw, new: e.target.value })}
                placeholder="Enter new password"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="sec-confirm">Confirm New Password</label>
              <input
                id="sec-confirm"
                type="password"
                className="form-input"
                value={pw.confirm}
                onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                placeholder="Confirm new password"
              />
            </div>
            <button type="submit" disabled={savingPw} className="btn btn--primary btn--block">
              {savingPw ? 'Updating...' : 'Update Password'}
            </button>
          </form>
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
            <button onClick={handleViewCodes} className="btn btn--secondary" style={{ flex: 1, color: 'var(--primary-dark)', borderColor: 'var(--primary)' }}>
              <KeyRound size={15} /> View Backup Codes
            </button>
            <button onClick={handleToggle2fa} disabled={busy2fa} className="btn btn--secondary" style={{ flex: 1 }}>
              {busy2fa ? 'Saving...' : twoFactor ? 'Disable 2FA' : 'Enable 2FA'}
            </button>
          </div>
          <div className="toolbar" style={{ marginTop: 14, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div className="toolbar" style={{ gap: 10 }}>
              <Mail size={16} className="faint" />
              <div>
                <div className="cell-main">Login Notifications</div>
                <div className="cell-sub">Email you when a new device signs in</div>
              </div>
            </div>
            <button onClick={handleToggleLoginNotifs} disabled={busyNotifs} className={`btn btn--sm ${loginNotifs ? 'btn--danger' : 'btn--primary'}`} style={{ width: 120 }}>
              {busyNotifs ? 'Saving...' : loginNotifs ? 'Turn Off' : 'Turn On'}
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

      <Modal
        open={Boolean(codes)}
        onClose={() => setCodes(null)}
        title="Backup Codes"
        subtitle="Keep these codes safe. Each code can be used once when you lose access to your authenticator app."
        size="md"
        footer={
          <>
            <button onClick={handleRegenerateCodes} className="btn btn--secondary">
              <RefreshCw size={15} /> Regenerate
            </button>
            <button onClick={() => setCodes(null)} className="btn btn--primary">
              Done
            </button>
          </>
        }
      >
        {codes && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {codes.map((c, i) => (
              <div
                key={i}
                style={{
                  fontFamily: 'monospace',
                  fontSize: 14,
                  letterSpacing: '0.08em',
                  padding: '10px 12px',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  textAlign: 'center',
                  fontWeight: 600,
                }}
              >
                {c}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}