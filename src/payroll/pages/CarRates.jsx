import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Pencil,
  History,
  Car,
  AlertTriangle,
  UserCog,
  Save,
} from 'lucide-react'
import {
  fetchCarRates,
  fetchCarRateHistory,
  fetchCarAssignments,
  fetchAssignableDrivers,
  saveCarRate,
  saveCarAssignment,
  formatDate,
  formatPeso,
} from '../services/payrollService.js'
import SearchBar from '../../ro/components/SearchBar.jsx'
import StatusBadge from '../../ro/components/StatusBadge.jsx'
import Pagination from '../../ro/components/Pagination.jsx'
import Modal from '../../ro/components/Modal.jsx'
import { downloadCsv } from '../../ro/utils/csv.js'

const PAGE_SIZE = 8
const today = () => new Date().toISOString().slice(0, 10)

function rateText(rate) {
  if (rate === null || rate === undefined || rate === '') return '—'
  return formatPeso(rate)
}

export default function CarRates() {
  const [rows, setRows] = useState([])
  const [drivers, setDrivers] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

  // rate editor
  const [rateFor, setRateFor] = useState(null)
  const [rateForm, setRateForm] = useState({ dailyRate: '', effectiveFrom: today() })
  const [rateError, setRateError] = useState('')
  const [savingRate, setSavingRate] = useState(false)

  // driver editor
  const [assignFor, setAssignFor] = useState(null)
  const [assignForm, setAssignForm] = useState({ driverId: '', effectiveFrom: today() })
  const [assignError, setAssignError] = useState('')
  const [savingAssign, setSavingAssign] = useState(false)

  // history
  const [historyFor, setHistoryFor] = useState(null)
  const [history, setHistory] = useState(null)
  const [historyLoading, setHistoryLoading] = useState(false)

  const load = useCallback(async (q = '') => {
    try {
      const [list, drv] = await Promise.all([fetchCarRates(q), fetchAssignableDrivers()])
      setRows(list)
      setDrivers(drv)
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Search is server-side so it also matches the computed car code.
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1)
      load(search)
    }, 250)
    return () => clearTimeout(t)
  }, [search, load])

  const filtered = useMemo(
    () => (statusFilter === 'All' ? rows : rows.filter((r) => (statusFilter === 'Active' ? !r.inactive : r.inactive))),
    [rows, statusFilter]
  )

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE)
  const safePage = Math.min(page, Math.max(1, pageCount))
  const pageData = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const summary = useMemo(() => {
    const active = rows.filter((r) => !r.inactive)
    const withDriver = active.filter((r) => r.assignedDriver)
    const withRate = active.filter((r) => r.dailyRate > 0)
    return {
      total: active.length,
      withDriver: withDriver.length,
      unassigned: active.length - withDriver.length,
      missingRate: active.length - withRate.length,
    }
  }, [rows])

  function flash(text) {
    setMsg(text)
    setTimeout(() => setMsg(''), 4000)
  }

  function openRate(row) {
    setRateError('')
    setRateFor(row)
    setRateForm({ dailyRate: String(row.dailyRate ?? ''), effectiveFrom: today() })
  }

  function openAssign(row) {
    setAssignError('')
    setAssignFor(row)
    setAssignForm({
      driverId: row.assignedDriverId ? String(row.assignedDriverId) : '',
      effectiveFrom: today(),
    })
  }

  async function handleSaveRate(e) {
    e.preventDefault()
    setRateError('')
    const value = Number(rateForm.dailyRate)
    if (!rateForm.dailyRate.trim() || Number.isNaN(value)) {
      setRateError('Enter a valid daily rate.')
      return
    }
    if (value <= 0) {
      setRateError('Daily rate must be greater than zero.')
      return
    }
    if (!rateForm.effectiveFrom) {
      setRateError('Choose the date this rate takes effect.')
      return
    }
    setSavingRate(true)
    try {
      const res = await saveCarRate({
        vehicleId: rateFor.vehicleId,
        dailyRate: value,
        effectiveFrom: rateForm.effectiveFrom,
      })
      setRateFor(null)
      await load(search)
      flash(`Daily rate for ${rateFor.carCode} set to ${formatPeso(res.dailyRate)} effective ${formatDate(res.effectiveFrom)}.`)
    } catch (err) {
      setRateError(err.message)
    } finally {
      setSavingRate(false)
    }
  }

  async function handleSaveAssign(e) {
    e.preventDefault()
    setAssignError('')
    if (!assignForm.driverId) {
      setAssignError('Choose a driver to assign to this car.')
      return
    }
    if (!assignForm.effectiveFrom) {
      setAssignError('Choose the date this assignment takes effect.')
      return
    }
    setSavingAssign(true)
    try {
      const res = await saveCarAssignment({
        vehicleId: assignFor.vehicleId,
        driverId: Number(assignForm.driverId),
        effectiveFrom: assignForm.effectiveFrom,
      })
      setAssignFor(null)
      await load(search)
      flash(`${res.driverName} assigned to ${assignFor.carCode} effective ${formatDate(res.effectiveFrom)}.`)
    } catch (err) {
      setAssignError(err.message)
    } finally {
      setSavingAssign(false)
    }
  }

  async function openHistory(row) {
    setHistoryFor(row)
    setHistory(null)
    setHistoryLoading(true)
    try {
      const [rates, assigns] = await Promise.all([
        fetchCarRateHistory(row.vehicleId),
        fetchCarAssignments(row.vehicleId),
      ])
      setHistory({ rates, assigns })
    } catch (e) {
      setError(e.message)
    } finally {
      setHistoryLoading(false)
    }
  }

  function handleExport() {
    if (filtered.length === 0) return
    downloadCsv(
      'current-car-rates.csv',
      ['Car Code', 'Vehicle Type', 'Model', 'Plate Number', 'Daily Rate', 'Assigned Driver', 'Car Owner', 'Status'],
      filtered.map((r) => [
        r.carCode, r.vehicleType, r.model, r.plateNumber, r.dailyRate,
        r.assignedDriver || 'Unassigned', r.carOwner || (r.companyOwned ? 'Company Owned' : ''), r.statusLabel,
      ])
    )
  }

  if (error && rows.length === 0) {
    return <div className="error-banner">{error}</div>
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Current Car Rates</h1>
          <p className="page-head__sub">
            Manage the daily rate and assigned driver for each car code used in payroll.
          </p>
        </div>
      </div>

      {msg && <div className="success-banner" style={{ marginBottom: 16 }}>{msg}</div>}

      <div className="toolbar" style={{ marginBottom: 18 }}>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search car code, driver, plate..."
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="form-select"
          style={{ width: 160 }}
          aria-label="Filter by vehicle status"
        >
          <option>All</option>
          <option>Active</option>
          <option>Inactive</option>
        </select>
        <button onClick={handleExport} className="btn btn--secondary btn--sm" style={{ marginLeft: 'auto' }}>
          Export
        </button>
      </div>

      {summary.missingRate > 0 && (
        <div
          className="error-banner"
          style={{
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--warning-soft)',
            color: 'var(--warning)',
            borderColor: 'var(--warning)',
          }}
        >
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />{' '}
          {summary.missingRate} active car{summary.missingRate === 1 ? ' has' : 's have'} no daily rate set.
          Payroll will show ₱0.00{summary.missingRate === 1 ? ' for that car' : ' for those cars'} until a
          rate is entered.
        </div>
      )}

      <section className="card">
        <div className="card__header">
          <div>
            <div className="card__title">
              Car Rate List
              <span className="badge badge--neutral">{filtered.length}</span>
            </div>
            <div className="card__sub">
              {summary.total} active car{summary.total === 1 ? '' : 's'} &middot;{' '}
              {summary.withDriver} assigned &middot; {summary.unassigned} unassigned
            </div>
          </div>
        </div>
        <div className="card__body">
          {loading ? (
            <div className="empty-state">
              <div className="empty-state__title">Loading car rates...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__title">No cars found.</div>
              <div className="empty-state__sub">Try adjusting your search or filter.</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Car Code</th>
                    <th>Vehicle Type</th>
                    <th>Daily Rate</th>
                    <th>Assigned Driver</th>
                    <th>Plate Number</th>
                    <th>Car Owner</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((r) => (
                    <tr key={r.vehicleId}>
                      <td className="cell-main">
                        {r.carCode}
                        {r.hasHistory && (
                          <span className="cell-sub" style={{ display: 'block' }}>
                            since {formatDate(r.rateFrom)}
                          </span>
                        )}
                      </td>
                      <td>
                        {r.vehicleType}
                        <span className="cell-sub" style={{ display: 'block' }}>{r.model}</span>
                      </td>
                      <td className="cell-main">{rateText(r.dailyRate)}</td>
                      <td>
                        {r.assignedDriver || <span className="cell-muted">Unassigned</span>}
                        {r.assignedFrom && (
                          <span className="cell-sub" style={{ display: 'block' }}>
                            since {formatDate(r.assignedFrom)}
                          </span>
                        )}
                      </td>
                      <td>{r.plateNumber}</td>
                      <td>
                        {r.carOwner || <span className="cell-muted">Company Owned</span>}
                      </td>
                      <td>
                        <StatusBadge status={r.statusLabel} />
                      </td>
                      <td>
                        <div className="actions-row" style={{ justifyContent: 'center' }}>
                          <button
                            onClick={() => openRate(r)}
                            className="btn btn--icon"
                            title="Change daily rate"
                            aria-label={`Change daily rate for ${r.carCode}`}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => openAssign(r)}
                            className="btn btn--icon"
                            title="Change assigned driver"
                            aria-label={`Change assigned driver for ${r.carCode}`}
                          >
                            <UserCog size={16} />
                          </button>
                          <button
                            onClick={() => openHistory(r)}
                            className="btn btn--icon"
                            title="View rate history"
                            aria-label={`View rate history for ${r.carCode}`}
                          >
                            <History size={16} />
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
            label={`Showing ${pageData.length} of ${filtered.length} cars`}
          />
        </div>
      </section>

      {/* ---- Change daily rate ------------------------------------------- */}
      <Modal
        open={!!rateFor}
        onClose={() => setRateFor(null)}
        title="Change Daily Rate"
        subtitle={rateFor ? `${rateFor.carCode} · ${rateFor.plateNumber}` : ''}
        footer={
          <>
            <button type="button" className="btn btn--secondary" onClick={() => setRateFor(null)}>
              Cancel
            </button>
            <button type="submit" form="car-rate-form" className="btn btn--primary" disabled={savingRate}>
              <Save size={16} /> {savingRate ? 'Saving...' : 'Save Rate'}
            </button>
          </>
        }
      >
        {rateFor && (
          <form id="car-rate-form" onSubmit={handleSaveRate} style={{ display: 'grid', gap: 14 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="cr-current">Current Daily Rate</label>
              <div className="form-input" style={{ background: 'var(--surface-2, #f6f7f9)' }}>
                {rateText(rateFor.dailyRate)}
              </div>
              <span className="form-hint">
                {rateFor.rateCount > 1
                  ? `${rateFor.rateCount} rates on record for this car.`
                  : 'No rate changes recorded yet.'}
              </span>
              {rateFor.rateCount > 1 && rateFor.dailyRate !== rateFor.stagedRate && (
                <p className="form-hint" style={{ marginTop: 6 }}>
                  A rate of {formatPeso(rateFor.stagedRate)} is already scheduled for{' '}
                  {formatDate(rateFor.stagedFrom)}. Saving here will replace that schedule.
                </p>
              )}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="cr-rate">New Daily Rate <span className="req">*</span></label>
              <input
                id="cr-rate"
                className="form-input"
                type="number"
                step="0.01"
                min="0.01"
                inputMode="decimal"
                placeholder="e.g. 2500.00"
                value={rateForm.dailyRate}
                onChange={(e) => setRateForm({ ...rateForm, dailyRate: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="cr-from">Effective From <span className="req">*</span></label>
              <input
                id="cr-from"
                className="form-input"
                type="date"
                value={rateForm.effectiveFrom}
                onChange={(e) => setRateForm({ ...rateForm, effectiveFrom: e.target.value })}
              />
              <span className="form-hint">
                Past payrolls keep the rate that applied on each day they were computed. This change only
                affects periods on or after the effective date.
              </span>
            </div>
            {rateError && <div className="error-banner">{rateError}</div>}
          </form>
        )}
      </Modal>

      {/* ---- Change assigned driver -------------------------------------- */}
      <Modal
        open={!!assignFor}
        onClose={() => setAssignFor(null)}
        title="Change Assigned Driver"
        subtitle={assignFor ? `${assignFor.carCode} · ${assignFor.plateNumber}` : ''}
        footer={
          <>
            <button type="button" className="btn btn--secondary" onClick={() => setAssignFor(null)}>
              Cancel
            </button>
            <button type="submit" form="car-assign-form" className="btn btn--primary" disabled={savingAssign}>
              <UserCog size={16} /> {savingAssign ? 'Saving...' : 'Save Assignment'}
            </button>
          </>
        }
      >
        {assignFor && (
          <form id="car-assign-form" onSubmit={handleSaveAssign} style={{ display: 'grid', gap: 14 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="ca-current">Currently Assigned</label>
              <div className="form-input" style={{ background: 'var(--surface-2, #f6f7f9)' }}>
                {assignFor.assignedDriver || 'Unassigned'}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="ca-driver">Driver <span className="req">*</span></label>
              <select
                id="ca-driver"
                className="form-select"
                value={assignForm.driverId}
                onChange={(e) => setAssignForm({ ...assignForm, driverId: e.target.value })}
              >
                <option value="">Select a driver...</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.contact ? `(${d.contact})` : ''}
                  </option>
                ))}
              </select>
              <span className="form-hint">Only active drivers are listed.</span>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="ca-from">Effective From <span className="req">*</span></label>
              <input
                id="ca-from"
                className="form-input"
                type="date"
                value={assignForm.effectiveFrom}
                onChange={(e) => setAssignForm({ ...assignForm, effectiveFrom: e.target.value })}
              />
            </div>
            {assignError && <div className="error-banner">{assignError}</div>}
          </form>
        )}
      </Modal>

      {/* ---- Rate + assignment history ----------------------------------- */}
      <Modal
        open={!!historyFor}
        onClose={() => setHistoryFor(null)}
        title="Rate & Assignment History"
        subtitle={historyFor ? `${historyFor.carCode} · ${historyFor.plateNumber}` : ''}
        footer={
          <button type="button" className="btn btn--secondary" onClick={() => setHistoryFor(null)}>
            Close
          </button>
        }
      >
        {historyLoading ? (
          <div className="empty-state">
            <div className="empty-state__title">Loading history...</div>
          </div>
        ) : history ? (
          <div style={{ display: 'grid', gap: 20 }}>
            <div>
              <div className="card__title" style={{ marginBottom: 10 }}>
                <Car size={16} /> Daily Rate History
              </div>
              {history.rates.length === 0 ? (
                <p className="cell-muted">No rate on record for this car.</p>
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Daily Rate</th>
                        <th>Effective From</th>
                        <th>Effective To</th>
                        <th>Updated By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.rates.map((h) => (
                        <tr key={h.rateId}>
                          <td className="cell-main">{formatPeso(h.dailyRate)}</td>
                          <td>{formatDate(h.effectiveFrom)}</td>
                          <td>{h.isCurrent ? <span className="badge badge--confirmed">Current</span>
                            : h.isScheduled ? <span className="badge badge--pending">Scheduled</span>
                            : formatDate(h.effectiveTo)}</td>
                          <td className="cell-muted">{h.updatedBy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <div className="card__title" style={{ marginBottom: 10 }}>
                <UserCog size={16} /> Driver Assignment History
              </div>
              {history.assigns.length === 0 ? (
                <p className="cell-muted">This car has never been assigned to a driver.</p>
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Driver</th>
                        <th>Effective From</th>
                        <th>Effective To</th>
                        <th>Updated By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.assigns.map((a) => (
                        <tr key={a.assignmentId}>
                          <td className="cell-main">{a.driverName}</td>
                          <td>{formatDate(a.effectiveFrom)}</td>
                          <td>{a.isCurrent ? <span className="badge badge--confirmed">Current</span>
                            : a.isScheduled ? <span className="badge badge--pending">Scheduled</span>
                            : formatDate(a.effectiveTo)}</td>
                          <td className="cell-muted">{a.updatedBy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
