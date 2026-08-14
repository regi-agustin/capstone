import { useEffect, useState } from 'react'
import { Search, Download, Plus, Camera, ChevronRight, Calendar, FileText, Shield } from 'lucide-react'
import { fetchAttendance, fetchDrivers, formatDate } from '../services/payrollService.js'

function statusChip(status) {
  switch (status) {
    case 'Verified':
      return 'bg-green-100 text-green-700'
    case 'Rejected':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-yellow-100 text-yellow-700'
  }
}

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
  const total = drivers.length
  const pct = (c) => (total > 0 ? ((c / total) * 100).toFixed(2) : '0.00')

  if (error) {
    return <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">{error}</div>
  }

  return (
    <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-200px)] pr-2 pb-10">
      <h2 className="text-xl font-bold text-gray-800">Driver Attendance</h2>
      <p className="text-sm text-gray-500 -mt-4">Manage driver attendance with OCR plate number verification.</p>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex border rounded-lg px-3 py-2 text-sm items-center gap-2 bg-white"><Calendar size={16} className="text-gray-400" /> Current month</div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search driver..."
              className="pl-9 pr-4 py-2 border rounded-lg text-sm w-56 bg-white"
            />
          </div>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 flex items-center justify-center gap-2 bg-white hover:bg-gray-50">
            <Download size={16} /> Export
          </button>
          <button className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-blue-700" title="Attendance upload happens through the driver app">
            <Plus size={16} /> Add Attendance
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 text-center shadow-sm"><div className="text-2xl font-bold text-gray-800">{total}</div><div className="text-xs text-gray-500">Total Drivers</div><div className="text-[10px] text-gray-400 mt-1">All active drivers</div></div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 text-center shadow-sm"><div className="text-2xl font-bold text-green-600">{present}</div><div className="text-xs text-gray-500">Present</div><div className="text-[10px] text-gray-400 mt-1">{pct(present)}% of total</div></div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 text-center shadow-sm"><div className="text-2xl font-bold text-orange-500">0</div><div className="text-xs text-gray-500">Late</div><div className="text-[10px] text-gray-400 mt-1">Not yet tracked</div></div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 text-center shadow-sm"><div className="text-2xl font-bold text-red-500">{Math.max(0, total - present)}</div><div className="text-xs text-gray-500">Absent</div><div className="text-[10px] text-gray-400 mt-1">{pct(Math.max(0, total - present))}% of total</div></div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 text-center shadow-sm"><div className="text-2xl font-bold text-purple-500">0</div><div className="text-xs text-gray-500">On Leave</div><div className="text-[10px] text-gray-400 mt-1">0.00% of total</div></div>
      </div>

      <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        {[
          { icon: Camera, title: '1. Capture Vehicle Image', desc: 'Staff captures a clear image of the vehicle plate.' },
          { icon: FileText, title: '2. OCR Extraction (Tesseract)', desc: 'Tesseract OCR extracts the plate number from the image.' },
          { icon: Shield, title: '3. System Verification', desc: 'System compares OCR result with the entered plate number.' },
          { icon: FileText, title: '4. Attendance Recorded', desc: 'Attendance is saved with verification status.' },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex flex-col items-center text-center w-full md:w-auto">
              <div className="w-14 h-14 bg-white rounded-xl border border-blue-200 flex items-center justify-center text-blue-600 mb-2 shadow-sm"><s.icon size={24} /></div>
              <div className="text-xs font-bold text-gray-700">{s.title}</div>
              <div className="text-[10px] text-gray-500 max-w-[140px]">{s.desc}</div>
            </div>
            {i < 3 && <div className="hidden md:block text-blue-400"><ChevronRight size={28} /></div>}
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
          <span className="font-bold text-gray-800 text-sm">Attendance Records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-center w-8">#</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Driver Name</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3 text-center">Time In</th>
                <th className="px-4 py-3 text-center">Time Out</th>
                <th className="px-4 py-3">Verification Status</th>
                <th className="px-4 py-3">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-sm">No attendance records found.</td>
                </tr>
              )}
              {filtered.map((r, idx) => (
                <tr key={r.id} className="hover:bg-blue-50/30">
                  <td className="px-4 py-4 text-gray-600 text-center">{idx + 1}</td>
                  <td className="px-4 py-4 text-gray-600 text-xs whitespace-nowrap">{formatDate(r.date)}</td>
                  <td className="px-4 py-4 font-medium text-gray-800 text-xs whitespace-nowrap">{r.driverName}</td>
                  <td className="px-4 py-4 text-gray-600 text-xs">{r.vehicle}</td>
                  <td className="px-4 py-4 text-gray-600 text-xs text-center">{r.timeIn || '-'}</td>
                  <td className="px-4 py-4 text-gray-600 text-xs text-center">{r.timeOut || '-'}</td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-medium whitespace-nowrap ${statusChip(r.verificationStatus)}`}>
                      {r.verificationStatus}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-gray-500 text-xs">{r.rejectionReason || (r.verificationStatus === 'Pending' ? 'Awaiting verification' : '-')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-200 flex justify-between items-center text-xs text-gray-500 bg-white">
          <span>Showing {filtered.length} of {attendance.length} records</span>
          <div className="flex items-center gap-1">
            <button className="p-1 border rounded hover:bg-gray-50 text-gray-400"><ChevronRight size={14} className="rotate-180" /></button>
            <button className="px-3 py-1 border rounded bg-blue-600 text-white text-[10px] font-medium">1</button>
            <button className="p-1 border rounded hover:bg-gray-50"><ChevronRight size={14} /></button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <h4 className="text-xs font-bold text-gray-700 mb-3">Legend <span className="font-normal text-gray-400">(Verification Status)</span></h4>
          <div className="space-y-3 text-[11px]">
            <div className="flex items-start gap-3"><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium mt-0.5 w-12 text-center">Verified</span><span className="text-gray-500">Attendance is verified.</span></div>
            <div className="flex items-start gap-3"><span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium mt-0.5 w-16 text-center">Pending</span><span className="text-gray-500">Awaiting verification (OCR flow).</span></div>
            <div className="flex items-start gap-3"><span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium mt-0.5 w-14 text-center">Rejected</span><span className="text-gray-500">Attendance was rejected.</span></div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <h4 className="text-xs font-bold text-gray-700 mb-3">Notes:</h4>
          <ul className="text-[11px] text-gray-500 list-disc pl-4 space-y-1">
            <li>Capture a clear image of the vehicle plate for accurate OCR extraction.</li>
            <li>Attendance records can be edited on the same day only.</li>
            <li>Cut-off time for late is 8:00 AM.</li>
            <li>All times are based on system time.</li>
          </ul>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <h4 className="text-xs font-bold text-gray-700 mb-3">Sample Image</h4>
          <div className="bg-gray-100 rounded-lg h-16 border border-gray-200 flex items-center justify-center overflow-hidden">
            <div className="bg-gray-800 text-white font-bold px-4 py-1 rounded shadow-sm text-sm tracking-widest">ABC 1234</div>
          </div>
          <div className="mt-2 text-[10px] text-gray-500 flex gap-2">
            <span>OCR Result:</span>
            <span className="text-green-600 font-medium">ABC 1234</span>
          </div>
        </div>
      </div>
    </div>
  )
}