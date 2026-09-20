import { useEffect, useMemo, useState } from 'react'
import { Bell, Mail, AlertCircle, Calendar, CheckCircle, XCircle, FileText, Users, Settings, Truck, DollarSign, Download, Trash2 } from 'lucide-react'
import { fetchNotifications, markAllNotificationsRead, clearReadNotifications } from '../services/payrollService.js'
import SearchBar from '../../ro/components/SearchBar.jsx'
import SummaryCard from '../../ro/components/SummaryCard.jsx'
import Pagination from '../../ro/components/Pagination.jsx'
import { downloadCsv } from '../../ro/utils/csv.js'

const TYPE_LABELS = {
  attendance_verified: 'Driver Attendance',
  attendance_rejected: 'Driver Attendance',
  payroll_released: 'Payroll',
  vehicle_updated: 'Vehicle',
  default: 'System',
}

const TYPE_ICONS = {
  CheckCircle,
  XCircle,
  DollarSign,
  Truck,
  default: Bell,
}

function priorityOf(type) {
  if (type === 'attendance_rejected') return { label: 'High', cls: 'badge--denied' }
  if (type === 'attendance_verified' || type === 'vehicle_updated') return { label: 'Medium', cls: 'badge--pending' }
  return { label: 'Low', cls: 'badge--confirmed' }
}

function isThisWeek(ts) {
  const d = new Date(ts)
  if (isNaN(d.getTime())) return false
  return Date.now() - d.getTime() < 7 * 86400000
}

