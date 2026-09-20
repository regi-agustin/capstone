import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw, Send, Save } from 'lucide-react'
import Modal from '../../ro/components/Modal.jsx'
import {
  fetchCutoffs,
  fetchEligibleDrivers,
  fetchTripData,
  createPayroll,
  updatePayroll,
  submitPayroll,
  EARNINGS_META,
  DEDUCTIONS_META,
  formatDate,
  formatPeso,
} from '../services/payrollService.js'

const STEPS = ['Cut-off', 'Driver', 'Trips', 'Earnings', 'Deductions', 'Summary']

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100
const toNum = (s) => {
  const n = parseFloat(s)
  return Number.isFinite(n) ? round2(n) : 0
}
const todayStr = () => new Date().toISOString().slice(0, 10)

function blankMap(meta) {
  return Object.fromEntries(meta.map((m) => [m.key, 0]))
}

export default function PayrollWizard({ initial = null, onClose, onSaved }) {
  const isEdit = Boolean(initial)

  const [step, setStep] = useState(isEdit ? 3 : 1)
  const [cutoffs, setCutoffs] = useState([])
  const [cutoffsLoading, setCutoffsLoading] = useState(true)
  const [cutoff, setCutoff] = useState(null)
  const [drivers, setDrivers] = useState([])
  const [driversLoading, setDriversLoading] = useState(false)
  const [driver, setDriver] = useState(null)
  const [trips, setTrips] = useState([])
  const [tripsLoading, setTripsLoading] = useState(false)
  const [earnings, setEarnings] = useState(() => blankMap(EARNINGS_META))
  const [deductions, setDeductions] = useState(() => blankMap(DEDUCTIONS_META))
  const [carCode, setCarCode] = useState('Additional')
  const [carOwner, setCarOwner] = useState('')
  const [payrollDate, setPayrollDate] = useState(todayStr())
  const [remarks, setRemarks] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchCutoffs()
      .then((list) => {
        setCutoffs(list || [])
        if (isEdit && initial) {
          const c = (list || []).find(
            (x) => x.start === initial.cutoffStart && x.end === initial.cutoffEnd
          )
          setCutoff(
            c || {
              start: initial.cutoffStart,
              end: initial.cutoffEnd,
              label: `${formatDate(initial.cutoffStart)} – ${formatDate(initial.cutoffEnd)}`,
            }
          )
          setPayrollDate((initial.payrollDate || todayStr()).slice(0, 10))
          setCarCode(initial.carCode || 'Additional')
          setCarOwner(initial.carOwner || '')
          setRemarks(initial.remarks || '')
          setDriver({
            id: initial.driverId,
            name: initial.driverName || '',
            contact: initial.contact || '',
            tripCount: initial.tripCount || 0,
            totalRental: initial.totalEarnings || 0,
            loanDeduction: initial.deductions?.coop_loan || 0,
            hasPayroll: true,
            vehicle: {
              vehicleId: initial.vehicleId,
              carCode: initial.carCode,
              plate: initial.plateNumber,
              type: initial.vehicleType,
            },
          })
          setTrips((initial.trips || []).map((t) => ({ ...t, include: true })))
          setEarnings((prev) => ({ ...prev, ...blankMap(EARNINGS_META), ...(initial.earnings || {}) }))
          setDeductions((prev) => ({ ...prev, ...blankMap(DEDUCTIONS_META), ...(initial.deductions || {}) }))
        } else {
          const best = (list || []).reduce((a, b) => ((b.trips || 0) > ((a && a.trips) || 0) ? b : a), null)
          setCutoff(best)
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setCutoffsLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load eligible drivers whenever the cut-off period is picked.
  useEffect(() => {
    if (!cutoff) return
    setDriversLoading(true)
    setError('')
    fetchEligibleDrivers(cutoff.start, cutoff.end)
      .then(setDrivers)
      .catch((e) => setError(e.message))
      .finally(() => setDriversLoading(false))
  }, [cutoff])

  const syncAutoFromTrips = (rows) => {
    const car_rental = rows.filter((t) => t.include).reduce((s, t) => s + (t.rentalRate || 0), 0)
    const overtime = rows.filter((t) => t.include).reduce((s, t) => s + (t.otAmount || 0), 0)
    const misc = rows
      .filter((t) => t.include)
      .reduce((s, t) => s + (t.toll || 0) + (t.parking || 0), 0)
    setEarnings((prev) => ({
      ...prev,
      car_rental: round2(car_rental),
      overtime: round2(overtime),
      misc: round2(misc),
    }))
  }

  const loadTrips = ({ d = driver, c = cutoff } = {}) => {
    if (!d || !c) return
    setTripsLoading(true)
    setError('')
    fetchTripData(d.id, c.start, c.end)
      .then((list) => {
        const rows = (list || []).map((t) => ({ ...t, include: true }))
        setTrips(rows)
        syncAutoFromTrips(rows)
      })
      .catch((e) => setError(e.message))
      .finally(() => setTripsLoading(false))
  }

  const chooseDriver = (d) => {
    setDriver(d)
    setCarOwner(d.name || '')
    setDeductions((prev) => ({ ...prev, coop_loan: prev.coop_loan || d.loanDeduction || 0 }))
    if (!isEdit) loadTrips({ d })
  }

  const patchTrip = (key, field, value) => {
    const rows = trips.map((t) => (t.key === key ? { ...t, [field]: toNum(value) } : t))
    setTrips(rows)
    syncAutoFromTrips(rows)
  }

  const toggleTrip = (key) => {
    const rows = trips.map((t) => (t.key === key ? { ...t, include: !t.include } : t))
    setTrips(rows)
    syncAutoFromTrips(rows)
  }

  const patchEarning = (key, value) => setEarnings((prev) => ({ ...prev, [key]: toNum(value) }))
  const patchDeduction = (key, value) => setDeductions((prev) => ({ ...prev, [key]: toNum(value) }))

  const includedTrips = useMemo(() => trips.filter((t) => t.include), [trips])

  const totalEarnings = useMemo(
    () =>
      round2(
        EARNINGS_META.reduce(
          (s, m) => (m.negative ? s - (earnings[m.key] || 0) : s + (earnings[m.key] || 0)),
          0
        )
      ),
    [earnings]
  )

  const wtax = round2(((earnings.overtime || 0) + (earnings.misc || 0)) * 0.02)
  const withWtax = useMemo(() => ({ ...deductions, wtax }), [deductions, wtax])

  const totalDeductions = useMemo(
    () => round2(DEDUCTIONS_META.reduce((s, m) => s + (withWtax[m.key] || 0), 0)),
    [withWtax]
  )
  const net = round2(totalEarnings - totalDeductions)

  const rowTotal = (t) =>
    round2(
      (t.rentalRate || 0) +
        (t.otAmount || 0) +
        (t.toll || 0) +
        (t.parking || 0) +
        (t.excessGas || 0) +
        (t.overnightRate || 0) -
        (t.advance || 0)
    )

  const canNext =
    (step === 1 && !!cutoff) ||
    (step === 2 && !!driver && (isEdit || !driver.hasPayroll)) ||
    (step === 3 && includedTrips.length > 0) ||
    step === 4 ||
    step === 5

  const goNext = () => {
    if (!canNext) return
    setError('')
    setStep((s) => s + 1)
  }

  const persist = async (mode) => {
    if (!driver || !cutoff) return
    setSaving(true)
    setError('')
    const payload = {
      driverId: driver.id,
      cutoffStart: cutoff.start,
      cutoffEnd: cutoff.end,
      payrollDate,
      vehicleId: (driver.vehicle && driver.vehicle.vehicleId) || (initial && initial.vehicleId) || null,
      plateNumber: (driver.vehicle && driver.vehicle.plate) || (initial && initial.plateNumber) || '',
      vehicleType: (driver.vehicle && driver.vehicle.type) || (initial && initial.vehicleType) || '',
      carCode: carCode.trim() || 'Additional',
      carOwner: carOwner.trim(),
      remarks,
      earnings,
      deductions: withWtax,
      trips: includedTrips.map((t) => ({
        reservationId: t.reservationId,
        logId: t.logId,
        date: t.date,
        carCode: t.carCode || '',
        plateNumber: t.plateNumber || '',
        model: t.model || '',
        rentalRate: t.rentalRate || 0,
        requestedTimeRaw: t.requestedTimeRaw || null,
        timeOutRaw: t.timeOutRaw || null,
        workHours: t.workHours || 0,
        excessKm: t.excessKm || 0,
        excessGas: t.excessGas || 0,
        overnightRate: t.overnightRate || 0,
        otHours: t.otHours || 0,
        otAmount: t.otAmount || 0,
        dime: t.dime || 0,
        hazard: t.hazard || 0,
        toll: t.toll || 0,
        parking: t.parking || 0,
        advance: t.advance || 0,
      })),
    }
    try {
      const res = isEdit
        ? await updatePayroll({ id: initial.id, ...payload })
        : await createPayroll(payload)
      if (mode === 'submit') {
        await submitPayroll(res.id)
        onSaved(`Payroll #${res.id} was submitted for approval.`)
      } else {
        onSaved(isEdit ? `Payroll #${res.id} draft updated.` : `Payroll #${res.id} saved as draft.`)
      }
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  const footer = (
    <div className="wizard-foot" style={{ width: '100%' }}>
      <div className="wizard-foot__right">
        {step > 1 && (
          <button type="button" className="btn btn--secondary" onClick={() => setStep((s) => s - 1)}>
            <ChevronLeft size={15} /> Back
          </button>
        )}
        {step > 1 && (
          <button type="button" className="btn btn--neutral btn--sm" onClick={onClose}>
            Cancel
          </button>
        )}
      </div>
      <div className="wizard-foot__right">
        {step < 6 ? (
          <button type="button" className="btn btn--primary" disabled={!canNext || saving} onClick={goNext}>
            Next <ChevronRight size={15} />
          </button>
        ) : (
          <>
            <button type="button" className="btn btn--secondary" disabled={saving} onClick={() => persist('draft')}>
              <Save size={15} /> Save Draft
            </button>
            <button type="button" className="btn btn--primary" disabled={saving} onClick={() => persist('submit')}>
              <Send size={15} /> {saving ? 'Saving…' : 'Submit for Approval'}
            </button>
          </>
        )}
      </div>
    </div>
  )

  const stepper = (
    <div className="stepper">
      {STEPS.map((label, i) => {
        const n = i + 1
        const done = n < step
        const active = n === step
        return (
          <span key={label} className={['stepper__step', done ? ' stepper__step--done' : '', active ? ' stepper__step--active' : ''].join('')}>
            <span className="step-num">{done ? '✓' : n}</span>
            {label}
          </span>
        )
      })}
    </div>
  )

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'Edit Payroll (Draft)' : 'Create Payroll Record'}
      subtitle={isEdit && initial ? `${initial.driverName} · ${formatDate(initial.cutoffStart)} – ${formatDate(initial.cutoffEnd)}` : 'Follow the payroll process step by step'}
      size="xl"
      footer={footer}
    >
      {stepper}

      {error && <div className="error-banner" style={{ marginBottom: 14 }}>{error}</div>}

      {step === 1 && (
        <div>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label" htmlFor="wz-date">Payroll Date <span className="req">*</span></label>
            <input id="wz-date" type="date" className="form-input" value={payrollDate} onChange={(e) => setPayrollDate(e.target.value)} />
          </div>
          <div className="form-section">
            <div className="form-section__title">
              Cut-off Period <span className="form-hint">(period covered by this payroll)</span>
            </div>
            {cutoffsLoading ? (
              <div className="loading-state" style={{ marginTop: 12 }}><div className="spinner"></div></div>
            ) : cutoffs.length === 0 ? (
              <div className="empty-state" style={{ marginTop: 12 }}>
                <div className="empty-state__title">No trip data yet</div>
                <div className="empty-state__sub">Completed trip logs will define available cut-off periods.</div>
              </div>
            ) : (
              <div className="driver-picker" style={{ marginTop: 12 }}>
                {cutoffs.map((c) => (
                  <label
                    key={c.start}
                    className={`driver-option ${cutoff && cutoff.start === c.start ? 'driver-option--selected' : ''}`}
                    onClick={() => setCutoff(c)}
                  >
                    <span className="toolbar" style={{ gap: 10 }}>
                      <input type="radio" name="cutoff" checked={cutoff && cutoff.start === c.start} readOnly />
                      <span>
                        <span className="driver-option__main">{c.label}</span>
                        <span className="driver-option__sub">Trips available: {c.trips}</span>
                      </span>
                    </span>
                    <span className="cell-sub nowrap">{formatDate(c.start)} → {formatDate(c.end)}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="form-section">
            <div className="form-section__title">
              Select Driver <span className="form-hint">(drivers with completed trips in this cut-off)</span>
            </div>
            {cutoff ? (
              driversLoading ? (
                <div className="loading-state" style={{ marginTop: 12 }}><div className="spinner"></div></div>
              ) : drivers.length === 0 ? (
                <div className="empty-state" style={{ marginTop: 12 }}>
                  <div className="empty-state__title">No eligible drivers</div>
                  <div className="empty-state__sub">No completed trips were found for {cutoff.label}.</div>
                </div>
              ) : (
                <div className="driver-picker" style={{ marginTop: 12 }}>
                  {drivers.map((d) => (
                    <button
                      type="button"
                      key={d.id}
                      disabled={isEdit ? false : d.hasPayroll}
                      onClick={() => chooseDriver(d)}
                      className={[
                        'driver-option',
                        driver && driver.id === d.id ? ' driver-option--selected' : '',
                        !isEdit && d.hasPayroll ? ' driver-option--disabled' : '',
                      ].join('')}
                    >
                      <span style={{ display: 'grid', gap: 2 }}>
                        <span className="driver-option__main">{d.name}</span>
                        <span className="driver-option__sub">
                          {d.contact || 'No contact'} · {d.tripCount} trip(s)
                          {d.vehicle ? ` · ${d.vehicle.plate} ${d.vehicle.type || ''}` : ' · No vehicle in this cut-off'}
                        </span>
                        {!isEdit && d.hasPayroll && (
                          <span className="driver-option__sub" style={{ color: 'var(--danger)' }}>A payroll already exists for this driver and cut-off.</span>
                        )}
                      </span>
                      <span style={{ textAlign: 'right', display: 'grid', gap: 2 }}>
                        <span className="cell-main nowrap">{formatPeso(d.totalRental)}</span>
                        <span className="cell-sub">Rental</span>
                        {d.loanDeduction > 0 && <span className="cell-sub">{formatPeso(d.loanDeduction)} coop loan</span>}
                      </span>
                    </button>
                  ))}
                </div>
              )
            ) : (
              <p className="form-hint">Select a cut-off period first.</p>
            )}
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <div className="toolbar" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
            <div className="form-section__title">
              Trip Breakdown <span className="form-hint">(verify and add OT / toll / parking)</span>
            </div>
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => loadTrips()} disabled={tripsLoading}>
              <RefreshCw size={14} /> Reload from trip logs
            </button>
          </div>
          {tripsLoading ? (
            <div className="loading-state"><div className="spinner"></div></div>
          ) : trips.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__title">No trips loaded</div>
              <div className="empty-state__sub">Pick a driver, then click “Reload from trip logs”.</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th></th>
                    <th className="nowrap">Date</th>
                    <th className="nowrap">Trip</th>
                    <th className="nowrap">Vehicle</th>
                    <th style={{ textAlign: 'right' }}>Rental</th>
                    <th className="nowrap">Requested</th>
                    <th className="nowrap">Time Out</th>
                    <th style={{ textAlign: 'right' }}>Hrs</th>
                    <th style={{ textAlign: 'right' }}>OT (₱)</th>
                    <th style={{ textAlign: 'right' }}>Toll (₱)</th>
                    <th style={{ textAlign: 'right' }}>Parking (₱)</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {trips.map((t) => (
                    <tr key={t.key} className={t.include ? '' : 'row-muted'} style={t.include ? undefined : { opacity: 0.5 }}>
                      <td>
                        <input type="checkbox" checked={t.include} onChange={() => toggleTrip(t.key)} aria-label="include trip" />
                      </td>
                      <td className="nowrap">{formatDate(t.date)}</td>
                      <td className="nowrap">{t.tripCode || '-'}</td>
                      <td className="nowrap" title={t.model || ''}>{t.carCode || ''} · {t.plateNumber || ''}</td>
                      <td className="nowrap" style={{ textAlign: 'right' }}>{formatPeso(t.rentalRate)}</td>
                      <td className="nowrap">{t.requestedTime || '-'}</td>
                      <td className="nowrap">{t.timeOut || '-'}</td>
                      <td style={{ textAlign: 'right' }}>{t.workHours ?? '-'}</td>
                      <td>
                        <input type="number" min="0" step="0.01" className="money-input" value={t.otAmount} disabled={!t.include} onChange={(e) => patchTrip(t.key, 'otAmount', e.target.value)} />
                      </td>
                      <td>
                        <input type="number" min="0" step="0.01" className="money-input" value={t.toll} disabled={!t.include} onChange={(e) => patchTrip(t.key, 'toll', e.target.value)} />
                      </td>
                      <td>
                        <input type="number" min="0" step="0.01" className="money-input" value={t.parking} disabled={!t.include} onChange={(e) => patchTrip(t.key, 'parking', e.target.value)} />
                      </td>
                      <td className="cell-main nowrap" style={{ textAlign: 'right' }}>{formatPeso(rowTotal(t))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="form-hint" style={{ marginTop: 10 }}>
            {includedTrips.length} trip(s) included · Rental {formatPeso(earnings.car_rental)} · OT {formatPeso(earnings.overtime)} · Toll/Parking {formatPeso(earnings.misc)}
          </p>
        </div>
      )}

      {step === 4 && (
        <div>
          <div className="form-section__title" style={{ marginBottom: 14 }}>
            Earnings <span className="form-hint">(car rental, overtime and toll/parking are auto-summed from the trips)</span>
          </div>
          <div className="form-grid">
            {EARNINGS_META.map((m) => (
              <div className="form-group" key={m.key}>
                <label className="form-label">{m.label}</label>
                <input
                  type="number" min="0" step="0.01"
                  className="money-input"
                  value={earnings[m.key]}
                  onChange={(e) => patchEarning(m.key, e.target.value)}
                />
                {m.hint && <p className="form-hint">{m.hint}</p>}
              </div>
            ))}
          </div>
          <div className="divider" />
          <div className="toolbar" style={{ justifyContent: 'space-between' }}>
            <strong>TOTAL EARNINGS</strong>
            <strong style={{ color: 'var(--success)' }}>{formatPeso(totalEarnings)}</strong>
          </div>
        </div>
      )}

      {step === 5 && (
        <div>
          <div className="form-section__title" style={{ marginBottom: 14 }}>
            Deductions <span className="form-hint">(2% withholding tax is computed automatically)</span>
          </div>
          <div className="form-grid">
            {DEDUCTIONS_META.map((m) =>
              m.auto ? (
                <div className="form-group" key={m.key}>
                  <label className="form-label">{m.label}</label>
                  <input type="text" className="money-input" readOnly value={formatPeso(withWtax.wtax)} />
                </div>
              ) : (
                <div className="form-group" key={m.key}>
                  <label className="form-label">{m.label}</label>
                  <input
                    type="number" min="0" step="0.01"
                    className="money-input"
                    value={deductions[m.key]}
                    onChange={(e) => patchDeduction(m.key, e.target.value)}
                  />
                </div>
              )
            )}
          </div>
          <div className="divider" />
          <div className="toolbar" style={{ justifyContent: 'space-between' }}>
            <strong>TOTAL DEDUCTIONS</strong>
            <strong style={{ color: 'var(--danger)' }}>{formatPeso(totalDeductions)}</strong>
          </div>
        </div>
      )}

      {step === 6 && (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card__header">
              <div>
                <div className="card__title">{driver ? driver.name : ''}</div>
                <div className="card__sub">
                  {cutoff ? `${cutoff.label} · ${includedTrips.length} trip(s)` : ''}
                </div>
              </div>
              <div className="cell-main nowrap">{formatPeso(net)}</div>
            </div>
            <div className="card__body form-grid">
              <div className="form-group">
                <label className="form-label">Car Code <span className="req">*</span></label>
                <input type="text" className="form-input" value={carCode} onChange={(e) => setCarCode(e.target.value)} placeholder="Additional" />
              </div>
              <div className="form-group">
                <label className="form-label">Plate Number</label>
                <input type="text" className="form-input" readOnly disabled value={driver && driver.vehicle ? driver.vehicle.plate : (initial && initial.plateNumber) || ''} />
              </div>
              <div className="form-group">
                <label className="form-label">Vehicle Type</label>
                <input type="text" className="form-input" readOnly disabled value={driver && driver.vehicle ? (driver.vehicle.type || '') : (initial && initial.vehicleType) || ''} />
              </div>
              <div className="form-group">
                <label className="form-label">Car Owner</label>
                <input type="text" className="form-input" value={carOwner} onChange={(e) => setCarOwner(e.target.value)} placeholder="Registered car owner" />
              </div>
              <div className="form-group">
                <label className="form-label">Payroll Date</label>
                <input type="date" className="form-input" value={payrollDate} onChange={(e) => setPayrollDate(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="payslip__grid">
            <div className="payslip__col">
              <div className="payslip__col-title">Earnings</div>
              {EARNINGS_META.map((m) => (
                <div className="payslip__row" key={m.key}>
                  <span>{m.label}{m.negative ? ' (−)' : ''}</span>
                  <span className="nowrap">{formatPeso(earnings[m.key])}</span>
                </div>
              ))}
              <div className="payslip__row" style={{ fontWeight: 800 }}>
                <span>Total Earnings</span>
                <span className="nowrap">{formatPeso(totalEarnings)}</span>
              </div>
            </div>
            <div className="payslip__col">
              <div className="payslip__col-title">Deductions</div>
              {DEDUCTIONS_META.map((m) => (
                <div className="payslip__row" key={m.key}>
                  <span>{m.label}{m.auto ? ' (auto)' : ''}</span>
                  <span className="nowrap">{formatPeso(withWtax[m.key])}</span>
                </div>
              ))}
              <div className="payslip__row" style={{ fontWeight: 800 }}>
                <span>Total Deductions</span>
                <span className="nowrap">{formatPeso(totalDeductions)}</span>
              </div>
            </div>
          </div>

          <div className="payslip__total">
            <span>NET RECEIVABLE</span>
            <span>{formatPeso(net)}</span>
          </div>

          <div className="form-group" style={{ marginTop: 14 }}>
            <label className="form-label">Remarks (optional)</label>
            <textarea className="form-input" rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Notes for the reviewer…" />
          </div>
        </div>
      )}
    </Modal>
  )
}