import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw, Send, Save, AlertTriangle } from 'lucide-react'
import Modal from '../../ro/components/Modal.jsx'
import {
  fetchEligibleDrivers,
  fetchTripData,
  fetchCarRentalQuote,
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

// ------------------------- Pay period (cut-off) ---------------------------
// The payroll period is derived from Month + Year + cut-off; it is never
// typed by the user and never read from a pre-created cut-off record.

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const CUTOFF_TYPES = [
  { value: 'first', label: '1st Cut-Off', startDay: 1, endDay: 15 },
  { value: 'second', label: '2nd Cut-Off', startDay: 16, endDay: null }, // null = last day of month
]

// The year is typed by the officer, so any payroll year is reachable — not just
// a fixed window around the current one. It still has to be a real 4-digit year
// before it is used to work out month lengths (e.g. leap-year February).
const YEAR_MIN = 1900
const isValidYear = (y) => /^\d{4}$/.test(String(y).trim()) && Number(y) >= YEAR_MIN

// Day 0 of the following month IS the last day of the month before it, so this
// resolves February correctly in leap years (29 in 2028, 28 in 2027) without
// any hardcoded month lengths.
const lastDayOfMonth = (monthIndex, year) => new Date(year, monthIndex + 1, 0).getDate()

const isoOf = (year, monthIndex, day) =>
  `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

// Builds the payroll period for a month/year + cut-off pair.
function buildPeriod(monthIndex, year, cutoffType) {
  const type = CUTOFF_TYPES.find((t) => t.value === cutoffType)
  if (type === undefined || monthIndex === '' || monthIndex === null || year === '' || year === null) return null
  if (!isValidYear(year)) return null

  const startDay = type.startDay
  const endDay = type.endDay === null ? lastDayOfMonth(monthIndex, Number(year)) : type.endDay
  const start = isoOf(year, monthIndex, startDay)
  const end = isoOf(year, monthIndex, endDay)

  return {
    start,
    end,
    monthIndex,
    year: Number(year),
    cutoffType: type.value,
    cutoffLabel: type.label,
    monthLabel: MONTH_NAMES[monthIndex],
    // e.g. "September 16–30, 2026"
    label: `${MONTH_NAMES[monthIndex]} ${startDay}–${endDay}, ${year}`,
  }
}

// Reverse of buildPeriod: rebuilds the three selectors from a saved period so an
// existing payroll record reopens on the exact range it was created with.
function periodFromDates(startISO, endISO) {
  const [ys, ms, ds] = String(startISO || '').slice(0, 10).split('-')
  const year = Number(ys)
  const monthIndex = Number(ms) - 1
  const startDay = Number(ds)
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) return null

  // Day 1–15 is the 1st cut-off; anything starting on the 16th is the 2nd.
  const cutoffType = startDay <= 15 ? 'first' : 'second'
  const period = buildPeriod(monthIndex, year, cutoffType)

  // A legacy record outside the 1–15 / 16–last convention cannot be expressed by
  // these selectors; flag it so the caller keeps the stored range instead.
  if (period && (period.start !== startISO || period.end !== endISO)) return { period, matches: false }
  return { period, matches: true }
}

export default function PayrollWizard({ initial = null, onClose, onSaved }) {
  const isEdit = Boolean(initial)

  const [step, setStep] = useState(isEdit ? 3 : 1)
  // Resolved once at mount so an edit session already holds the right period on
  // its very first render (editing opens straight on step 3).
  const initialPeriod = useMemo(
    () => (isEdit && initial ? periodFromDates(initial.cutoffStart, initial.cutoffEnd) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  // A saved period the selectors cannot reproduce is pinned so it can never be
  // silently rewritten on save.
  const initialLock = useMemo(() => {
    if (!isEdit || !initial) return null
    if (initialPeriod && initialPeriod.period && initialPeriod.matches) return null
    return {
      ...(initialPeriod && initialPeriod.period
        ? initialPeriod.period
        : { monthIndex: '', year: '', cutoffType: '', cutoffLabel: '', monthLabel: '' }),
      start: initial.cutoffStart,
      end: initial.cutoffEnd,
      label: `${formatDate(initial.cutoffStart)} – ${formatDate(initial.cutoffEnd)}`,
    }
  }, [initialPeriod, isEdit, initial])

  // The year starts on the current year because that is nearly always right,
  // but it stays a free editable field for back-pay and future periods. The
  // month and the cut-off are never defaulted, so a period is never created by
  // accident.
  const [periodMonth, setPeriodMonth] = useState(initialPeriod?.period?.monthIndex ?? '')
  const [periodYear, setPeriodYear] = useState(() =>
    initialPeriod?.period ? String(initialPeriod.period.year) : String(new Date().getFullYear())
  )
  const [cutoffType, setCutoffType] = useState(initialPeriod?.period?.cutoffType ?? '')
  const [periodTouched, setPeriodTouched] = useState(initialPeriod !== null)
  const [periodLocked, setPeriodLocked] = useState(initialLock)
  const [drivers, setDrivers] = useState([])
  const [driversLoading, setDriversLoading] = useState(false)
  const [driver, setDriver] = useState(null)
  const [trips, setTrips] = useState([])
  const [tripsLoading, setTripsLoading] = useState(false)
  // Per-car breakdown behind the Car Rental figure: daily rate x unique use
  // days, priced at the rate that applied on each day.
  const [carQuote, setCarQuote] = useState(null)
  const [earnings, setEarnings] = useState(() => blankMap(EARNINGS_META))
  const [deductions, setDeductions] = useState(() => blankMap(DEDUCTIONS_META))
  const [carCode, setCarCode] = useState('Additional')
  const [carOwner, setCarOwner] = useState('')
  const [payrollDate, setPayrollDate] = useState(todayStr())
  const [remarks, setRemarks] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // The payroll period is a single derived value: every later step (eligible
  // drivers, trip filtering, save payload, summary) reads these two dates.
  const derivedPeriod = useMemo(
    () => buildPeriod(periodMonth, periodYear, cutoffType),
    [periodMonth, periodYear, cutoffType]
  )
  const cutoff = periodLocked || derivedPeriod

  // The period is already resolved at mount; this only hydrates the rest of the
  // record so an edit session opens fully populated.
  useEffect(() => {
    if (!isEdit || !initial) return

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
    // An edit opens on the rate breakdown that was frozen when it was saved,
    // so editing an old draft never re-prices it with today's rates.
    setCarQuote(initial.carRateSnapshot || null)
    setEarnings((prev) => ({ ...prev, ...blankMap(EARNINGS_META), ...(initial.earnings || {}) }))
    setDeductions((prev) => ({ ...prev, ...blankMap(DEDUCTIONS_META), ...(initial.deductions || {}) }))
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

  // Car rental is not the sum of trip rows: the same car used twice in one day
  // is a single use day, and each day is billed at the rate that applied then.
  // The server returns that breakdown; excluding a trip drops its vehicle/day.
  const rentalForIncluded = (quote, rows) => {
    if (!quote) return 0
    const included = rows.filter((t) => t.include)
    if (included.length === 0) return 0

    // Older snapshots have no vehicle id on the trip rows; fall back to the
    // full quote so an existing draft never shows a falsely reduced figure.
    if (included.some((t) => !t.vehicleId)) return quote.total

    const days = new Set(included.map((t) => `${t.vehicleId}|${String(t.date).slice(0, 10)}`))
    return round2(
      (quote.segments || []).reduce((sum, seg) => {
        const used = (seg.dates || []).filter((d) => days.has(`${seg.vehicleId}|${d}`)).length
        return sum + seg.dailyRate * used
      }, 0)
    )
  }

  const syncAutoFromTrips = (rows, quote = carQuote) => {
    const car_rental = rentalForIncluded(quote, rows)
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
    // The quote and the trip list must agree, so they load together and the
    // car-rental figure is derived from the same snapshot the server will freeze.
    Promise.all([fetchTripData(d.id, c.start, c.end), fetchCarRentalQuote(d.id, c.start, c.end)])
      .then(([list, quote]) => {
        setCarQuote(quote)
        const rows = (list || []).map((t) => ({ ...t, include: true }))
        setTrips(rows)
        syncAutoFromTrips(rows, quote)
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

  // ---------- Pay period (cut-off) helpers ----------
  const touchPeriod = () => setPeriodTouched(true)

  // A driver and their trips belong to exactly one period. Changing the period
  // drops them so a stale selection can never be saved against a new range.
  const applyPeriodChange = (apply) => {
    touchPeriod()
    apply()
    if (isEdit) return
    setDriver(null)
    setTrips([])
    setCarQuote(null)
    setEarnings((prev) => ({ ...prev, car_rental: 0, overtime: 0, misc: 0 }))
    setError('')
  }

  const chooseMonth = (value) => applyPeriodChange(() => setPeriodMonth(value === '' ? '' : Number(value)))
  // Keep only digits, at most 4, so the field cannot hold anything the calendar
  // maths would choke on.
  const chooseYear = (value) => applyPeriodChange(() => setPeriodYear(String(value).replace(/\D/g, '').slice(0, 4)))
  const chooseCutoffType = (value) => applyPeriodChange(() => setCutoffType(value))

  // Only surface validation once the officer has started using the controls.
  const showPeriodErrors = periodTouched && !cutoff
  const monthInvalid = showPeriodErrors && periodMonth === ''
  const yearInvalid = showPeriodErrors && !isValidYear(periodYear)
  const cutoffTypeInvalid =
    showPeriodErrors && periodMonth !== '' && isValidYear(periodYear) && cutoffType === ''

  const periodError = showPeriodErrors
    ? monthInvalid
      ? 'Please select a month.'
      : yearInvalid
        ? periodYear === ''
          ? 'Please enter a year.'
          : 'Enter a 4-digit year (e.g. 2026).'
        : cutoffTypeInvalid
          ? 'Please select a cut-off period.'
          : ''
    : ''

  // The generated range for each option, shown on the radio cards.
  const cutoffOptions = useMemo(
    () => CUTOFF_TYPES.map((t) => ({
      ...t,
      period: buildPeriod(periodMonth, periodYear, t.value),
    })),
    [periodMonth, periodYear]
  )

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
      subtitle={isEdit && initial ? `${initial.driverName} · ${cutoff ? cutoff.label : ''}` : 'Follow the payroll process step by step'}
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
            <p className="form-hint" style={{ margin: '0 0 14px' }}>
              Select the month, year, and cut-off period for this payroll.
            </p>

            <div className="form-grid" style={{ marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="wz-month">
                  Month <span className="req">*</span>
                </label>
                <select
                  id="wz-month"
                  className={`form-select${monthInvalid ? ' is-invalid' : ''}`}
                  value={periodMonth}
                  disabled={periodLocked !== null}
                  onChange={(e) => chooseMonth(e.target.value)}
                >
                  <option value="">Select month</option>
                  {MONTH_NAMES.map((name, i) => (
                    <option key={name} value={i}>{name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="wz-year">
                  Year <span className="req">*</span>
                </label>
                <input
                  id="wz-year"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  placeholder="e.g. 2026"
                  aria-invalid={yearInvalid}
                  aria-describedby="wz-year-hint"
                  className={`form-input${yearInvalid ? ' is-invalid' : ''}`}
                  value={periodYear}
                  disabled={periodLocked !== null}
                  onChange={(e) => chooseYear(e.target.value)}
                />
                <p className="form-hint" id="wz-year-hint">
                  Type the 4-digit payroll year.
                </p>
              </div>
            </div>

            <fieldset
              style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}
              disabled={periodLocked !== null}
            >
              <legend className="form-label" style={{ marginBottom: 8, padding: 0 }}>
                Cut-Off <span className="req">*</span>
              </legend>

              <div className="driver-picker">
                {cutoffOptions.map((opt) => {
                  const selected = cutoffType === opt.value
                  return (
                    <label
                      key={opt.value}
                      className={`driver-option${selected ? ' driver-option--selected' : ''}`}
                    >
                      <span className="toolbar" style={{ gap: 10, flexDirection: 'row' }}>
                        <input
                          type="radio"
                          name="cutoff-type"
                          value={opt.value}
                          checked={selected}
                          onChange={() => chooseCutoffType(opt.value)}
                        />
                        <span style={{ display: 'grid', gap: 2 }}>
                          <span className="driver-option__main">{opt.label}</span>
                          <span className="driver-option__sub">
                            {opt.period ? opt.period.label : 'Select a month and year to see the date range.'}
                          </span>
                        </span>
                      </span>
                      {selected && <span className="badge badge--confirmed nowrap">Selected</span>}
                    </label>
                  )
                })}
              </div>
            </fieldset>

            {periodLocked !== null && (
              <p className="form-hint" style={{ marginTop: 10 }}>
                The saved payroll period does not match the standard 1st/2nd cut-off range, so it is locked to {periodLocked.label}.
              </p>
            )}
            {periodError && <p className="form-error" style={{ marginTop: 10 }}>{periodError}</p>}
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
                    <th style={{ textAlign: 'right' }}>Daily Rate</th>
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
          <p className="form-hint" style={{ margin: '0 0 12px' }}>
            {cutoff && <>Completed trips from {formatDate(cutoff.start)} to {formatDate(cutoff.end)} · </>}
            {includedTrips.length} trip(s) included · Car Rental {formatPeso(earnings.car_rental)} · OT{' '}
            {formatPeso(earnings.overtime)} · Toll/Parking {formatPeso(earnings.misc)}
          </p>
          <p className="form-hint" style={{ margin: 0 }}>
            Car rental is billed per vehicle-use day (same car used twice in one day counts once), not per
            trip. See the breakdown on the Earnings step.
          </p>
        </div>
      )}

      {step === 4 && (
        <div>
          <div className="form-section__title" style={{ marginBottom: 14 }}>
            Earnings <span className="form-hint">(car rental, overtime and toll/parking are auto-summed from the trips)</span>
          </div>
          {carQuote && (carQuote.segments || []).length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div className="form-section__title" style={{ marginBottom: 8 }}>
                Car Rental Breakdown{' '}
                <span className="form-hint">
                  ({carQuote.useDays} vehicle-use day{carQuote.useDays === 1 ? '' : 's'}
                  {carQuote.tripCount !== carQuote.useDays
                    ? ` from ${carQuote.tripCount} trips, same-day repeats counted once`
                    : ''}
                  )
                </span>
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Car Code</th>
                      <th>Plate Number</th>
                      <th style={{ textAlign: 'right' }}>Daily Rate</th>
                      <th style={{ textAlign: 'right' }}>Use Days</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {carQuote.segments.map((s) => (
                      <tr key={`${s.vehicleId}-${s.dailyRate}`}>
                        <td className="cell-main">
                          {s.carCode}
                          {s.rateSource === 'vehicle' && (
                            <span className="cell-sub" style={{ display: 'block' }}>
                              rate from vehicle record
                            </span>
                          )}
                        </td>
                        <td>{s.plateNumber}</td>
                        <td style={{ textAlign: 'right' }}>{formatPeso(s.dailyRate)}</td>
                        <td style={{ textAlign: 'right' }}>{s.useDays}</td>
                        <td className="cell-main" style={{ textAlign: 'right' }}>{formatPeso(s.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="toolbar" style={{ justifyContent: 'space-between', marginTop: 10 }}>
                <strong>Car Rental Total</strong>
                <strong style={{ color: 'var(--primary-dark)' }}>{formatPeso(carQuote.total)}</strong>
              </div>
              {carQuote.missingRate && (
                <div
                  className="error-banner"
                  style={{
                    marginTop: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'var(--warning-soft)',
                    color: 'var(--warning)',
                    borderColor: 'var(--warning)',
                  }}
                >
                  <AlertTriangle size={16} style={{ flexShrink: 0 }} /> One or more cars have no daily
                  rate set, so they are billed at ₱0.00. Set it under Current Car Rates.
                </div>
              )}
            </div>
          )}
          {carQuote && carQuote.unassigned && (
            <p className="form-hint" style={{ marginBottom: 14 }}>
              One or more cars used in this period have no assigned driver on record.
            </p>
          )}
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
                <label className="form-label">Payroll Period</label>
                <input type="text" className="form-input" readOnly value={cutoff ? cutoff.label : ''} />
              </div>
              <div className="form-group">
                <label className="form-label">Cut-Off</label>
                <input type="text" className="form-input" readOnly value={cutoff ? cutoff.cutoffLabel : ''} />
              </div>
              <div className="form-group">
                <label className="form-label">Month</label>
                <input type="text" className="form-input" readOnly value={cutoff ? cutoff.monthLabel : ''} />
              </div>
              <div className="form-group">
                <label className="form-label">Year</label>
                <input type="text" className="form-input" readOnly value={cutoff ? String(cutoff.year) : ''} />
              </div>
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

          {carQuote && (carQuote.segments || []).length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card__header">
                <div>
                  <div className="card__title">Car Rental Breakdown</div>
                  <div className="card__sub">
                    {carQuote.useDays} vehicle-use day{carQuote.useDays === 1 ? '' : 's'} · these rates
                    are saved with this payroll
                  </div>
                </div>
                <div className="cell-main nowrap">{formatPeso(earnings.car_rental)}</div>
              </div>
              <div className="card__body">
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Car Code</th>
                        <th>Plate Number</th>
                        <th>Assigned Driver</th>
                        <th style={{ textAlign: 'right' }}>Daily Rate</th>
                        <th style={{ textAlign: 'right' }}>Use Days</th>
                        <th style={{ textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {carQuote.segments.map((s) => (
                        <tr key={`${s.vehicleId}-${s.dailyRate}`}>
                          <td className="cell-main">{s.carCode}</td>
                          <td>{s.plateNumber}</td>
                          <td>{s.assignedDriver || <span className="cell-muted">Unassigned</span>}</td>
                          <td style={{ textAlign: 'right' }}>{formatPeso(s.dailyRate)}</td>
                          <td style={{ textAlign: 'right' }}>{s.useDays}</td>
                          <td className="cell-main" style={{ textAlign: 'right' }}>{formatPeso(s.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="form-hint" style={{ marginTop: 10 }}>
                  Rate changes are applied to the days they affect, and this breakdown is frozen on save so
                  later rate edits do not change this payroll.
                </p>
              </div>
            </div>
          )}

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