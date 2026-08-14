import { useEffect, useState } from 'react'
import { Download, Plus, Camera, ChevronLeft, ChevronRight, Calendar, FileText, Shield } from 'lucide-react'
import { fetchAttendance, fetchDrivers, formatDate } from '../services/payrollService.js'
import SearchBar from '../../ro/components/SearchBar.jsx'
import StatusBadge from '../../ro/components/StatusBadge.jsx'
import SummaryCard from '../../ro/components/SummaryCard.jsx'

export default function Attendance() {
  const [attendance, setAttendance] = useState([])
  const [drivers, setDrivers] = useState([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([fetchAttendance(), fetchDrivers()])
      .then(([a, d]) => {
        setAttendance(a)
        setDrivers(d)
      })
      .catch((e) => setError(e.message))
  }, [])

  const filtered = attendance.filter((r) =>
    !search || String(r.driverName || '').toLowerCase().includes(search.toLowerCase())
  )

  const present = attendance.length
  const late = attendance.filter((r) => r.isLate).length
  const total = drivers.length
  const pct = (c) => (total > 0 ? ((c / total) * 100).toFixed(2) : '0.00')

  if (error) {
    return <div className="error-banner">{error}</div>
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Driver Attendance</h1>
          <p className="page-head__sub">Manage driver attendance with OCR plate number verification.</p>
        </div>
      </div>

      <section className="card" style={{ marginBottom: 18 }}>
        <div className="card__body">
          <div className="toolbar" style={{ justifyContent: 'space-between' }}>
            <div className="toolbar">
              <span className="badge badge--neutral">
                <Calendar size={13} /> Current month
              </span>
              <SearchBar value={search} onChange={setSearch} placeholder="Search driver..." />
            </div>
            <div className="toolbar">
              <button className="btn btn--secondary btn--sm">
                <Download size={14} /> Export
              </button>
              <button className="btn btn--primary btn--sm" title="Attendance upload happens through the driver app">
                <Plus size={14} /> Add Attendance
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <SummaryCard icon={<Calendar size={22} />} label="Total Drivers" value={total} note="All active drivers" tone="primary" />
        <SummaryCard icon={<Camera size={22} />} label="Present" value={present} note={`${pct(present)}% of total`} tone="confirmed" />
        <SummaryCard icon={<FileText size={22} />} label="Late" value={late} note={`${pct(late)}% of total · after 8:00 AM`} tone="pending" />
        <SummaryCard icon={<Shield size={22} />} label="Absent" value={Math.max(0, total - present)} note={`${pct(Math.max(0, total - present))}% of total`} tone="denied" />
      </div>

      <div className="ai-banner" style={{ marginBottom: 18, flexWrap: 'wrap' }}>
        {[
          { icon: Camera, title: '1. Capture Vehicle Image', desc: 'Staff captures a clear image of the vehicle plate.' },
          { icon: FileText, title: '2. OCR Extraction (Tesseract)', desc: 'Tesseract OCR extracts the plate number from the image.' },
          { icon: Shield, title: '3. System Verification', desc: 'System compares OCR result with the entered plate number.' },
          { icon: FileText, title: '4. Attendance Recorded', desc: 'Attendance is saved with verification status.' },
        ].map((s, i) => (
          <div key={i} className="toolbar" style={{ gap: 12 }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  background: 'var(--surface)',
                  borderRadius: 12,
                  border: '1px solid var(--primary)',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--primary-dark)',
                  margin: '0 auto 8px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <s.icon size={24} />
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{s.title}</div>
              <div style={{ fontSize: 10, color: 'var(--text-soft)', maxWidth: 140, margin: '0 auto' }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <section className="card">
        <div className="card__header">
          <div>
            <div className="card__title">
              Attendance Records
              <span className="badge badge--neutral">{filtered.length}</span>
            </div>
            <div className="card__sub">Daily attendance with verification status</div>
          </div>
        </div>
        <div className="card__body">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <Calendar size={36} />
              <div className="empty-state__title">No attendance records found.</div>
              <div className="empty-state__sub">Attendance appears here once drivers clock in through the app.</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'center' }}>#</th>
                    <th>Date</th>
                    <th>Driver Name</th>
                    <th>Vehicle</th>
                    <th style={{ textAlign: 'center' }}>Time In</th>
                    <th style={{ textAlign: 'center' }}>Time Out</th>
                    <th>Verification Status</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, idx) => (
                    <tr key={r.id}>
                      <td className="cell-muted" style={{ textAlign: 'center' }}>{idx + 1}</td>
                      <td className="nowrap">{formatDate(r.date)}</td>
                      <td className="cell-main nowrap">{r.driverName}</td>
                      <td>{r.vehicle}</td>
                      <td style={{ textAlign: 'center' }}>{r.timeIn || '-'}</td>
                      <td style={{ textAlign: 'center' }}>{r.timeOut || '-'}</td>
                      <td>
                        <StatusBadge status={r.verificationStatus} />
                      </td>
                      <td className="cell-muted">{r.rejectionReason || (r.verificationStatus === 'Pending' ? 'Awaiting verification' : '-')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="toolbar" style={{ justifyContent: 'space-between', marginTop: 16 }}>
            <span className="cell-sub">Showing {filtered.length} of {attendance.length} records</span>
            <div className="toolbar">
              <button className="btn btn--secondary btn--icon btn--sm" disabled title="Previous page">
                <ChevronLeft size={16} />
              </button>
              <button className="btn btn--primary btn--sm">1</button>
              <button className="btn btn--secondary btn--icon btn--sm" disabled title="Next page">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="form-grid" style={{ marginTop: 22 }}>
        <div className="form-section">
          <div className="form-section__title">Legend <span className="form-hint">(Verification Status)</span></div>
          <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
            <div className="toolbar" style={{ alignItems: 'flex-start', gap: 12 }}>
              <StatusBadge status="Verified" />
              <span className="cell-sub">Attendance is verified.</span>
            </div>
            <div className="toolbar" style={{ alignItems: 'flex-start', gap: 12 }}>
              <StatusBadge status="Pending" />
              <span className="cell-sub">Awaiting verification (OCR flow).</span>
            </div>
            <div className="toolbar" style={{ alignItems: 'flex-start', gap: 12 }}>
              <StatusBadge status="Rejected" />
              <span className="cell-sub">Attendance was rejected.</span>
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="form-section__title">Notes:</div>
          <ul className="cell-sub" style={{ listStyle: 'disc', paddingLeft: 18, display: 'grid', gap: 6, marginTop: 10 }}>
            <li>Capture a clear image of the vehicle plate for accurate OCR extraction.</li>
            <li>Attendance records can be edited on the same day only.</li>
            <li>Cut-off time for late is 8:00 AM.</li>
            <li>All times are based on system time.</li>
          </ul>
        </div>

        <div className="form-section" style={{ gridColumn: '1 / -1' }}>
          <div className="form-section__title">Sample Image</div>
          <div
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              height: 64,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 12,
            }}
          >
            <div
              style={{
                background: 'var(--navy)',
                color: '#fff',
                fontWeight: 700,
                padding: '4px 16px',
                borderRadius: 6,
                fontSize: 14,
                letterSpacing: '0.2em',
              }}
            >
              ABC 1234
            </div>
          </div>
          <div className="toolbar" style={{ gap: 8, marginTop: 8 }}>
            <span className="cell-muted">OCR Result:</span>
            <span style={{ color: 'var(--success)', fontWeight: 500 }}>ABC 1234</span>
          </div>
        </div>
      </div>
    </div>
  )
}