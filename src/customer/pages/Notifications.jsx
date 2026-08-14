import { useEffect, useState } from 'react'
import { FiCheckCircle, FiClock, FiXCircle, FiInfo, FiBell } from 'react-icons/fi'
import { fetchNotifications } from '../services/customerService.js'
import SummaryCard from '../../ro/components/SummaryCard.jsx'

const typeMeta = {
  reservation_confirmed: { icon: FiCheckCircle, color: 'var(--success)', type: 'reservation' },
  maintenance_due: { icon: FiClock, color: 'var(--warning)', type: 'system' },
  attendance_rejected: { icon: FiXCircle, color: 'var(--danger)', type: 'system' },
  system_alert: { icon: FiInfo, color: 'var(--info)', type: 'system' },
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    fetchNotifications()
      .then(setNotifications)
      .catch((e) => setError(e.message))
  }, [])

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread' },
    { id: 'reservation', label: 'Reservations' },
    { id: 'system', label: 'System' },
  ]

  const filtered = notifications.filter((n) => {
    if (activeTab === 'all') return true
    if (activeTab === 'unread') return !n.isRead
    return (typeMeta[n.type]?.type || 'system') === activeTab
  })
  const display = showAll ? filtered : filtered.slice(0, 5)

  const summary = {
    total: notifications.length,
    unread: notifications.filter((n) => !n.isRead).length,
    reservations: notifications.filter((n) => (typeMeta[n.type]?.type || 'system') === 'reservation').length,
    system: notifications.filter((n) => (typeMeta[n.type]?.type || 'system') === 'system').length,
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Notifications</h1>
          <p className="page-head__sub">Stay updated with the latest announcements and important updates.</p>
        </div>
      </div>

      {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="toolbar" style={{ marginBottom: 18 }}>
        <div className="filter-tabs" role="tablist" aria-label="Filter notifications">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`filter-tab${activeTab === tab.id ? ' filter-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'all' && (
        <div className="ai-banner" style={{ marginBottom: 18 }}>
          <FiBell size={18} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Unread Notifications ({summary.unread})</strong>
            <div style={{ fontSize: 13, marginTop: 2 }}>These are the latest notifications you haven't read yet.</div>
          </div>
        </div>
      )}

      {display.length === 0 ? (
        <div className="empty-state">
          <FiBell size={36} />
          <div className="empty-state__title">No notifications found</div>
          <div className="empty-state__sub">New updates about your reservations and account will appear here.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {display.map((notif) => {
            const meta = typeMeta[notif.type] || { icon: FiInfo, color: 'var(--warning)', type: 'system' }
            const Icon = meta.icon
            return (
              <section
                key={notif.id}
                className="card"
                style={!notif.isRead ? { borderColor: 'var(--warning)', background: 'var(--warning-soft)' } : undefined}
              >
                <div className="card__body" style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div
                    className="stat-card__icon"
                    style={{
                      width: 40,
                      height: 40,
                      background: notif.isRead ? 'var(--surface-2)' : 'var(--primary-soft)',
                      color: notif.isRead ? 'var(--text-2)' : meta.color,
                    }}
                  >
                    <Icon size={20} style={{ color: notif.isRead ? undefined : meta.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{notif.title}</div>
                      {!notif.isRead && <span className="badge badge--pending">NEW</span>}
                    </div>
                    <p style={{ marginTop: 4 }}>{notif.description}</p>
                    <p className="faint" style={{ fontSize: 12, marginTop: 6 }}>{notif.timestamp}</p>
                  </div>
                </div>
              </section>
            )
          })}
        </div>
      )}

      {filtered.length > 5 && (
        <button onClick={() => setShowAll(!showAll)} className="btn btn--secondary btn--sm" style={{ marginTop: 14 }}>
          {showAll ? 'Show less' : `View all ${filtered.length} notifications`}
        </button>
      )}

      <div className="stats-grid" style={{ marginTop: 22 }}>
        <SummaryCard icon={<FiBell size={22} />} label="Total Notifications" value={summary.total} tone="primary" />
        <SummaryCard icon={<FiBell size={22} />} label="Unread" value={summary.unread} tone="pending" />
        <SummaryCard icon={<FiBell size={22} />} label="Reservations" value={summary.reservations} tone="confirmed" />
        <SummaryCard icon={<FiBell size={22} />} label="System" value={summary.system} tone="in-use" />
      </div>

      <section className="card" style={{ marginTop: 22 }}>
        <div className="card__body">
          <h3 style={{ marginBottom: 8 }}>Need Assistance?</h3>
          <p className="muted" style={{ fontSize: 13 }}>We're here to help you.</p>
          <div className="detail-grid" style={{ marginTop: 12 }}>
            <div>
              <div className="detail-item__label">Phone</div>
              <div className="detail-item__value">0912 345 6789</div>
            </div>
            <div>
              <div className="detail-item__label">Email</div>
              <div className="detail-item__value">support@hollydot.com</div>
            </div>
            <div>
              <div className="detail-item__label">Hours</div>
              <div className="detail-item__value">Mon - Sat: 8:00 AM - 6:00 PM</div>
            </div>
            <div>
              <div className="detail-item__label">Office</div>
              <div className="detail-item__value">Clark Freeport Zone, Pampanga</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}