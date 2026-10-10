import { useEffect, useState } from 'react'
import { FiCalendar, FiClock, FiBell, FiShield, FiEdit3 } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { fetchProfile } from '../services/customerService.js'
import StatusBadge from '../../ro/components/StatusBadge.jsx'
import EditProfileModal from '../components/EditProfileModal.jsx'

const Detail = ({ label, value }) => (
  <div>
    <div className="detail-item__label">{label}</div>
    <div className="detail-item__value">{value || '—'}</div>
  </div>
)

export default function Profile({ user }) {
  const [profile, setProfile] = useState(null)
  const [editOpen, setEditOpen] = useState(false)

  useEffect(() => {
    fetchProfile()
      .then(setProfile)
      .catch(() => {})
  }, [])

  const account = profile?.account || {
    name: user?.name || 'Customer',
    email: '',
    contactNumber: '',
    memberSince: '',
  }

  const initials = account.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  const quickLinks = [
    { to: '/reservations', icon: FiCalendar, label: 'My Reservations' },
    { to: '/history', icon: FiClock, label: 'Rental History' },
    { to: '/notifications', icon: FiBell, label: 'Notifications' },
    { to: '/security', icon: FiShield, label: 'Security' },
  ]

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>My Profile</h1>
          <p className="page-head__sub">Manage your personal information and account settings.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 22, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 16 }}>
          <section className="card">
            <div className="card__body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: 'var(--navy)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 28,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {initials}
                </div>
                <div>
                  <h2 style={{ fontSize: 20 }}>{account.name}</h2>
                  <p className="muted" style={{ fontSize: 13 }}>
                    Member since {account.memberSince ? new Date(account.memberSince).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    {profile?.isVerified ? <StatusBadge status="Verified" /> : <StatusBadge status="Pending" />}
                    <span className="badge badge--neutral">Customer Account</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="card">
            <div className="card__header">
              <div className="card__title">Account Information</div>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => setEditOpen(true)}
              >
                <FiEdit3 size={15} /> Edit Profile
              </button>
            </div>
            <div className="card__body">
              <div className="detail-grid">
                <Detail label="Full Name" value={account.name} />
                <Detail label="Username" value={account.username || '—'} />
                <Detail label="Email Address" value={account.email || '—'} />
                <Detail label="Phone Number" value={account.contactNumber || '—'} />
              </div>
              <p className="muted" style={{ fontSize: 13, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                Keep your account information up to date to ensure a smooth rental experience.
              </p>
            </div>
          </section>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          <section className="card">
            <div className="card__header">
              <div className="card__title">Quick Links</div>
            </div>
            <div className="card__body" style={{ display: 'grid', gap: 8 }}>
              {quickLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="btn btn--secondary btn--block"
                  style={{ justifyContent: 'flex-start', paddingLeft: 14 }}
                >
                  <link.icon size={16} />
                  {link.label}
                </Link>
              ))}
            </div>
          </section>

          <section className="card">
            <div className="card__body">
              <h3 style={{ marginBottom: 4 }}>Need Help?</h3>
              <p className="muted" style={{ fontSize: 13 }}>We're here to help you! If you need any assistance with your account.</p>
              <p style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: 'var(--warning)' }}>📞 0912 345 6789 · support@hollydot.com</p>
            </div>
          </section>
        </div>
      </div>

      <EditProfileModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        profile={profile}
        onSaved={(fresh) => setProfile(fresh)}
      />
    </div>
  )
}