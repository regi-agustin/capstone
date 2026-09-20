import { useEffect, useState } from 'react'
import {
  Eye,
  Pencil,
  Send,
  CheckCircle2,
  RotateCcw,
  XCircle,
  Trash2,
  Wallet,
  Plus,
  Download,
  FileText,
  Building2,
} from 'lucide-react'
import {
  fetchPayrollRecords,
  fetchPayrollPreview,
  submitPayroll,
  approvePayroll,
  returnPayroll,
  cancelPayroll,
  deletePayrollRecord,
  recordPayrollPayment,
  statusLabel,
  formatDate,
  formatPeso,
  fetchCompanySettings,
  saveCompanySettings,
} from '../services/payrollService.js'
import SearchBar from '../../ro/components/SearchBar.jsx'
import StatusBadge from '../../ro/components/StatusBadge.jsx'
import Pagination from '../../ro/components/Pagination.jsx'
import Modal from '../../ro/components/Modal.jsx'
import PayrollWizard from '../components/PayrollWizard.jsx'
import PayslipModal from '../components/PayslipModal.jsx'
import { downloadCsv } from '../../ro/utils/csv.js'

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'for_review', label: 'For Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'paid', label: 'Paid' },
  { key: 'cancelled', label: 'Cancelled' },
]

const PAGE_SIZE = 20

