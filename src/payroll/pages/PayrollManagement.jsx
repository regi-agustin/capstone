import { useEffect, useMemo, useState } from 'react'
import { Download, Plus, Trash2, ChevronLeft, ChevronRight, FileText, CheckCircle, Save } from 'lucide-react'
import {
  fetchPayrollRecords,
  fetchDrivers,
  createPayrollRecord,
  updatePayrollStatus,
  deletePayrollRecord,
  statusLabel,
  formatDate,
  formatPeso,
} from '../services/payrollService.js'
import SearchBar from '../../ro/components/SearchBar.jsx'
import StatusBadge from '../../ro/components/StatusBadge.jsx'

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

const TRIPS = [
  { n: 1, date: 'Aug 01, 2026', code: 'CAR-001', rate: '1,800.00', req: '8:00 AM', out: '5:30 PM', hrs: '9.50', km: '20', gas: '200.00', night: '0.00', otH: '1.50', otR: '150.00', dime: '100.00', hazard: '100.00', toll: '60.00', parking: '50.00', adv: '1,000.00', total: '3,460.00' },
  { n: 2, date: 'Aug 02, 2026', code: 'CAR-014', rate: '1,800.00', req: '8:30 AM', out: '6:00 PM', hrs: '9.50', km: '30', gas: '240.00', night: '0.00', otH: '2.00', otR: '150.00', dime: '100.00', hazard: '100.00', toll: '80.00', parking: '60.00', adv: '1,000.00', total: '3,680.00' },
  { n: 3, date: 'Aug 03, 2026', code: 'CAR-014', rate: '1,800.00', req: '7:00 PM', out: '7:00 AM', hrs: '12.00', km: '40', gas: '300.00', night: '800.00', otH: '2.50', otR: '150.00', dime: '100.00', hazard: '100.00', toll: '100.00', parking: '70.00', adv: '1,000.00', total: '4,720.00' },
]

const emptyForm = {
  driverId: '',
  payrollDate: new Date().toISOString().slice(0, 10),
  earnings: Object.fromEntries(EARNINGS.map((e) => [e.key, ''])),
  deductions: Object.fromEntries(DEDUCTIONS.map((d) => [d.key, ''])),
}

export default function PayrollManagement() {
  const [records, setRecords] = useState([])
  const [drivers, setDrivers] = useState([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [msg, setMsg] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(0)

  const load = () =>
    Promise.all([fetchPayrollRecords(), fetchDrivers()])
      .then(([p, d]) => {
        setRecords(p)
        setDrivers(d)
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
            <SearchBar value={search} onChange={setSearch} placeholder="Search driver..." />
            <button className="btn btn--secondary btn--sm" title="Export to Excel (upcoming)">
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
                  {filtered.map((r, idx) => (
                    <tr key={r.id}>
                      <td className="cell-muted">{idx + 1}</td>
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
          <div className="toolbar" style={{ justifyContent: 'space-between', marginTop: 16 }}>
            <span className="cell-sub">Showing {filtered.length} of {records.length} records</span>
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
            <div className="form-section__title">
              D. TRIP BREAKDOWN <span className="form-hint">(sample trip records for reference)</span>
            </div>
            <div className="table-wrap" style={{ marginTop: 14 }}>
              <table className="table">
                <thead>
                  <tr>
                    {['#', 'Date', 'Car Code', 'Rental Rate (₱)', 'Requested Time', 'Time Out', 'Work Hours', 'Excess KM', 'Excess Gas (₱)', 'Overnight Rate (₱)', 'OT Hrs', 'OT Rate (₱)', 'Dime (₱)', 'Hazard (₱)', 'Toll (₱)', 'Parking (₱)', 'Advance (₱)', 'Total Amount (₱)'].map((h) => (
                      <th key={h} className="nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TRIPS.map((t) => (
                    <tr key={t.n}>
                      <td style={{ textAlign: 'center' }}>{t.n}</td>
                      <td className="nowrap">{t.date}</td>
                      <td>{t.code}</td>
                      <td style={{ textAlign: 'right' }}>{t.rate}</td>
                      <td className="nowrap">{t.req}</td>
                      <td className="nowrap">{t.out}</td>
                      <td style={{ textAlign: 'right' }}>{t.hrs}</td>
                      <td style={{ textAlign: 'right' }}>{t.km}</td>
                      <td style={{ textAlign: 'right' }}>{t.gas}</td>
                      <td style={{ textAlign: 'right' }}>{t.night}</td>
                      <td style={{ textAlign: 'right' }}>{t.otH}</td>
                      <td style={{ textAlign: 'right' }}>{t.otR}</td>
                      <td style={{ textAlign: 'right' }}>{t.dime}</td>
                      <td style={{ textAlign: 'right' }}>{t.hazard}</td>
                      <td style={{ textAlign: 'right' }}>{t.toll}</td>
                      <td style={{ textAlign: 'right' }}>{t.parking}</td>
                      <td style={{ textAlign: 'right' }}>{t.adv}</td>
                      <td className="cell-main" style={{ textAlign: 'right' }}>{t.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="form-hint" style={{ marginTop: 10 }}>
              Trip breakdown is currently a reference table. Live trip import is part of the upcoming payroll integration.
            </p>
          </div>

          <div className="toolbar" style={{ justifyContent: 'flex-end', paddingTop: 18 }}>
            <button onClick={() => setForm(emptyForm)} className="btn btn--secondary">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="btn btn--primary">
              <Save size={16} /> {saving ? 'Saving...' : 'Save Record'}
            </button>
            <button className="btn btn--secondary">
              <Download size={16} /> Print / Export
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