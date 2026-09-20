import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar,
  Users,
  FileText,
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  ChevronRight,
  Bell,
  UserCheck,
  Truck,
  DollarSign,
} from 'lucide-react'
import {
  fetchPayrollRecords,
  fetchDrivers,
  fetchAttendance,
  fetchNotifications,
  statusLabel,
  formatDateTime,
  formatPeso,
} from '../services/payrollService.js'
import SummaryCard from '../../ro/components/SummaryCard.jsx'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function cutoffLabel(date = new Date()) {
  const y = date.getFullYear()
  const m = MONTHS[date.getMonth()]
  const last = new Date(y, date.getMonth() + 1, 0).getDate()
  return date.getDate() <= 15 ? `${m} 1 – 15, ${y}` : `${m} 16 – ${last}, ${y}`
}

function activityIcon(type) {
  switch (type) {
    case 'attendance_verified':
      return <CheckCircle size={16} />
    case 'attendance_rejected':
      return <XCircle size={16} />
    case 'payroll_released':
      return <DollarSign size={16} />
    case 'vehicle_updated':
      return <Truck size={16} />
    default:
      return <Bell size={16} />
  }
}

export default function Dashboard() {
  const [payroll, setPayroll] = useState([])
  const [drivers, setDrivers] = useState([])
  const [attendance, setAttendance] = useState([])
  const [notifications, setNotifications] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchPayrollRecords(), fetchDrivers(), fetchAttendance(), fetchNotifications()])
      .then(([p, d, a, n]) => {
        setPayroll(p || [])
        setDrivers(d || [])
        setAttendance(a || [])
        setNotifications(n || [])
        setError('')
      })
      .catch((e) => {
        setError(e.message || 'Failed to load dashboard data')
        setPayroll([])
        setDrivers([])
        setAttendance([])
        setNotifications([])
      })
      .finally(() => setLoading(false))
  }, [])

  const month = new Date().toISOString().slice(0, 7)
  const cutoff = (payroll || []).filter((r) => (r.date || '').startsWith(month))
  const totalReceivable = cutoff.reduce((s, r) => s + (r.netAmount || 0), 0)
  const statusCounts = cutoff.reduce((acc, r) => {
    const status = r.status || 'Pending'
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {})
  const total = cutoff.length
  const pct = (c) => (total > 0 ? ((c / total) * 100).toFixed(2) : '0.00')

  const verified = (attendance || []).filter((a) => a.verificationStatus === 'Verified').length
  const pendingA = (attendance || []).filter((a) => a.verificationStatus === 'Pending').length
  const rejected = (attendance || []).filter((a) => a.verificationStatus === 'Rejected').length
  const missing = Math.max(0, (drivers || []).length - (attendance || []).length)
  const presentTotal = (drivers || []).length || (attendance || []).length

  const recent = (notifications || []).slice(0, 4)
  const announcements = (notifications || []).filter(
    (n) => n.type !== 'attendance_verified' && n.type !== 'attendance_rejected'
  ).slice(0, 2)

  const attendancePct = (c) => (presentTotal > 0 ? ((c / presentTotal) * 100).toFixed(2) : '0.00')

  if (loading) {
    return (
      <div className="ro-app loading-state">
        <div className="spinner"></div>
        <span>Loading dashboard data...</span>
      </div>
    )
  }

  if (error) {
    return <div className="ro-app error-banner">{error}</div>
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Payroll Dashboard</h1>
          <p className="page-head__sub">Payroll overview, attendance status, and upcoming reminders.</p>
        </div>
      </div>

      <div className="stats-grid">
        <SummaryCard icon={<Calendar size={22} />} label="Current Cut-Off Period" value={cutoffLabel()} note="This period" tone="primary" />
        <SummaryCard icon={<Users size={22} />} label="Drivers with Payroll Records" value={cutoff.length} note={`Total Drivers: ${drivers.length}`} tone="confirmed" />
        <SummaryCard icon={<FileText size={22} />} label="Payroll Records for Review" value={statusCounts.for_review || 0} note="Needs your attention" tone="pending" />
        <SummaryCard icon={<CreditCard size={22} />} label="Total Receivable" value={formatPeso(totalReceivable)} note="For this cut-off" tone="confirmed" />
      </div>

      <div className="stats-grid">
        <section className="card">
          <div className="card__header">
            <div className="card__title">Payroll Status</div>
          </div>
          <div className="card__body">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div
                className="stat-card__value"
                style={{
                  width: 112,
                  height: 112,
                  borderRadius: '50%',
                  border: '8px solid var(--primary)',
                  borderRightColor: 'var(--success)',
                  borderBottomColor: 'var(--danger)',
                  borderLeftColor: 'var(--primary)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--surface)',
                  fontSize: 24,
                }}
              >
                <strong style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)', lineHeight: 1.1 }}>{total}</strong>
                <span className="cell-sub">Records</span>
              </div>
              <div className="cell-sub" style={{ flex: 1, paddingLeft: 16, display: 'grid', gap: 10 }}>
                <div className="toolbar" style={{ justifyContent: 'space-between' }}>
                  <span className="toolbar" style={{ gap: 8 }}>
                    <span className="badge badge--dot" style={{ background: 'var(--primary)' }} /> Draft
                  </span>
                  <span>{statusCounts.draft || 0} ({pct(statusCounts.draft || 0)}%)</span>
                </div>
                <div className="toolbar" style={{ justifyContent: 'space-between' }}>
                  <span className="toolbar" style={{ gap: 8 }}>
                    <span className="badge badge--dot" style={{ background: 'var(--pending, #f59e0b)' }} /> For Review
                  </span>
                  <span>{statusCounts.for_review || 0} ({pct(statusCounts.for_review || 0)}%)</span>
                </div>
                <div className="toolbar" style={{ justifyContent: 'space-between' }}>
                  <span className="toolbar" style={{ gap: 8 }}>
                    <span className="badge badge--dot" style={{ background: 'var(--success)' }} /> Approved
                  </span>
                  <span>{statusCounts.approved || 0} ({pct(statusCounts.approved || 0)}%)</span>
                </div>
                <div className="toolbar" style={{ justifyContent: 'space-between' }}>
                  <span className="toolbar" style={{ gap: 8 }}>
                    <span className="badge badge--dot" style={{ background: 'var(--confirmed, #16a34a)' }} /> Paid
                  </span>
                  <span>{statusCounts.paid || 0} ({pct(statusCounts.paid || 0)}%)</span>
                </div>
                <div className="toolbar" style={{ justifyContent: 'space-between' }}>
                  <span className="toolbar" style={{ gap: 8 }}>
                    <span className="badge badge--dot" style={{ background: 'var(--danger)' }} /> Cancelled
                  </span>
                  <span>{statusCounts.cancelled || 0} ({pct(statusCounts.cancelled || 0)}%)</span>
                </div>
              </div>
            </div>
            <div className="divider" />
            <div style={{ textAlign: 'center' }}>
              <Link to="/payroll" className="toolbar" style={{ justifyContent: 'center', gap: 4, fontSize: 13, fontWeight: 500 }}>
                View all payroll records <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card__header">
            <div className="card__title">Driver Attendance Summary</div>
          </div>
          <div className="card__body" style={{ display: 'grid', gap: 10 }}>
            <div className="toolbar" style={{ justifyContent: 'space-between', padding: 6 }}>
              <span className="toolbar" style={{ gap: 8 }}>
                <CheckCircle size={18} /> Verified Attendance
              </span>
              <span className="cell-main">{verified} ({attendancePct(verified)}%)</span>
            </div>
            <div className="toolbar" style={{ justifyContent: 'space-between', padding: 6 }}>
              <span className="toolbar" style={{ gap: 8 }}>
                <Clock size={18} /> Pending Verification
              </span>
              <span className="cell-main">{pendingA} ({attendancePct(pendingA)}%)</span>
            </div>
            <div className="toolbar" style={{ justifyContent: 'space-between', padding: 6 }}>
              <span className="toolbar" style={{ gap: 8 }}>
                <XCircle size={18} /> Rejected Attendance
              </span>
              <span className="cell-main">{rejected} ({attendancePct(rejected)}%)</span>
            </div>
            <div className="toolbar" style={{ justifyContent: 'space-between', padding: 6 }}>
              <span className="toolbar" style={{ gap: 8 }}>
                <AlertCircle size={18} /> Missing Records
              </span>
              <span className="cell-main">{missing} ({attendancePct(missing)}%)</span>
            </div>
            <div className="divider" />
            <div style={{ textAlign: 'center' }}>
              <Link to="/attendance" className="toolbar" style={{ justifyContent: 'center', gap: 4, fontSize: 13, fontWeight: 500 }}>
                View attendance records <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card__header">
            <div className="card__title">
              <Calendar size={18} /> Upcoming Reminders
            </div>
          </div>
          <div className="card__body" style={{ display: 'grid', gap: 18 }}>
            <div>
              <div className="cell-main">Next Cut-Off Period</div>
              <div className="stat-card__value" style={{ fontSize: 18, color: 'var(--primary-dark)', margin: '4px 0' }}>
                {cutoffLabel(new Date(Date.now() + 16 * 86400000))}
              </div>
              <div className="cell-sub">Starts after the current cut-off</div>
            </div>
            <div className="divider" />
            <div>
              <div className="cell-main">Payroll Due Date</div>
              <div className="stat-card__value" style={{ fontSize: 18, color: 'var(--primary-dark)', margin: '4px 0' }}>
                End of cut-off day
              </div>
              <div className="cell-sub">Submit records before cut-off closes</div>
            </div>
            <div className="divider" />
            <div style={{ textAlign: 'center' }}>
              <Link to="/payroll" className="toolbar" style={{ justifyContent: 'center', gap: 4, fontSize: 13, fontWeight: 500 }}>
                View payroll records <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      </div>

      <div className="stats-grid">
        <section className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card__header">
            <div className="card__title">Recent Activity</div>
          </div>
          <div className="card__body">
            {recent.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__title">No recent activity yet.</div>
              </div>
            ) : (
              <div>
                {recent.map((n, i) => (
                  <div key={n.id || i}>
                    {i > 0 && <div className="divider" />}
                    <div className="toolbar" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div className="cell-main">{activityIcon(n.type)} {n.title || 'Activity'}</div>
                        <div className="muted">{n.description || ''}</div>
                      </div>
                      <div className="cell-muted nowrap" style={{ paddingLeft: 16, textAlign: 'right' }}>{formatDateTime(n.timestamp)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="divider" />
            <div style={{ textAlign: 'center' }}>
              <Link to="/notifications" className="toolbar" style={{ justifyContent: 'center', gap: 4, fontSize: 13, fontWeight: 500 }}>
                View all notifications <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card__header">
            <div className="card__title">System Announcements</div>
          </div>
          <div className="card__body">
            {announcements.length === 0 ? (
              <div className="empty-state">
                <Bell size={36} />
                <div className="empty-state__title">No announcements yet</div>
                <div className="empty-state__sub">System announcements will appear here when they are posted.</div>
              </div>
            ) : (
              <div>
                {announcements.map((n, i) => (
                  <div key={n.id || i}>
                    {i > 0 && <div className="divider" />}
                    <div className="cell-main">
                      <Bell size={16} style={{ marginTop: 1 }} /> {n.title || 'Announcement'}
                    </div>
                    <div className="cell-sub" style={{ marginTop: 4 }}>{n.description || ''}</div>
                    <div className="cell-muted" style={{ marginTop: 8 }}>{formatDateTime(n.timestamp)}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="divider" />
            <div style={{ textAlign: 'center' }}>
              <Link to="/notifications" className="toolbar" style={{ justifyContent: 'center', gap: 4, fontSize: 13, fontWeight: 500 }}>
                View all announcements <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
