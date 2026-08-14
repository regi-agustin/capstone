import { useEffect, useState } from 'react'
import { Mail, Phone, Pencil, User, Shield, Settings, Lock, Clock, ChevronRight } from 'lucide-react'
import { fetchProfile, updateProfile, changePassword, formatDate } from '../services/payrollService.js'
import Modal from '../../ro/components/Modal.jsx'

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
  const [msg, setMsg] = useState(null)
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState({ email: '', contactNumber: '' })
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [pwForm, setPwForm] = useState({ current: '', new: '', confirm: '' })
  const [savingPw, setSavingPw] = useState(false)
  const [pwError, setPwError] = useState('')
  const [showAllActivity, setShowAllActivity] = useState(false)

  const load = () =>
    fetchProfile()
      .then(setProfile)
      .catch((e) => setError(e.message))

  useEffect(() => {
    load()
  }, [])

  function showMsg(text, ok = true) {
    setMsg({ text, ok })
    setTimeout(() => setMsg(null), 4000)
  }

  function openEdit() {
    setEditForm({ email: profile?.account?.email || '', contactNumber: profile?.account?.contactNumber || '' })
    setEditError('')
    setShowEdit(true)
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    setEditError('')
    setSavingEdit(true)
    try {
      await updateProfile({ email: editForm.email, contactNumber: editForm.contactNumber })
      setShowEdit(false)
      showMsg('Profile updated successfully.')
      await load()
    } catch (e) {
      setEditError(e.message)
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleSavePw(e) {
    e.preventDefault()
    setPwError('')
    if (pwForm.new !== pwForm.confirm) return setPwError('New password and confirmation do not match.')
    if (pwForm.new.length < 8) return setPwError('Password must be at least 8 characters.')
    setSavingPw(true)
    try {
      await changePassword({ currentPassword: pwForm.current, newPassword: pwForm.new, confirmPassword: pwForm.confirm })
      setShowPw(false)
      setPwForm({ current: '', new: '', confirm: '' })
      showMsg('Password updated successfully.')
    } catch (e) {
      setPwError(e.message)
    } finally {
      setSavingPw(false)
    }
  }

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

      {msg && (
        <div className={msg.ok ? 'success-banner' : 'error-banner'} style={{ marginBottom: 16 }}>
          {msg.text}
        </div>
      )}

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
                <button onClick={openEdit} className="btn btn--secondary btn--sm">
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
                <button onClick={() => { setPwForm({ current: '', new: '', confirm: '' }); setPwError(''); setShowPw(true) }} className="btn btn--secondary btn--sm">
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
                <button onClick={() => setShowAllActivity((v) => !v)} className="btn btn--ghost btn--sm">
                  {showAllActivity ? 'Show Less' : 'View All Activity'} <ChevronRight size={12} />
                </button>
              </div>
              <div className="detail-grid">
                {activity.length === 0 ? (
                  <div className="detail-item">
                    <div className="detail-item__label">—</div>
                    <div className="detail-item__value">No activity recorded yet</div>
                  </div>
                ) : (
                  (showAllActivity ? activity : activity.slice(0, 4)).map((a, i) => (
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

      <Modal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        title="Edit Profile"
        subtitle="Update your contact details"
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn--secondary" onClick={() => setShowEdit(false)}>
              Cancel
            </button>
            <button type="submit" form="edit-profile-form" className="btn btn--primary" disabled={savingEdit}>
              {savingEdit ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }
      >
        <form id="edit-profile-form" onSubmit={handleSaveEdit} style={{ display: 'grid', gap: 14 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="ep-name">Full Name</label>
            <input id="ep-name" className="form-input" value={name} disabled />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="ep-email">Email Address</label>
            <input
              id="ep-email"
              type="email"
              className="form-input"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="ep-contact">Phone Number</label>
            <input
              id="ep-contact"
              className="form-input"
              value={editForm.contactNumber}
              onChange={(e) => setEditForm({ ...editForm, contactNumber: e.target.value })}
            />
          </div>
          {editError && <div className="error-banner">{editError}</div>}
        </form>
      </Modal>

      <Modal
        open={showPw}
        onClose={() => setShowPw(false)}
        title="Change Password"
        subtitle="Update the password for your account"
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn--secondary" onClick={() => setShowPw(false)}>
              Cancel
            </button>
            <button type="submit" form="change-pw-form" className="btn btn--primary" disabled={savingPw}>
              {savingPw ? 'Updating...' : 'Update Password'}
            </button>
          </>
        }
      >
        <form id="change-pw-form" onSubmit={handleSavePw} style={{ display: 'grid', gap: 14 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="cp-current">Current Password</label>
            <input
              id="cp-current"
              type="password"
              className="form-input"
              value={pwForm.current}
              onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
              placeholder="Enter current password"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="cp-new">New Password</label>
            <input
              id="cp-new"
              type="password"
              className="form-input"
              value={pwForm.new}
              onChange={(e) => setPwForm({ ...pwForm, new: e.target.value })}
              placeholder="Enter new password"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="cp-confirm">Confirm New Password</label>
            <input
              id="cp-confirm"
              type="password"
              className="form-input"
              value={pwForm.confirm}
              onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
              placeholder="Confirm new password"
            />
          </div>
          {pwError && <div className="error-banner">{pwError}</div>}
        </form>
      </Modal>
    </div>
  )
}