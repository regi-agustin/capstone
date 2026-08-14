import { useEffect, useMemo, useState } from 'react'
import { Download, Plus, Trash2, FileText, Save } from 'lucide-react'
import {
  fetchPayrollRecords,
  fetchDrivers,
  fetchTripLogs,
  createPayrollRecord,
  updatePayrollStatus,
  deletePayrollRecord,
  statusLabel,
  formatDate,
  formatPeso,
} from '../services/payrollService.js'
import SearchBar from '../../ro/components/SearchBar.jsx'
import StatusBadge from '../../ro/components/StatusBadge.jsx'
import Pagination from '../../ro/components/Pagination.jsx'
import { downloadCsv } from '../../ro/utils/csv.js'

const EARNINGS = [
  { key: 'carRental', label: '1 Car Rental Payment' },
  { key: 'fuelSubsidy', label: '2 Fuel Subsidy' },
  { key: 'excessGas', label: '3 Excess Gas' },
  { key: 'overnightAllowance', label: '4 Overnight Allowance' },
  { key: 'overtime', label: '5 Overtime' },
  { key: 'miscCharges', label: '6 Total Miscellaneous Charges' },
  { key: 'dimeHazard', label: '7 Dime and Hazard Pay' },
  { key: 'dispute', label: '8 Dispute', negative: true },
]

const DEDUCTIONS = [
  { key: 'cashAdvance', label: '9 Cash Advance' },
  { key: 'penalty', label: '10 Penalty' },
  { key: 'excessCooling', label: '11 Excess Cooling' },
  { key: 'absentLeave', label: '12 Absent/Leave' },
  { key: 'wtax', label: '13 Less 2% WTAX on Misc. Charges' },
  { key: 'membership', label: '14 Membership' },
  { key: 'cashBond', label: '15 Cash Bond' },
  { key: 'others', label: '16 Others' },
  { key: 'coopSavings', label: '17 Coop Savings' },
  { key: 'coopLoan', label: '18 Coop Loan' },
]

const TRIP_HEADERS = ['#', 'Date', 'Car Code', 'Driver', 'Requested Time', 'Time Out', 'Work Hours', 'Distance (km)', 'Start Location', 'End Location', 'Expenses (₱)', 'Remarks']

const emptyForm = {
  driverId: '',
  payrollDate: new Date().toISOString().slice(0, 10),
  earnings: Object.fromEntries(EARNINGS.map((e) => [e.key, ''])),
  deductions: Object.fromEntries(DEDUCTIONS.map((d) => [d.key, ''])),
}