export default function PayrollManagement() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [msg, setMsg] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(0)
  const [wizard, setWizard] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [payment, setPayment] = useState(null)
  const [returning, setReturning] = useState(null)
  const [companyOpen, setCompanyOpen] = useState(false)

  const load = () =>
    fetchPayrollRecords()
      .then(setRecords)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))

  useEffect(() => {
    load()
  }, [])

  const showMsg = (text, ok = true) => {
    setMsg({ text, ok })
    setTimeout(() => setMsg(null), 4000)
  }

  async function openView(id) {
    setBusy(id)
    try {
      const d = await fetchPayrollPreview(id)
      setViewing(d)
    } catch (e) {
      showMsg(e.message, false)
    } finally {
      setBusy(0)
    }
  }

  async function openEdit(id) {
    setBusy(id)
    try {
      const d = await fetchPayrollPreview(id)
      setWizard({ initial: d })
    } catch (e) {
      showMsg(e.message, false)
    } finally {
      setBusy(0)
    }
  }

  async function openPayment(id) {
    setBusy(id)
    try {
      const d = await fetchPayrollPreview(id)
      setPayment(d)
    } catch (e) {
      showMsg(e.message, false)
    } finally {
      setBusy(0)
    }
  }

  async function openReturn(id) {
    setBusy(id)
    try {
      const d = await fetchPayrollPreview(id)
      setReturning(d)
    } catch (e) {
      showMsg(e.message, false)
    } finally {
      setBusy(0)
    }
  }

  async function act(id, fn, ok) {
    setBusy(id)
    try {
      await fn()
      showMsg(ok)
      await load()
    } catch (e) {
      showMsg(e.message, false)
    } finally {
      setBusy(0)
    }
  }

  const doSubmit = (id) => {
    if (!window.confirm(`Submit payroll #${id} for approval?\nOnce submitted, the record can no longer be edited.`)) return
    act(id, () => submitPayroll(id), `Payroll #${id} submitted for approval.`)
  }

  const doApprove = (id) => {
    if (!window.confirm(`Approve payroll #${id}?`)) return
    act(id, () => approvePayroll(id), `Payroll #${id} approved.`)
  }

  const doCancel = (id) => {
    if (!window.confirm(`Cancel payroll #${id}?\nThe record will be kept as cancelled.`)) return
    act(id, () => cancelPayroll(id), `Payroll #${id} cancelled.`)
  }

  const doDelete = (id) => {
    if (!window.confirm(`Delete payroll #${id} permanently?`)) return
    act(id, () => deletePayrollRecord(id), `Payroll #${id} deleted.`)
  }

  const counts = { all: records.length }
  for (const t of TABS) counts[t.key] = t.key === 'all' ? records.length : records.filter((r) => r.status === t.key).length

  const q = search.trim().toLowerCase()
  let filtered = records.filter((r) => (tab === 'all' ? true : r.status === tab))
  if (q) {
    filtered = filtered.filter(
      (r) =>
        String(r.driverName || '').toLowerCase().includes(q) ||
        String(r.plateNumber || '').toLowerCase().includes(q) ||
        String(r.id).includes(q)
    )
  }

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const pageData = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function handleExport() {
    if (filtered.length === 0) return
    downloadCsv(
      'payroll-records.csv',
      ['ID', 'Driver', 'Plate Number', 'Car Code', 'Cut-Off Start', 'Cut-Off End', 'Payroll Date', 'Trips', 'Total Earnings', 'Total Deductions', 'Net', 'Status'],
      filtered.map((r) => [
        r.id, r.driverName, r.plateNumber || '', r.carCode || '',
        r.cutoffStart, r.cutoffEnd, r.payrollDate,
        r.tripCount, r.totalEarnings, r.totalDeductions, r.totalReceivable, statusLabel(r.status),
      ])
    )
  }

  function renderActions(r) {
    const btns = []
    btns.push({
      key: 'view',
      title: 'View payslip',
      icon: <Eye size={15} />,
      onClick: () => openView(r.id),
      danger: false,
    })
    if (r.status === 'draft') {
      btns.push(
        { key: 'edit', title: 'Edit draft', icon: <Pencil size={15} />, onClick: () => openEdit(r.id) },
        { key: 'submit', title: 'Submit for approval', icon: <Send size={15} />, onClick: () => doSubmit(r.id) },
        { key: 'cancel', title: 'Cancel', icon: <XCircle size={15} />, onClick: () => doCancel(r.id), danger: true },
        { key: 'del', title: 'Delete', icon: <Trash2 size={15} />, onClick: () => doDelete(r.id), danger: true }
      )
    } else if (r.status === 'for_review') {
      btns.push(
        { key: 'approve', title: 'Approve', icon: <CheckCircle2 size={15} />, onClick: () => doApprove(r.id) },
        { key: 'return', title: 'Return for correction', icon: <RotateCcw size={15} />, onClick: () => openReturn(r.id) },
        { key: 'cancel', title: 'Cancel', icon: <XCircle size={15} />, onClick: () => doCancel(r.id), danger: true }
      )
    } else if (r.status === 'approved') {
      btns.push({
        key: 'pay',
        title: 'Record payment',
        icon: <Wallet size={15} />,
        onClick: () => openPayment(r.id),
      })
    } else if (r.status === 'cancelled') {
      btns.push({ key: 'del', title: 'Delete', icon: <Trash2 size={15} />, onClick: () => doDelete(r.id), danger: true })
    }
    return (
      <div className="actions-row" style={{ justifyContent: 'center', gap: 6 }}>
        {btns.map((b) => (
          <button
            key={b.key}
            type="button"
            className="btn btn--icon btn--sm"
            title={b.title}
            disabled={busy === r.id}
            onClick={b.onClick}
            style={b.danger ? { color: 'var(--danger)' } : undefined}
          >
            {b.icon}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Payroll Processing</h1>
          <p className="page-head__sub">Draft → For Review → Approved → Paid. Encode with a cut-off period and driver, then submit.</p>
        </div>
      </div>

      {msg && <div className={msg.ok ? 'success-banner' : 'error-banner'} style={{ marginBottom: 16 }}>{msg.text}</div>}
      {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}

      <section className="card">
        <div className="card__header">
          <div>
            <div className="card__title">
              Payroll Records
              <span className="badge badge--neutral">{counts.all}</span>
            </div>
            <div className="card__sub">Process a payroll record through review, approval and payment</div>
          </div>
          <div className="toolbar">
            <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search driver, plate, ID…" />
            <button onClick={handleExport} className="btn btn--secondary btn--sm">
              <Download size={14} /> Export
            </button>
            <button onClick={() => setCompanyOpen(true)} className="btn btn--secondary btn--sm">
              <Building2 size={14} /> Company
            </button>
            <button onClick={() => setWizard({ initial: null })} className="btn btn--primary btn--sm">
              <Plus size={14} /> Create Payroll
            </button>
          </div>
        </div>

        <div className="card__body">
          <div className="toolbar" style={{ gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`btn btn--sm ${tab === t.key ? 'btn--primary' : 'btn--neutral'}`}
                onClick={() => { setTab(t.key); setPage(1) }}
              >
                {t.label} <span className="badge badge--neutral">{counts[t.key]}</span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="loading-state"><div className="spinner"></div></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <FileText size={36} />
              <div className="empty-state__title">No payroll records found.</div>
              <div className="empty-state__sub">Click “Create Payroll” to build a record from a cut-off period and driver trips.</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Driver</th>
                    <th>Plate</th>
                    <th>Car Code</th>
                    <th>Cut-Off</th>
                    <th>Payroll Date</th>
                    <th style={{ textAlign: 'right' }}>Trips</th>
                    <th style={{ textAlign: 'right' }}>Net</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((r, idx) => (
                    <tr key={r.id}>
                      <td className="cell-muted">{(safePage - 1) * PAGE_SIZE + idx + 1}</td>
                      <td className="cell-main">{r.driverName}</td>
                      <td className="nowrap">{r.plateNumber || '-'}</td>
                      <td className="nowrap">{r.carCode || '-'}</td>
                      <td className="nowrap">{formatDate(r.cutoffStart)} – {formatDate(r.cutoffEnd)}</td>
                      <td className="nowrap">{formatDate(r.payrollDate)}</td>
                      <td className="nowrap" style={{ textAlign: 'right' }}>{r.tripCount ?? 0}</td>
                      <td className="cell-main nowrap" style={{ textAlign: 'right' }}>{formatPeso(r.totalReceivable || r.netAmount)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <StatusBadge status={statusLabel(r.status)} />
                      </td>
                      <td>{renderActions(r)}</td>
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

      {wizard && (
        <PayrollWizard
          initial={wizard.initial}
          onClose={() => setWizard(null)}
          onSaved={(text) => {
            setWizard(null)
            showMsg(text)
            load()
          }}
        />
      )}
      {viewing && (
        <PayslipModal
          detail={viewing}
          onClose={() => setViewing(null)}
          onEditDraft={(d) => {
            setViewing(null)
            setWizard({ initial: d })
          }}
        />
      )}
      {payment && (
        <PaymentModal
          detail={payment}
          onClose={() => setPayment(null)}
          onPaid={(text) => {
            setPayment(null)
            showMsg(text)
            load()
          }}
        />
      )}
      {returning && (
        <ReturnModal
          detail={returning}
          onClose={() => setReturning(null)}
          onReturned={(text) => {
            setReturning(null)
            showMsg(text)
            load()
          }}
        />
      )}
      {companyOpen && (
        <CompanySettingsModal
          onClose={() => setCompanyOpen(false)}
          onSaved={(text) => {
            setCompanyOpen(false)
            showMsg(text)
          }}
        />
      )}
    </div>
  )
}

function PaymentModal({ detail, onClose, onPaid }) {
  const [method, setMethod] = useState('Cash')
  const [amount, setAmount] = useState(detail ? detail.totalReceivable || 0 : 0)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [ref, setRef] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    if (!method) return setErr('Select a payment method.')
    setSaving(true)
    setErr('')
    try {
      await recordPayrollPayment(detail.id, {
        paymentMethod: method,
        amountPaid: amount === '' || amount === null ? null : Number(amount),
        datePaid: date,
        referenceNumber: ref,
      })
      onPaid(`Payroll #${detail.id} marked as paid (${method}).`)
    } catch (e) {
      setErr(e.message)
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Record Payment — Payroll #${detail.id}`}
      subtitle={`${detail.driverName} · Net receivable ${formatPeso(detail.totalReceivable)}`}
      footer={
        <>
          <button type="button" className="btn btn--neutral" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn--primary" disabled={saving} onClick={save}>
            <Wallet size={15} /> {saving ? 'Saving…' : 'Mark as Paid'}
          </button>
        </>
      }
    >
      {err && <div className="error-banner" style={{ marginBottom: 12 }}>{err}</div>}
      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Payment Method <span className="req">*</span></label>
          <select className="form-select" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="Cash">Cash</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="GCash">GCash</option>
            <option value="Check">Check</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Amount Paid</label>
          <input type="number" min="0" step="0.01" className="form-input" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Date Paid</label>
          <input type="date" className="form-input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Reference Number</label>
          <input type="text" className="form-input" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. GCash / bank reference" />
        </div>
      </div>
      <p className="form-hint" style={{ marginTop: 10 }}>
        Marking this payroll as paid finalizes it. The payslip will show the payment details.
      </p>
    </Modal>
  )
}

function CompanySettingsModal({ onClose, onSaved }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    fetchCompanySettings()
      .then((s) => setName((s && s.companyName) || ''))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    if (!name.trim()) return setErr('Company name is required.')
    setSaving(true)
    setErr('')
    try {
      await saveCompanySettings(name.trim())
      onSaved('Company name updated.')
    } catch (e) {
      setErr(e.message)
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Company Settings"
      subtitle="Printed at the top of every payslip"
      footer={
        <>
          <button type="button" className="btn btn--neutral" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn--primary" disabled={saving || loading} onClick={save}>
            <Building2 size={15} /> {saving ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      {err && <div className="error-banner" style={{ marginBottom: 12 }}>{err}</div>}
      <div className="form-group">
        <label className="form-label">Company Name <span className="req">*</span></label>
        <input
          type="text"
          className="form-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. HOLY TRANSPORT SERVICES OPC"
          disabled={loading}
        />
        <p className="form-hint">Shown on the payslip header and applies to every payslip.</p>
      </div>
    </Modal>
  )
}

function ReturnModal({ detail, onClose, onReturned }) {
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    setSaving(true)
    setErr('')
    try {
      await returnPayroll(detail.id, notes)
      onReturned(`Payroll #${detail.id} returned for correction.`)
    } catch (e) {
      setErr(e.message)
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Return for Correction — Payroll #${detail.id}`}
      subtitle={`${detail.driverName} · will go back to Draft`}
      footer={
        <>
          <button type="button" className="btn btn--neutral" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn--primary" disabled={saving} onClick={save}>
            <RotateCcw size={15} /> {saving ? 'Saving…' : 'Return to Draft'}
          </button>
        </>
      }
    >
      {err && <div className="error-banner" style={{ marginBottom: 12 }}>{err}</div>}
      <div className="form-group">
        <label className="form-label">Reason for return <span className="req">*</span></label>
        <textarea
          className="form-input"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Missing toll on July 9, verify overtime rate…"
        />
        <p className="form-hint">The reason is saved to the payroll as remarks and follows it back to draft.</p>
      </div>
    </Modal>
  )
}