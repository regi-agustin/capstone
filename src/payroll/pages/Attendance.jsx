import { useEffect, useState } from 'react'
import { Download, Plus, Camera, Calendar, FileText, Shield, Image as ImageIcon, UserPlus } from 'lucide-react'
import { fetchAttendance, fetchDrivers, addAttendance, formatDate } from '../services/payrollService.js'
import SearchBar from '../../ro/components/SearchBar.jsx'
import StatusBadge from '../../ro/components/StatusBadge.jsx'
import SummaryCard from '../../ro/components/SummaryCard.jsx'
import Pagination from '../../ro/components/Pagination.jsx'
import Modal from '../../ro/components/Modal.jsx'
import { downloadCsv } from '../../ro/utils/csv.js'

const emptyAddForm = {
  driverId: '',
  date: new Date().toISOString().slice(0, 10),
  timeIn: '08:00',
  timeOut: '',
  verificationStatus: 'Verified',
  rejectionReason: '',
}

export default function Attendance() {
  const [attendance, setAttendance] = useState([])
  const [drivers, setDrivers] = useState([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState(emptyAddForm)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [msg, setMsg] = useState('')
  const [photoView, setPhotoView] = useState(null)
  const PAGE_SIZE = 10

  const load = () =>
    Promise.all([fetchAttendance(), fetchDrivers()])
      .then(([a, d]) => {
        setAttendance(a)
        setDrivers(d)
      })
      .catch((e) => setError(e.message))

  useEffect(() => {
    load()
  }, [])

  const filtered = attendance.filter((r) =>
    !search || String(r.driverName || '').toLowerCase().includes(search.toLowerCase())
  )

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE)
  const safePage = Math.min(page, Math.max(1, pageCount))
  const pageData = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const present = attendance.length
  const late = attendance.filter((r) => r.isLate).length
  const total = drivers.length
  const pct = (c) => (total > 0 ? ((c / total) * 100).toFixed(2) : '0.00')

  function handleExport() {
    if (filtered.length === 0) return
    downloadCsv(
      'attendance-records.csv',
      ['Date', 'Driver Name', 'Vehicle', 'Time In', 'Time Out', 'Late', 'Verification Status', 'Remarks'],
      filtered.map((r) => [
        r.date, r.driverName, r.vehicle, r.timeIn, r.timeOut || '',
        r.isLate ? 'Yes' : 'No', r.verificationStatus, r.rejectionReason || '',
      ])
    )
  }

  async function handleAddAttendance(e) {
    e.preventDefault()
    setAddError('')
    if (!addForm.driverId || !addForm.date || !addForm.timeIn) {
      setAddError('Driver, date, and time-in are required.')
      return
    }
    setAdding(true)
    try {
      await addAttendance({
        driverId: Number(addForm.driverId),
        date: addForm.date,
        timeIn: addForm.timeIn,
        timeOut: addForm.timeOut || '',
        verificationStatus: addForm.verificationStatus,
        rejectionReason: addForm.rejectionReason,
      })
      setShowAdd(false)
      setAddForm(emptyAddForm)
      setMsg(`Attendance recorded for ${formatDate(addForm.date)}.`)
      setTimeout(() => setMsg(''), 4000)
      await load()
    } catch (e) {
      setAddError(e.message)
    } finally {
      setAdding(false)
    }
  }

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

      {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}
      {msg && <div className="success-banner" style={{ marginBottom: 16 }}>{msg}</div>}

      <section className="card" style={{ marginBottom: 18 }}>
        <div className="card__body">
          <div className="toolbar" style={{ justifyContent: 'space-between' }}>
            <div className="toolbar">
              <span className="badge badge--neutral">
                <Calendar size={13} /> Current month
              </span>
              <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search driver..." />
            </div>
            <div className="toolbar">
              <button onClick={handleExport} className="btn btn--secondary btn--sm">
                <Download size={14} /> Export
              </button>
              <button onClick={() => setShowAdd(true)} className="btn btn--primary btn--sm">
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
                    <th style={{ textAlign: 'center' }}>Plate Photo</th>
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((r, idx) => (
                    <tr key={r.id}>
                      <td className="cell-muted" style={{ textAlign: 'center' }}>{(safePage - 1) * PAGE_SIZE + idx + 1}</td>
                      <td className="nowrap">{formatDate(r.date)}</td>
                      <td className="cell-main nowrap">{r.driverName}</td>
                      <td>{r.vehicle}</td>
                      <td style={{ textAlign: 'center' }}>{r.timeIn || '-'}</td>
                      <td style={{ textAlign: 'center' }}>{r.timeOut || '-'}</td>
                      <td>
                        <StatusBadge status={r.verificationStatus} />
                      </td>
                      <td className="cell-muted">{r.rejectionReason || (r.verificationStatus === 'Pending' ? 'Awaiting verification' : '-')}</td>
                      <td style={{ textAlign: 'center' }}>
                        {r.hasPhoto ? (
                          <button className="btn btn--icon" title="View plate photo" onClick={() => setPhotoView(r)}>
                            <ImageIcon size={16} />
                          </button>
                        ) : (
                          <span className="faint">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination
            page={safePage}
            pageCount={pageCount}
            onPage={setPage}
            total={filtered.length}
            label={`Showing ${pageData.length} of ${filtered.length} records`}
          />
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

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Attendance"
        subtitle="Manually record or correct a driver's attendance for a given date"
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn--secondary" onClick={() => setShowAdd(false)}>
              Cancel
            </button>
            <button type="submit" form="add-attendance-form" className="btn btn--primary" disabled={adding}>
              <UserPlus size={16} /> {adding ? 'Saving...' : 'Save Record'}
            </button>
          </>
        }
      >
        <form id="add-attendance-form" onSubmit={handleAddAttendance} style={{ display: 'grid', gap: 14 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="aa-driver">Driver <span className="req">*</span></label>
            <select
              id="aa-driver"
              className="form-select"
              value={addForm.driverId}
              onChange={(e) => setAddForm({ ...addForm, driverId: e.target.value })}
            >
              <option value="">Select driver...</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="aa-date">Date <span className="req">*</span></label>
            <input
              id="aa-date"
              type="date"
              className="form-input"
              value={addForm.date}
              onChange={(e) => setAddForm({ ...addForm, date: e.target.value })}
            />
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="aa-in">Time In <span className="req">*</span></label>
              <input
                id="aa-in"
                type="time"
                className="form-input"
                value={addForm.timeIn}
                onChange={(e) => setAddForm({ ...addForm, timeIn: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="aa-out">Time Out</label>
              <input
                id="aa-out"
                type="time"
                className="form-input"
                value={addForm.timeOut}
                onChange={(e) => setAddForm({ ...addForm, timeOut: e.target.value })}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="aa-status">Verification Status</label>
            <select
              id="aa-status"
              className="form-select"
              value={addForm.verificationStatus}
              onChange={(e) => setAddForm({ ...addForm, verificationStatus: e.target.value })}
            >
              <option>Verified</option>
              <option>Pending</option>
              <option>Rejected</option>
            </select>
          </div>
          {addForm.verificationStatus === 'Rejected' && (
            <div className="form-group">
              <label className="form-label" htmlFor="aa-reason">Rejection Reason <span className="req">*</span></label>
              <input
                id="aa-reason"
                className="form-input"
                placeholder="e.g. No photo, wrong vehicle"
                value={addForm.rejectionReason}
                onChange={(e) => setAddForm({ ...addForm, rejectionReason: e.target.value })}
              />
            </div>
          )}
          {addError && <div className="error-banner">{addError}</div>}
        </form>
      </Modal>

      <Modal
        open={Boolean(photoView)}
        onClose={() => setPhotoView(null)}
        title="Plate Photo"
        subtitle={photoView ? `${photoView.driverName} · ${formatDate(photoView.date)}` : ''}
        size="sm"
      >
        {photoView && (
          <div style={{ display: 'grid', gap: 12 }}>
            <img
              src={photoView.photoUrl}
              alt={`Vehicle plate photo for ${photoView.driverName}`}
              style={{ width: '100%', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface-2)' }}
            />
            <div className="detail-grid">
              <div className="detail-item">
                <div className="detail-item__label">Vehicle</div>
                <div className="detail-item__value">{photoView.vehicle}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Time In</div>
                <div className="detail-item__value">{photoView.timeIn}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Verification</div>
                <StatusBadge status={photoView.verificationStatus} />
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}