export default function PayrollManagement() {
  const [records, setRecords] = useState([])
  const [drivers, setDrivers] = useState([])
  const [tripLogs, setTripLogs] = useState([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [msg, setMsg] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(0)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  const load = () =>
    Promise.all([fetchPayrollRecords(), fetchDrivers(), fetchTripLogs()])
      .then(([p, d, t]) => {
        setRecords(p)
        setDrivers(d)
        setTripLogs(t)
      })
      .catch((e) => setError(e.message))

  useEffect(() => {
    load()
  }, [])

  const num = (v) => (parseFloat(v) || 0)

  const totals = useMemo(() => {
    const earnings = Object.keys(form.earnings).reduce(
      (s, k) => s + (k === 'dispute' ? 0 : num(form.earnings[k])),
      0
    ) - num(form.earnings.dispute)
    const deductions = Object.keys(form.deductions).reduce((s, k) => s + num(form.deductions[k]), 0)
    return { earnings, deductions, net: earnings - deductions }
  }, [form])

  const filtered = records.filter((r) =>
    !search || String(r.driverName || '').toLowerCase().includes(search.toLowerCase())
  )

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE)
  const safePage = Math.min(page, Math.max(1, pageCount))
  const pageData = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const selectedDriverId = form.driverId ? Number(form.driverId) : null
  const trips = useMemo(
    () => tripLogs.filter((t) => !selectedDriverId || t.driverId === selectedDriverId),
    [tripLogs, selectedDriverId]
  )

  function handleExport() {
    if (filtered.length === 0) return
    downloadCsv(
      'payroll-records.csv',
      ['Driver', 'Contact', 'Payroll Date', 'Basic Salary', 'Allowances', 'Deductions', 'Net Amount', 'Status'],
      filtered.map((r) => [
        r.driverName, r.contact || '', r.date,
        r.basicSalary, r.allowances, r.deductions, r.netAmount, statusLabel(r.status),
      ])
    )
  }

  function handleExportTrips() {
    if (trips.length === 0) return
    downloadCsv(
      'trip-breakdown.csv',
      TRIP_HEADERS,
      trips.map((t, i) => [
        i + 1, t.date, t.tripCode || t.plateNumber, t.driverName,
        t.startTime, t.endTime, t.hours ?? '', t.distance ?? '',
        t.startLocation, t.endLocation, t.expenses, t.remarks,
      ])
    )
  }

  function setEarn(key, value) {
    setForm((f) => ({ ...f, earnings: { ...f.earnings, [key]: value } }))
  }

  function setDeduc(key, value) {
    setForm((f) => ({ ...f, deductions: { ...f.deductions, [key]: value } }))
  }

  function showMsg(text, ok = true) {
    setMsg({ text, ok })
    setTimeout(() => setMsg(null), 4000)
  }

  async function handleSave() {
    if (!form.driverId) return showMsg('Select a driver.', false)
    if (totals.earnings <= 0) return showMsg('Total earnings must be greater than zero.', false)
    setSaving(true)
    try {
      await createPayrollRecord({
        driverId: Number(form.driverId),
        payrollDate: form.payrollDate,
        basicSalary: num(form.earnings.carRental) + num(form.earnings.excessGas) + num(form.earnings.overtime),
        allowances:
          num(form.earnings.fuelSubsidy) +
          num(form.earnings.overnightAllowance) +
          num(form.earnings.miscCharges) +
          num(form.earnings.dimeHazard) -
          num(form.earnings.dispute),
        deductions: totals.deductions,
        netSalary: totals.net,
      })
      showMsg('Payroll record saved (For Review).')
      setForm(emptyForm)
      await load()
    } catch (e) {
      showMsg(e.message, false)
    } finally {
      setSaving(false)
    }
  }

  async function handleStatus(id, status) {
    setBusy(id)
    try {
      await updatePayrollStatus(id, status)
      showMsg('Payroll status updated.')
      await load()
    } catch (e) {
      showMsg(e.message, false)
    } finally {
      setBusy(0)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this payroll record?')) return
    setBusy(id)
    try {
      await deletePayrollRecord(id)
      showMsg('Payroll record deleted.')
      await load()
    } catch (e) {
      showMsg(e.message, false)
    } finally {
      setBusy(0)
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Payroll Management</h1>
          <p className="page-head__sub">Create, encode, review and verify driver payroll records.</p>
        </div>
      </div>

      {msg && (
        <div className={msg.ok ? 'success-banner' : 'error-banner'} style={{ marginBottom: 16 }}>
          {msg.text}
        </div>
      )}
      {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}

      <section className="card">
        <div className="card__header">
          <div>
            <div className="card__title">
              Payroll Records
              <span className="badge badge--neutral">{filtered.length}</span>
            </div>
            <div className="card__sub">Cut-off period records</div>
          </div>
          <div className="toolbar">
            <span className="badge badge--neutral">
              Cut-off Period · <strong>{records.length}</strong> record(s)
            </span>
            <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search driver..." />
            <button onClick={handleExport} className="btn btn--secondary btn--sm">
              <Download size={14} /> Export
            </button>
            <button
              onClick={() => document.getElementById('payroll-form')?.scrollIntoView({ behavior: 'smooth' })}
              className="btn btn--primary btn--sm"
            >
              <Plus size={14} /> New Payroll Record
            </button>
          </div>
        </div>

        <div className="card__body">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <FileText size={36} />
              <div className="empty-state__title">No payroll records found.</div>
              <div className="empty-state__sub">Create a new payroll record to get started.</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Driver</th>
                    <th>Contact</th>
                    <th>Payroll Date</th>
                    <th style={{ textAlign: 'right' }}>Basic Salary</th>
                    <th style={{ textAlign: 'right' }}>Allowances</th>
                    <th style={{ textAlign: 'right' }}>Deductions</th>
                    <th style={{ textAlign: 'right' }}>Total Receivable</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((r, idx) => (
                    <tr key={r.id}>
                      <td className="cell-muted">{(safePage - 1) * PAGE_SIZE + idx + 1}</td>
                      <td className="cell-main">{r.driverName}</td>
                      <td>{r.contact || '-'}</td>
                      <td className="nowrap">{formatDate(r.date)}</td>
                      <td className="nowrap" style={{ textAlign: 'right' }}>{formatPeso(r.basicSalary)}</td>
                      <td className="nowrap" style={{ textAlign: 'right' }}>{formatPeso(r.allowances)}</td>
                      <td className="nowrap" style={{ textAlign: 'right', color: 'var(--danger)' }}>-{formatPeso(r.deductions)}</td>
                      <td className="cell-main nowrap" style={{ textAlign: 'right' }}>{formatPeso(r.netAmount)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <StatusBadge status={statusLabel(r.status)} />
                      </td>
                      <td>
                        <div className="actions-row" style={{ justifyContent: 'center' }}>
                          <select
                            value={r.status}
                            disabled={busy === r.id}
                            onChange={(e) => handleStatus(r.id, e.target.value)}
                            className="sort-select"
                            style={{ fontSize: 12, padding: '5px 8px' }}
                          >
                            <option value="Pending">For Review</option>
                            <option value="Paid">Completed</option>
                            <option value="Unpaid">Unpaid</option>
                          </select>
                          <button
                            onClick={() => handleDelete(r.id)}
                            disabled={busy === r.id}
                            className="btn btn--icon"
                            style={{ color: 'var(--danger)' }}
                            title="Delete record"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
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

      <div id="payroll-form" className="card" style={{ marginTop: 22 }}>
        <div className="card__body" style={{ display: 'grid', gap: 18 }}>
          <div className="form-section">
            <div className="form-section__title">
              A. HEADER <span className="form-hint">(input manually)</span>
            </div>
            <div className="form-grid" style={{ marginTop: 14 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="pr-driver">Car Driver <span className="req">*</span></label>
                <select
                  id="pr-driver"
                  value={form.driverId}
                  onChange={(e) => setForm((f) => ({ ...f, driverId: e.target.value }))}
                  className="form-select"
                >
                  <option value="">Select driver...</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="pr-date">Payroll Date <span className="req">*</span></label>
                <input
                  id="pr-date"
                  type="date"
                  value={form.payrollDate}
                  onChange={(e) => setForm((f) => ({ ...f, payrollDate: e.target.value }))}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="pr-cutoff">Cut-off Period</label>
                <input id="pr-cutoff" type="text" value={formatDate(form.payrollDate)} disabled readOnly className="form-input" />
              </div>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-section" style={{ marginBottom: 0 }}>
              <div className="form-section__title">
                B. EARNINGS <span className="form-hint">(input manually)</span>
              </div>
              <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
                {EARNINGS.map((e) => (
                  <div key={e.key} className="toolbar" style={{ justifyContent: 'space-between' }}>
                    <span className={e.negative ? 'muted' : ''} style={e.negative ? { color: 'var(--danger)' } : undefined}>{e.label}</span>
                    <input
                      type="number"
                      min="0"
                      value={form.earnings[e.key]}
                      onChange={(ev) => setEarn(e.key, ev.target.value)}
                      placeholder="0.00"
                      className="form-input"
                      style={{ width: 130, textAlign: 'right' }}
                    />
                  </div>
                ))}
              </div>
              <div className="divider" />
              <div className="toolbar" style={{ justifyContent: 'space-between' }}>
                <strong>TOTAL EARNINGS</strong>
                <strong style={{ color: 'var(--success)' }}>{formatPeso(totals.earnings)}</strong>
              </div>
            </div>

            <div className="form-section" style={{ marginBottom: 0 }}>
              <div className="form-section__title">
                C. DEDUCTIONS <span className="form-hint">(input manually)</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px 14px', marginTop: 14 }}>
                {DEDUCTIONS.map((d) => (
                  <div key={d.key} className="toolbar" style={{ justifyContent: 'space-between' }}>
                    <span className="cell-sub">{d.label}</span>
                    <input
                      type="number"
                      min="0"
                      value={form.deductions[d.key]}
                      onChange={(ev) => setDeduc(d.key, ev.target.value)}
                      placeholder="0.00"
                      className="form-input"
                      style={{ width: 90, textAlign: 'right' }}
                    />
                  </div>
                ))}
              </div>
              <div className="divider" />
              <div className="toolbar" style={{ justifyContent: 'space-between' }}>
                <strong>TOTAL DEDUCTIONS</strong>
                <strong style={{ color: 'var(--danger)' }}>{formatPeso(totals.deductions)}</strong>
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="toolbar" style={{ justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: 4 }}>
              <div className="form-section__title">
                D. TRIP BREAKDOWN <span className="form-hint">(from trip logs{selectedDriverId ? ` · ${drivers.find((d) => d.id === selectedDriverId)?.name || ''}` : ' · select a driver above'})</span>
              </div>
              <button onClick={handleExportTrips} className="btn btn--secondary btn--sm">
                <Download size={14} /> Export Trips
              </button>
            </div>
            <div className="table-wrap" style={{ marginTop: 14 }}>
              {trips.length === 0 ? (
                <div className="empty-state">
                  <FileText size={32} />
                  <div className="empty-state__title">No trip logs found</div>
                  <div className="empty-state__sub">{selectedDriverId ? 'No trips recorded for this driver yet.' : 'Select a driver in the header to preview their trip logs.'}</div>
                </div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      {TRIP_HEADERS.map((h) => (
                        <th key={h} className="nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {trips.slice(0, 20).map((t, i) => (
                      <tr key={t.id}>
                        <td style={{ textAlign: 'center' }}>{i + 1}</td>
                        <td className="nowrap">{formatDate(t.date)}</td>
                        <td className="nowrap">{t.tripCode || t.plateNumber || '-'}</td>
                        <td>{t.driverName}</td>
                        <td className="nowrap">{t.startTime}</td>
                        <td className="nowrap">{t.endTime}</td>
                        <td style={{ textAlign: 'right' }}>{t.hours ?? '-'}</td>
                        <td style={{ textAlign: 'right' }}>{t.distance ?? '-'}</td>
                        <td className="cell-muted">{t.startLocation || '-'}</td>
                        <td className="cell-muted">{t.endLocation || '-'}</td>
                        <td style={{ textAlign: 'right' }}>{formatPeso(t.expenses)}</td>
                        <td className="cell-muted">{t.remarks || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <p className="form-hint" style={{ marginTop: 10 }}>
              Trip logs shown here are pulled live from the driver trip logs table for the selected driver.
            </p>
          </div>

          <div className="toolbar" style={{ justifyContent: 'flex-end', paddingTop: 18 }}>
            <button onClick={() => setForm(emptyForm)} className="btn btn--secondary">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="btn btn--primary">
              <Save size={16} /> {saving ? 'Saving...' : 'Save Record'}
            </button>
            <button onClick={handleExportTrips} className="btn btn--secondary">
              <Download size={16} /> Export Trip Logs
            </button>
          </div>
          <p className="form-hint">
            Status flow: For Review (pending) → Completed (paid). Unpaid marks the record as unsettled.
          </p>
        </div>
      </div>
    </div>
  )
}