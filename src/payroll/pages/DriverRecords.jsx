import { useEffect, useMemo, useState } from 'react'
import { Search, Download, Plus, Eye, Trash2, ChevronRight, Phone, MapPin, Users } from 'lucide-react'
import { fetchDrivers, fetchPayrollRecords, formatDate, formatPeso, statusLabel, statusStyle } from '../services/payrollService.js'

function initials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export default function DriverRecords() {
  const [drivers, setDrivers] = useState([])
  const [payroll, setPayroll] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedId, setSelectedId] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([fetchDrivers(), fetchPayrollRecords()])
      .then(([d, p]) => {
        setDrivers(d)
        setPayroll(p)
        setSelectedId(d[0]?.id ?? null)
      })
      .catch((e) => setError(e.message))
  }, [])

  const filtered = drivers.filter((d) => {
    const q = search.toLowerCase()
    const matchesSearch = !q || d.name.toLowerCase().includes(q) || String(d.id).includes(q)
    const matchesStatus = statusFilter === 'All' || d.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const selected = drivers.find((d) => d.id === selectedId) || null
  const selectedPayroll = useMemo(
    () => payroll.filter((p) => p.driverId === selectedId).slice(0, 5),
    [payroll, selectedId]
  )
  const selectedCutoff = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7)
    const cur = payroll.find((p) => p.driverId === selectedId && (p.date || '').startsWith(month))
    if (cur) {
      return {
        period: formatDate(cur.date),
        earnings: cur.basicSalary + cur.allowances,
        deductions: cur.deductions,
        net: cur.netAmount,
        status: cur.status,
      }
    }
    return null
  }, [payroll, selectedId])

  if (error) {
    return <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">{error}</div>
  }

  return (
    <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-200px)] pr-2 pb-10">
      <h2 className="text-xl font-bold text-gray-800">Driver Records</h2>
      <p className="text-sm text-gray-500 -mt-4">View and manage driver information and their payroll history.</p>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4 flex-1 flex-wrap">
          <div className="relative flex-1 max-w-sm bg-white">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search driver name or ID..."
              className="pl-9 pr-4 py-2 border rounded-lg text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm text-gray-600 bg-white"
          >
            <option>All</option>
            <option>Assigned</option>
            <option>Unassigned</option>
            <option>Unavailable</option>
          </select>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 flex items-center gap-2 bg-white hover:bg-gray-50" title="Export to Excel (upcoming)">
            <Download size={16} /> Export
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-700" title="Driver enrollment handled by Driver Management">
            <Plus size={16} /> Add Driver
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-3">#</th>
                <th className="px-6 py-3">Driver ID</th>
                <th className="px-6 py-3">Driver Name</th>
                <th className="px-6 py-3">Contact Number</th>
                <th className="px-6 py-3">License Expiry</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-400 text-sm">No drivers found.</td>
                </tr>
              )}
              {filtered.map((d, idx) => (
                <tr key={d.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-6 py-4 text-gray-600">{idx + 1}</td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-500">DRV-{String(d.id).padStart(3, '0')}</td>
                  <td className="px-6 py-4 font-medium text-gray-800">{d.name}</td>
                  <td className="px-6 py-4 text-gray-600">{d.contact}</td>
                  <td className="px-6 py-4 text-gray-600">{formatDate(d.licenseExpiry)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[11px] font-medium ${
                      d.status === 'Unavailable' ? 'bg-red-100 text-red-700' : d.status === 'Assigned' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-3 text-blue-500">
                      <button onClick={() => setSelectedId(d.id)} className="hover:text-blue-700" title="View profile">
                        <Eye size={16} />
                      </button>
                      <button className="hover:text-red-600 text-gray-300 cursor-not-allowed" title="Editing handled by Driver Management">
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
          <span>Showing {filtered.length} of {drivers.length} records</span>
          <div className="flex items-center gap-2">
            <button className="p-1 border rounded hover:bg-gray-50 text-gray-400"><ChevronRight size={16} className="rotate-180" /></button>
            <button className="px-3 py-1 border rounded bg-blue-600 text-white text-xs font-medium">1</button>
            <button className="p-1 border rounded hover:bg-gray-50"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      {selected && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex gap-6">
              <div className="w-20 h-20 bg-blue-50 rounded-full border border-blue-100 flex items-center justify-center shrink-0">
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg">{initials(selected.name)}</div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                  {selected.name}{' '}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    selected.status === 'Unavailable' ? 'bg-red-100 text-red-700' : selected.status === 'Assigned' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {selected.status}
                  </span>
                </h3>
                <p className="text-sm text-gray-500">Driver ID: DRV-{String(selected.id).padStart(3, '0')}</p>
                <div className="mt-2 space-y-1 text-sm text-gray-600">
                  <p className="flex items-center gap-2"><Phone size={14} className="text-gray-400" /> {selected.contact}</p>
                  <p className="flex items-center gap-2"><MapPin size={14} className="text-gray-400" /> {selected.address || 'Address not on file'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-b border-gray-200 px-6 flex gap-8">
            <button className="py-4 border-b-2 border-blue-600 text-blue-600 font-medium text-sm">Overview</button>
            <button className="py-4 text-gray-500 hover:text-gray-800 font-medium text-sm">Payroll History</button>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 bg-gray-50/30">
            <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
              <h4 className="font-bold text-gray-800 text-sm mb-3">Personal Information</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-gray-50 pb-1"><span className="text-gray-500">Full Name</span><span className="font-medium text-gray-800 text-right">{selected.name}</span></div>
                <div className="flex justify-between border-b border-gray-50 pb-1"><span className="text-gray-500">Address</span><span className="font-medium text-gray-800 text-right text-xs">{selected.address || '-'}</span></div>
                <div className="flex justify-between border-b border-gray-50 pb-1"><span className="text-gray-500">Date Hired</span><span className="font-medium text-gray-800">{formatDate(selected.hireDate)}</span></div>
                <div className="flex justify-between border-b border-gray-50 pb-1"><span className="text-gray-500">Employment Status</span><span className="font-medium text-gray-800">{selected.status}</span></div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
              <h4 className="font-bold text-gray-800 text-sm mb-3">Driver Information</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-gray-50 pb-1"><span className="text-gray-500">License Number</span><span className="font-medium text-gray-800">{selected.licenseNumber || '-'}</span></div>
                <div className="flex justify-between border-b border-gray-50 pb-1"><span className="text-gray-500">License Expiry</span><span className="font-medium text-gray-800">{formatDate(selected.licenseExpiry)}</span></div>
                <div className="flex justify-between border-b border-gray-50 pb-1"><span className="text-gray-500">Driver Type</span><span className="font-medium text-gray-800">Internal Driver</span></div>
                <div className="flex justify-between border-b border-gray-50 pb-1"><span className="text-gray-500">Remarks</span><span className="font-medium text-gray-800">-</span></div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
              <h4 className="font-bold text-gray-800 text-sm mb-3">Contact Information</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-gray-50 pb-1"><span className="text-gray-500">Contact Number</span><span className="font-medium text-gray-800">{selected.contact}</span></div>
                <div className="flex justify-between border-b border-gray-50 pb-1"><span className="text-gray-500">Address</span><span className="font-medium text-gray-800 text-xs text-right">{selected.address || '-'}</span></div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
              <h4 className="font-bold text-gray-800 text-sm mb-3">Payroll Summary <span className="font-normal text-xs text-gray-400">(Current Cut-off)</span></h4>
              {selectedCutoff ? (
                <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                  <div className="flex justify-between text-xs py-1"><span className="text-gray-500">Payroll Date</span><span className="font-medium text-gray-800">{selectedCutoff.period}</span></div>
                  <div className="flex justify-between text-xs py-1"><span className="text-gray-500">Total Earnings</span><span className="font-bold text-gray-800">{formatPeso(selectedCutoff.earnings)}</span></div>
                  <div className="flex justify-between text-xs py-1"><span className="text-gray-500">Total Deductions</span><span className="font-bold text-red-600">{formatPeso(selectedCutoff.deductions)}</span></div>
                  <div className="flex justify-between text-xs py-1 border-t border-blue-200 mt-1 pt-1"><span className="text-gray-500 font-medium">Total Receivable</span><span className="font-bold text-blue-600">{formatPeso(selectedCutoff.net)}</span></div>
                  <div className="flex justify-between text-xs py-1"><span className="text-gray-500">Status</span><span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusStyle(selectedCutoff.status)}`}>{statusLabel(selectedCutoff.status)}</span></div>
                </div>
              ) : (
                <p className="text-xs text-gray-400">No payroll record for this cut-off.</p>
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 p-6 space-y-8">
            <div>
              <h4 className="font-medium text-gray-800 text-sm mb-4">Recent Payroll History</h4>
              {selectedPayroll.length === 0 ? (
                <p className="text-xs text-gray-400">No payroll records yet.</p>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-2">Payroll Date</th>
                        <th className="px-3 py-2 text-right">Basic Salary</th>
                        <th className="px-3 py-2 text-right">Allowances</th>
                        <th className="px-3 py-2 text-right">Deductions</th>
                        <th className="px-3 py-2 text-right">Total Receivable</th>
                        <th className="px-3 py-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {selectedPayroll.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2">{formatDate(p.date)}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatPeso(p.basicSalary)}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatPeso(p.allowances)}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatPeso(p.deductions)}</td>
                          <td className="px-3 py-2 text-right font-bold text-blue-600">{formatPeso(p.netAmount)}</td>
                          <td className="px-3 py-2 text-center"><span className={`px-2 py-0.5 rounded-full ${statusStyle(p.status)}`}>{statusLabel(p.status)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}