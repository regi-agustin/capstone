import { useEffect, useState } from 'react'
import { Mail, Phone, Pencil, User, Shield, Settings, Lock, Clock, ChevronRight } from 'lucide-react'
import { fetchProfile, formatDate } from '../services/payrollService.js'

function initials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

const ROLE_LABELS = {
  payroll_officer: 'Payroll Officer',
  customer: 'Customer',
  driver_management_head: 'Driver Management Head',
  reservation_officer: 'Reservation Officer',
  billing_officer: 'Billing Officer',
  superadmin: 'Super Admin',
  admin: 'Admin',
  driver: 'Driver',
}

export default function Profile() {
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchProfile()
      .then(setProfile)
      .catch((e) => setError(e.message))
  }, [])

  if (error) {
    return <div className="error-banner">{error}</div>
  }

  const name = profile?.account?.name || 'Loading...'
  const role = ROLE_LABELS[profile?.role] || profile?.role || ''
  const prefs = profile?.preferences || {}
  const settings = profile?.security?.settings || {}
  const activity = profile?.security?.activity || []
  const accountStatus = profile?.account?.status || 'Active'

  function dayLabel(time) {
    if (!time) return ''
    const d = new Date(time.replace(' ', 'T'))
    if (isNaN(d.getTime())) return time
    const today = new Date()
    const startOfDay = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
    const diffDays = Math.round((startOfDay(today) - startOfDay(d)) / 86400000)
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    return formatDate(time)
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>My Profile</h1>
          <p className="page-head__sub">View and manage your personal information and account settings.</p>
        </div>
      </div>

      <section className="card">
        <div className="card__body">
          <div className="toolbar" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div className="toolbar" style={{ gap: 18 }}>
              <div
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: '50%',
                  background: 'var(--navy)',
                  color: '#fff',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 700,
                  fontSize: 30,
                  border: '4px solid var(--border)',
                  flexShrink: 0,
                }}
              >
                {initials(name)}
              </div>
              <div>
                <h2 className="card__title" style={{ fontSize: 20, marginBottom: 2 }}>
                  {name}
                  <span className="badge badge--confirmed">{accountStatus}</span>
                </h2>
                <p className="muted" style={{ marginBottom: 8 }}>{role}</p>
                <div style={{ display: 'grid', gap: 4 }}>
                  <p className="toolbar" style={{ gap: 8, color: 'var(--text)' }}>
                    <Mail size={16} className="faint" /> {profile?.account?.email || '-'}
                  </p>
                  <p className="toolbar" style={{ gap: 8, color: 'var(--text)' }}>
                    <Phone size={16} className="faint" /> {profile?.account?.contactNumber || '-'}
                  </p>
                </div>
              </div>
            </div>

            <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 32 }}>
              <div className="detail-grid" style={{ minWidth: 260 }}>
                <div className="detail-item">
                  <div className="detail-item__label">Username</div>
                  <div className="detail-item__value">{profile?.account?.username || '-'}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-item__label">Role</div>
                  <div className="detail-item__value">{role}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-item__label">Member Since</div>
                  <div className="detail-item__value">{formatDate(profile?.account?.memberSince)}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-item__label">Status</div>
                  <span className="badge badge--confirmed">{accountStatus}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card__body" style={{ paddingTop: 0, paddingBottom: 0 }}>
          <div className="filter-tabs" role="tablist" aria-label="Profile tabs">
            <button type="button" role="tab" aria-selected="true" className="filter-tab filter-tab--active">Overview</button>
            <button type="button" role="tab" aria-selected="false" className="filter-tab">Activity Log</button>
            <button type="button" role="tab" aria-selected="false" className="filter-tab">Notification Preferences</button>
          </div>
        </div>

        <div className="card__body">
          <div className="form-grid">
            <div className="form-section" style={{ marginBottom: 0 }}>
              <div className="toolbar" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
                <div className="form-section__title">
                  <User size={16} /> Personal Information
                </div>
                <button className="btn btn--secondary btn--sm" title="Editing is managed by the admin">
                  <Pencil size={12} /> Edit
                </button>
              </div>
              <div className="detail-grid">
                <div className="detail-item">
                  <div className="detail-item__label">Full Name</div>
                  <div className="detail-item__value">{name}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-item__label">Email Address</div>
                  <div className="detail-item__value">{profile?.account?.email || '-'}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-item__label">Phone Number</div>
                  <div className="detail-item__value">{profile?.account?.contactNumber || '-'}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-item__label">Member Since</div>
                  <div className="detail-item__value">{formatDate(profile?.account?.memberSince)}</div>
                </div>
              </div>
            </div>

            <div className="form-section" style={{ marginBottom: 0 }}>
              <div className="form-section__title">
                <Shield size={16} /> Account Information
              </div>
              <div className="detail-grid" style={{ marginTop: 14 }}>
                <div className="detail-item">
                  <div className="detail-item__label">Username</div>
                  <div className="detail-item__value">{profile?.account?.username || '-'}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-item__label">Role</div>
                  <div className="detail-item__value">{role}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-item__label">Email Address</div>
                  <div className="detail-item__value">{profile?.account?.email || '-'}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-item__label">Status</div>
                  <span className="badge badge--confirmed">Active</span>
                </div>
              </div>
            </div>

            <div className="form-section" style={{ marginBottom: 0 }}>
              <div className="form-section__title">
                <Settings size={16} /> Preferences
              </div>
              <div className="detail-grid" style={{ marginTop: 14 }}>
                <div className="detail-item">
                  <div className="detail-item__label">Language</div>
                  <div className="detail-item__value">{prefs.language || 'English'}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-item__label">Date Format</div>
                  <div className="detail-item__value">{prefs.dateFormat || 'MMM D, YYYY'}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-item__label">Time Format</div>
                  <div className="detail-item__value">{prefs.timeFormat || '12-hour (AM/PM)'}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-item__label">Timezone</div>
                  <div className="detail-item__value">{prefs.timezone || '(GMT+08:00) Asia/Manila'}</div>
                </div>
              </div>
            </div>

            <div className="form-section" style={{ marginBottom: 0 }}>
              <div className="toolbar" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
                <div className="form-section__title">
                  <Lock size={16} /> Security
                </div>
                <button className="btn btn--secondary btn--sm">
                  <Lock size={12} /> Change Password
                </button>
              </div>
              <div className="detail-grid">
                <div className="detail-item">
                  <div className="detail-item__label">Password</div>
                  <div className="detail-item__value" style={{ letterSpacing: '0.2em' }}>********</div>
                </div>
                <div className="detail-item">
                  <div className="detail-item__label">Two-Factor Authentication</div>
                  <span className={settings.twoFactorEnabled ? 'badge badge--confirmed' : 'badge badge--neutral'}>
                    {settings.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="detail-item">
                  <div className="detail-item__label">Login Notifications</div>
                  <span className={settings.loginNotifications ? 'badge badge--confirmed' : 'badge badge--neutral'}>
                    {settings.loginNotifications ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            <div className="form-section" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
              <div className="toolbar" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
                <div className="form-section__title">
                  <Clock size={16} /> Recent Account Activity
                </div>
                <button className="btn btn--ghost btn--sm">
                  View All Activity <ChevronRight size={12} />
                </button>
              </div>
              <div className="detail-grid">
                {activity.length === 0 ? (
                  <div className="detail-item">
                    <div className="detail-item__label">—</div>
                    <div className="detail-item__value">No activity recorded yet</div>
                  </div>
                ) : (
                  activity.map((a, i) => (
                    <div className="detail-item" key={i}>
                      <div className="detail-item__label">{dayLabel(a.time)}</div>
                      <div className="detail-item__value">{a.label}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}