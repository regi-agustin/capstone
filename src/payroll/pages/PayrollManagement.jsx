import { useEffect, useMemo, useState } from 'react'
import { Search, Download, Plus, Trash2, ChevronRight, FileText, CheckCircle, Save } from 'lucide-react'
import {
  fetchPayrollRecords,
  fetchDrivers,
  createPayrollRecord,
  updatePayrollStatus,
  deletePayrollRecord,
  statusLabel,
  statusStyle,
  formatDate,
  formatPeso,
} from '../services/payrollService.js'

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
    <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-200px)] pr-2 pb-10">
      <h2 className="text-xl font-bold text-gray-800">Payroll Management</h2>
      <p className="text-sm text-gray-500 -mt-4">Create, encode, review and verify driver payroll records.</p>

      {msg && (
        <div className={`text-sm px-4 py-2.5 rounded-lg border ${msg.ok ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          {msg.text}
        </div>
      )}
      {error && <div className="text-sm px-4 py-2.5 rounded-lg bg-red-50 text-red-700 border border-red-200">{error}</div>}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Payroll Records</h3>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="border rounded-lg px-3 py-2 text-sm text-gray-600 flex items-center gap-2 bg-white">
            Cut-off Period <span className="font-medium text-gray-800">{records.length} record(s)</span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search driver..."
              className="pl-9 pr-4 py-2 border rounded-lg text-sm w-48 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            />
          </div>
          <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 flex items-center gap-2 bg-white hover:bg-gray-50" title="Export to Excel (upcoming)">
            <Download size={16} /> Export
          </button>
          <button
            onClick={() => document.getElementById('payroll-form')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-700"
          >
            <Plus size={16} /> New Payroll Record
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Payroll Date</th>
                <th className="px-4 py-3 text-right">Basic Salary</th>
                <th className="px-4 py-3 text-right">Allowances</th>
                <th className="px-4 py-3 text-right">Deductions</th>
                <th className="px-4 py-3 text-right">Total Receivable</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-400 text-sm">No payroll records found.</td>
                </tr>
              )}
              {filtered.map((r, idx) => (
                <tr key={r.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-4 text-gray-600">{idx + 1}</td>
                  <td className="px-4 py-4 font-medium text-gray-800">{r.driverName}</td>
                  <td className="px-4 py-4 text-gray-600">{r.contact || '-'}</td>
                  <td className="px-4 py-4 text-gray-600 whitespace-nowrap">{formatDate(r.date)}</td>
                  <td className="px-4 py-4 text-right text-gray-600 whitespace-nowrap">{formatPeso(r.basicSalary)}</td>
                  <td className="px-4 py-4 text-right text-gray-600 whitespace-nowrap">{formatPeso(r.allowances)}</td>
                  <td className="px-4 py-4 text-right text-red-500 whitespace-nowrap">-{formatPeso(r.deductions)}</td>
                  <td className="px-4 py-4 text-right font-bold text-gray-800 whitespace-nowrap">{formatPeso(r.netAmount)}</td>
                  <td className="px-4 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap ${statusStyle(r.status)}`}>
                      {statusLabel(r.status)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-center items-center gap-2">
                      <select
                        value={r.status}
                        disabled={busy === r.id}
                        onChange={(e) => handleStatus(r.id, e.target.value)}
                        className="border rounded px-1.5 py-1 text-[11px] bg-white text-gray-700"
                      >
                        <option value="Pending">For Review</option>
                        <option value="Paid">Completed</option>
                        <option value="Unpaid">Unpaid</option>
                      </select>
                      <button onClick={() => handleDelete(r.id)} disabled={busy === r.id} className="text-red-500 hover:text-red-700">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center text-sm text-gray-500 bg-white">
          <span>Showing {filtered.length} of {records.length} records</span>
          <div className="flex items-center gap-2">
            <button className="p-1 border rounded hover:bg-gray-50 text-gray-400"><ChevronRight size={16} className="rotate-180" /></button>
            <button className="px-3 py-1 border rounded bg-blue-600 text-white text-xs font-medium">1</button>
            <button className="p-1 border rounded hover:bg-gray-50"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      <div id="payroll-form" className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-8">
        <div>
          <h4 className="text-sm font-bold text-gray-800 bg-blue-50/50 p-2 rounded-t border border-b-0 border-blue-200 -mx-6 px-6 mb-4">
            A. HEADER <span className="font-normal text-xs text-gray-500 font-light">(input manually)</span>
          </h4>
          <div className="grid grid-cols-3 gap-x-8 gap-y-4 text-sm px-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Car Driver <span className="text-red-500">*</span></label>
              <select
                value={form.driverId}
                onChange={(e) => setForm((f) => ({ ...f, driverId: e.target.value }))}
                className="w-full border rounded px-3 py-2 bg-white text-gray-700"
              >
                <option value="">Select driver...</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Payroll Date <span className="text-red-500">*</span></label>
              <input
                type="date"
                value={form.payrollDate}
                onChange={(e) => setForm((f) => ({ ...f, payrollDate: e.target.value }))}
                className="w-full border rounded px-3 py-2 bg-white text-gray-700"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Cut-off Period</label>
              <input type="text" value={formatDate(form.payrollDate)} readOnly className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div className="bg-green-50/30 p-4 rounded-xl border border-green-200">
            <h4 className="font-bold text-gray-800 text-sm mb-4 border-b border-green-200 pb-2">
              B. EARNINGS <span className="font-normal text-xs text-gray-500 font-light">(input manually)</span>
            </h4>
            <div className="space-y-2 text-sm border-b border-green-200 pb-4">
              {EARNINGS.map((e) => (
                <div key={e.key} className="flex justify-between items-center gap-3">
                  <span className={`text-gray-600 ${e.negative ? 'text-red-500' : ''}`}>{e.label}</span>
                  <input
                    type="number"
                    min="0"
                    value={form.earnings[e.key]}
                    onChange={(ev) => setEarn(e.key, ev.target.value)}
                    placeholder="0.00"
                    className="w-28 text-right border rounded px-2 py-1 text-xs bg-white"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center mt-3 font-bold text-green-700">
              <span>TOTAL EARNINGS</span>
              <span>{formatPeso(totals.earnings)}</span>
            </div>
          </div>

          <div className="bg-red-50/30 p-4 rounded-xl border border-red-200">
            <h4 className="font-bold text-gray-800 text-sm mb-4 border-b border-red-200 pb-2">
              C. DEDUCTIONS <span className="font-normal text-xs text-gray-500 font-light">(input manually)</span>
            </h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm border-b border-red-200 pb-4">
              {DEDUCTIONS.map((d) => (
                <div key={d.key} className="flex justify-between items-center gap-2">
                  <span className="text-gray-600">{d.label}</span>
                  <input
                    type="number"
                    min="0"
                    value={form.deductions[d.key]}
                    onChange={(ev) => setDeduc(d.key, ev.target.value)}
                    placeholder="0.00"
                    className="w-20 text-right border rounded px-2 py-1 text-xs bg-white"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center mt-3 font-bold text-red-600">
              <span>TOTAL DEDUCTIONS</span>
              <span>{formatPeso(totals.deductions)}</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold text-gray-800 bg-blue-50/50 p-2 rounded-t border border-b-0 border-blue-200 -mx-6 px-6 mb-4">
            D. TRIP BREAKDOWN <span className="font-normal text-xs text-gray-500 font-light">(sample trip records for reference)</span>
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] text-left border-collapse">
              <thead className="bg-blue-50/50 text-gray-600 font-semibold border-b border-gray-200">
                <tr>
                  {['#', 'Date', 'Car Code', 'Rental Rate (₱)', 'Requested Time', 'Time Out', 'Work Hours', 'Excess KM', 'Excess Gas (₱)', 'Overnight Rate (₱)', 'OT Hrs', 'OT Rate (₱)', 'Dime (₱)', 'Hazard (₱)', 'Toll (₱)', 'Parking (₱)', 'Advance (₱)', 'Total Amount (₱)'].map((h) => (
                    <th key={h} className="p-2 border-r border-gray-200 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {TRIPS.map((t) => (
                  <tr key={t.n} className="hover:bg-gray-50">
                    <td className="p-2 border-r border-gray-200 text-center">{t.n}</td>
                    <td className="p-2 border-r border-gray-200 whitespace-nowrap">{t.date}</td>
                    <td className="p-2 border-r border-gray-200">{t.code}</td>
                    <td className="p-2 border-r border-gray-200 text-right">{t.rate}</td>
                    <td className="p-2 border-r border-gray-200 whitespace-nowrap">{t.req}</td>
                    <td className="p-2 border-r border-gray-200 whitespace-nowrap">{t.out}</td>
                    <td className="p-2 border-r border-gray-200 text-right">{t.hrs}</td>
                    <td className="p-2 border-r border-gray-200 text-right">{t.km}</td>
                    <td className="p-2 border-r border-gray-200 text-right">{t.gas}</td>
                    <td className="p-2 border-r border-gray-200 text-right">{t.night}</td>
                    <td className="p-2 border-r border-gray-200 text-right">{t.otH}</td>
                    <td className="p-2 border-r border-gray-200 text-right">{t.otR}</td>
                    <td className="p-2 border-r border-gray-200 text-right">{t.dime}</td>
                    <td className="p-2 border-r border-gray-200 text-right">{t.hazard}</td>
                    <td className="p-2 border-r border-gray-200 text-right">{t.toll}</td>
                    <td className="p-2 border-r border-gray-200 text-right">{t.parking}</td>
                    <td className="p-2 border-r border-gray-200 text-right">{t.adv}</td>
                    <td className="p-2 border-r border-gray-200 text-right font-bold">{t.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">Trip breakdown is currently a reference table. Live trip import is part of the upcoming payroll integration.</p>
        </div>

        <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 mt-4">
          <button onClick={() => setForm(emptyForm)} className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 flex items-center gap-2 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50">
            <Save size={16} /> {saving ? 'Saving...' : 'Save Record'}
          </button>
          <button className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 flex items-center gap-2 hover:bg-gray-50">
            <Download size={16} /> Print / Export
          </button>
        </div>
        <p className="text-[11px] text-gray-400 -mt-4">Status flow: For Review (pending) → Completed (paid). Unpaid marks the record as unsettled.</p>
      </div>
    </div>
  )
}