export default function Notifications() {
  const [notifs, setNotifs] = useState([])
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [msg, setMsg] = useState(null)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  const load = () =>
    fetchNotifications()
      .then(setNotifs)
      .catch((e) => setError(e.message))

  useEffect(() => {
    load()
  }, [])

  const unreadCount = notifs.filter((n) => !n.isRead).length
  const highCount = notifs.filter((n) => priorityOf(n.type).label === 'High').length
  const weekCount = notifs.filter((n) => isThisWeek(n.timestamp)).length

  const filtered = useMemo(
    () =>
      notifs.filter((n) => {
        const matchesTab =
          tab === 'all' ? true : tab === 'unread' ? !n.isRead : n.isRead
        const q = search.toLowerCase()
        const matchesSearch = !q || (n.title || '').toLowerCase().includes(q) || (n.description || '').toLowerCase().includes(q)
        return matchesTab && matchesSearch
      }),
    [notifs, tab, search]
  )

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE)
  const safePage = Math.min(page, Math.max(1, pageCount))
  const pageData = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function handleExport() {
    if (filtered.length === 0) return
    downloadCsv(
      'notifications.csv',
      ['Type', 'Title', 'Message', 'Timestamp', 'Priority', 'Status'],
      filtered.map((n) => [
        TYPE_LABELS[n.type] || TYPE_LABELS.default, n.title, n.description,
        n.timestamp, priorityOf(n.type).label, n.isRead ? 'Read' : 'Unread',
      ])
    )
  }

  async function handleMarkAll() {
    try {
      await markAllNotificationsRead()
      setMsg('All notifications marked as read.')
      await load()
      setTimeout(() => setMsg(null), 3000)
    } catch (e) {
      setMsg(e.message)
    }
  }

  async function handleClearRead() {
    if (!window.confirm('Are you sure you want to clear all read notifications?')) {
      return
    }
    try {
      await clearReadNotifications()
      setMsg('Read notifications cleared successfully.')
      await load()
      setTimeout(() => setMsg(null), 3000)
    } catch (e) {
      setMsg(e.message)
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Notifications</h1>
          <p className="page-head__sub">View and manage system notifications and alerts.</p>
        </div>
      </div>

      {msg && <div className="success-banner" style={{ marginBottom: 16 }}>{msg}</div>}
      {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}

      <section className="card" style={{ marginBottom: 18 }}>
        <div className="card__body">
          <div className="toolbar" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div className="filter-tabs" role="tablist" aria-label="Filter by read status">
              {[
                { key: 'all', label: 'All', count: notifs.length, cls: 'badge--neutral' },
                { key: 'unread', label: 'Unread', count: unreadCount, cls: 'badge--denied' },
                { key: 'read', label: 'Read', count: notifs.length - unreadCount, cls: 'badge--neutral' },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.key}
                  onClick={() => setTab(t.key)}
                  className={`filter-tab${tab === t.key ? ' filter-tab--active' : ''}`}
                >
                  {t.label} <span className={`badge ${t.cls}`} style={{ fontSize: 10, padding: '1px 7px', marginLeft: 6 }}>{t.count}</span>
                </button>
              ))}
            </div>
            <div className="toolbar">
              <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search notifications..." />
              <button onClick={handleMarkAll} className="btn btn--secondary btn--sm nowrap">
                <CheckCircle size={14} /> Mark all as read
              </button>
              <button onClick={handleClearRead} className="btn btn--secondary btn--sm nowrap" disabled={notifs.length - unreadCount === 0} title="Clear all read notifications">
                <Trash2 size={14} /> Clear all
              </button>
              <button onClick={handleExport} className="btn btn--secondary btn--sm nowrap">
                <Download size={14} /> Export
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="stats-grid">
        <SummaryCard icon={<Bell size={22} />} label="Total Notifications" value={notifs.length} note="All time" tone="primary" />
        <SummaryCard icon={<Mail size={22} />} label="Unread" value={unreadCount} note="Requires your attention" tone="pending" />
        <SummaryCard icon={<AlertCircle size={22} />} label="High Priority" value={highCount} note="Needs immediate action" tone="denied" />
        <SummaryCard icon={<Calendar size={22} />} label="This Week" value={weekCount} note="Last 7 days" tone="in-use" />
      </div>

      <section className="card">
        <div className="card__header">
          <div>
            <div className="card__title">
              Notification List
              <span className="badge badge--neutral">{filtered.length}</span>
            </div>
            <div className="card__sub">All system alerts and messages</div>
          </div>
        </div>
        <div className="card__body">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <Bell size={36} />
              <div className="empty-state__title">No notifications found.</div>
              <div className="empty-state__sub">Try adjusting your filters or search.</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'center' }}>#</th>
                    <th>Type</th>
                    <th>Title</th>
                    <th>Message</th>
                    <th className="nowrap">Date &amp; Time</th>
                    <th style={{ textAlign: 'center' }}>Priority</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((n, idx) => {
                    const iconKey = n.icon || 'default'
                    const IconComp = TYPE_ICONS[iconKey] || TYPE_ICONS.default
                    const pri = priorityOf(n.type)
                    return (
                      <tr key={n.id}>
                        <td className="cell-muted" style={{ textAlign: 'center' }}>{(safePage - 1) * PAGE_SIZE + idx + 1}</td>
                        <td>
                          <div className="cell-main" style={{ gap: 8 }}>
                            <IconComp size={16} />
                            {TYPE_LABELS[n.type] || TYPE_LABELS.default}
                          </div>
                        </td>
                        <td className="cell-main">{n.title}</td>
                        <td className="cell-muted">{n.description}</td>
                        <td className="cell-muted nowrap">{n.timestamp}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${pri.cls}`}>{pri.label}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${n.isRead ? 'badge--neutral' : 'badge--pending'}`}>
                            {n.isRead ? 'Read' : 'Unread'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          <Pagination
            page={safePage}
            pageCount={pageCount}
            onPage={setPage}
            total={filtered.length}
            label={`Showing ${pageData.length} of ${filtered.length} notifications`}
          />
        </div>
      </section>

      <div className="form-grid" style={{ marginTop: 22 }}>
        <div className="form-section" style={{ marginBottom: 0 }}>
          <div className="form-section__title">Notification Types</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px 24px', marginTop: 12 }}>
            <div className="toolbar" style={{ gap: 12 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--success-soft)', color: 'var(--success)', display: 'grid', placeItems: 'center' }}>
                <CheckCircle size={14} />
              </div>
              <div>
                <span className="cell-main">Driver Attendance</span>
                <span className="cell-sub" style={{ display: 'block' }}>OCR verification, mismatches</span>
              </div>
            </div>
            <div className="toolbar" style={{ gap: 12 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--primary-soft)', color: 'var(--primary-dark)', display: 'grid', placeItems: 'center' }}>
                <DollarSign size={14} />
              </div>
              <div>
                <span className="cell-main">Payroll</span>
                <span className="cell-sub" style={{ display: 'block' }}>Cut-off reminders, updates</span>
              </div>
            </div>
            <div className="toolbar" style={{ gap: 12 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--success)', color: '#fff', display: 'grid', placeItems: 'center' }}>
                <Users size={14} />
              </div>
              <div>
                <span className="cell-main">Driver Records</span>
                <span className="cell-sub" style={{ display: 'block' }}>Driver information updates</span>
              </div>
            </div>
            <div className="toolbar" style={{ gap: 12 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--warning-soft)', color: 'var(--warning)', display: 'grid', placeItems: 'center' }}>
                <Truck size={14} />
              </div>
              <div>
                <span className="cell-main">Vehicle</span>
                <span className="cell-sub" style={{ display: 'block' }}>Vehicle / fleet updates</span>
              </div>
            </div>
            <div className="toolbar" style={{ gap: 12 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: '#eef1f5', color: 'var(--text-soft)', display: 'grid', placeItems: 'center' }}>
                <Settings size={14} />
              </div>
              <div>
                <span className="cell-main">System</span>
                <span className="cell-sub" style={{ display: 'block' }}>System announcements</span>
              </div>
            </div>
          </div>
        </div>

        <div className="form-section" style={{ marginBottom: 0 }}>
          <div className="form-section__title">Notes:</div>
          <ul className="cell-sub" style={{ listStyle: 'disc', paddingLeft: 18, display: 'grid', gap: 6, marginTop: 10 }}>
            <li>Unread notifications remain in your list until you mark them as read.</li>
            <li>High priority notifications require immediate attention.</li>
            <li>All dates and times are based on system time.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}