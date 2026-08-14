import { useEffect, useState } from 'react'
import {
  Calendar,
  Users,
  FileText,
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  ChevronRight,
  Bell,
  UserCheck,
  Truck,
  DollarSign,
} from 'lucide-react'
import {
  fetchPayrollRecords,
  fetchDrivers,
  fetchAttendance,
  fetchNotifications,
  statusLabel,
  formatDateTime,
  formatPeso,
} from '../services/payrollService.js'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function cutoffLabel(date = new Date()) {
  const y = date.getFullYear()
  const m = MONTHS[date.getMonth()]
  const last = new Date(y, date.getMonth() + 1, 0).getDate()
  return date.getDate() <= 15 ? `${m} 1 – 15, ${y}` : `${m} 16 – ${last}, ${y}`
}

function activityIcon(type) {
  switch (type) {
    case 'attendance_verified':
      return <CheckCircle size={16} className="text-green-600" />
    case 'attendance_rejected':
      return <XCircle size={16} className="text-red-500" />
    case 'payroll_released':
      return <DollarSign size={16} className="text-blue-500" />
    case 'vehicle_updated':
      return <Truck size={16} className="text-orange-500" />
    default:
      return <Bell size={16} className="text-gray-400" />
  }
}

export default function Dashboard() {
  const [payroll, setPayroll] = useState([])
  const [drivers, setDrivers] = useState([])
  const [attendance, setAttendance] = useState([])
  const [notifications, setNotifications] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([fetchPayrollRecords(), fetchDrivers(), fetchAttendance(), fetchNotifications()])
      .then(([p, d, a, n]) => {
        setPayroll(p)
        setDrivers(d)
        setAttendance(a)
        setNotifications(n)
      })
      .catch((e) => setError(e.message))
  }, [])

  const month = new Date().toISOString().slice(0, 7)
  const cutoff = payroll.filter((r) => (r.date || '').startsWith(month))
  const totalReceivable = cutoff.reduce((s, r) => s + r.netAmount, 0)
  const statusCounts = cutoff.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1
    return acc
  }, {})
  const total = cutoff.length
  const pct = (c) => (total > 0 ? ((c / total) * 100).toFixed(2) : '0.00')

  const verified = attendance.filter((a) => a.verificationStatus === 'Verified').length
  const pendingA = attendance.filter((a) => a.verificationStatus === 'Pending').length
  const rejected = attendance.filter((a) => a.verificationStatus === 'Rejected').length
  const missing = Math.max(0, drivers.length - attendance.length)
  const presentTotal = drivers.length || attendance.length

  const recent = notifications.slice(0, 4)
  const announcements = notifications.filter(
    (n) => n.type !== 'attendance_verified' && n.type !== 'attendance_rejected'
  ).slice(0, 2)

  const attendancePct = (c) => (presentTotal > 0 ? ((c / presentTotal) * 100).toFixed(2) : '0.00')

  if (error) {
    return <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">{error}</div>
  }

  return (
    <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-200px)] pr-2 pb-10">
      <h3 className="text-lg font-bold text-gray-800">Payroll Overview</h3>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600"><Calendar size={24} /></div>
          <div>
            <div className="text-xs text-gray-500 font-medium">Current Cut-Off Period</div>
            <div className="font-bold text-gray-800 text-base">{cutoffLabel()}</div>
            <div className="text-xs text-gray-400">This period</div>
          </div>
        </div>
        <div className="bg-green-50/50 p-4 rounded-xl border border-green-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600"><Users size={24} /></div>
          <div>
            <div className="text-xs text-gray-500 font-medium">Drivers with Payroll Records</div>
            <div className="font-bold text-gray-800 text-2xl">{cutoff.length}</div>
            <div className="text-xs text-gray-400">Total Drivers: {drivers.length}</div>
          </div>
        </div>
        <div className="bg-yellow-50/50 p-4 rounded-xl border border-yellow-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600"><FileText size={24} /></div>
          <div>
            <div className="text-xs text-gray-500 font-medium">Payroll Records for Review</div>
            <div className="font-bold text-gray-800 text-2xl">{statusCounts.Pending || 0}</div>
            <div className="text-xs text-gray-400">Needs your attention</div>
          </div>
        </div>
        <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600"><CreditCard size={24} /></div>
          <div>
            <div className="text-xs text-gray-500 font-medium">Total Receivable</div>
            <div className="font-bold text-purple-600 text-xl">{formatPeso(totalReceivable)}</div>
            <div className="text-xs text-gray-400">For this cut-off</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm col-span-1">
          <h4 className="font-semibold text-gray-800 mb-6">Payroll Status</h4>
          <div className="flex items-center justify-between">
            <div className="relative w-28 h-28 rounded-full border-8 border-yellow-400 flex items-center justify-center border-r-blue-500 border-b-green-500 border-l-red-400">
              <div className="bg-white rounded-full w-16 h-16 flex flex-col items-center justify-center shadow-sm">
                <span className="text-xl font-bold text-gray-800">{total}</span>
                <span className="text-[10px] text-gray-500">Records</span>
              </div>
            </div>
            <div className="space-y-3 text-xs flex-1 pl-4">
              <div className="flex justify-between"><span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span> For Review</span> <span className="text-gray-600">{statusCounts.Pending || 0} ({pct(statusCounts.Pending || 0)}%)</span></div>
              <div className="flex justify-between"><span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Completed</span> <span className="text-gray-600">{statusCounts.Paid || 0} ({pct(statusCounts.Paid || 0)}%)</span></div>
              <div className="flex justify-between"><span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-400"></span> Unpaid</span> <span className="text-gray-600">{statusCounts.Unpaid || 0} ({pct(statusCounts.Unpaid || 0)}%)</span></div>
            </div>
          </div>
          <div className="mt-4 text-center border-t pt-3 border-gray-100">
            <a href="#/payroll" className="text-blue-600 text-xs font-medium hover:underline inline-flex items-center">View all payroll records <ChevronRight size={14} className="ml-1" /></a>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm col-span-1">
          <h4 className="font-semibold text-gray-800 mb-4">Driver Attendance Summary</h4>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center p-2 rounded hover:bg-gray-50"><span className="flex items-center gap-2 text-green-600"><CheckCircle size={18} className="text-green-500" /> Verified Attendance</span> <span className="text-gray-700 font-medium">{verified} ({attendancePct(verified)}%)</span></div>
            <div className="flex justify-between items-center p-2 rounded hover:bg-gray-50"><span className="flex items-center gap-2 text-yellow-500"><Clock size={18} className="text-yellow-500" /> Pending Verification</span> <span className="text-gray-700 font-medium">{pendingA} ({attendancePct(pendingA)}%)</span></div>
            <div className="flex justify-between items-center p-2 rounded hover:bg-gray-50"><span className="flex items-center gap-2 text-red-500"><XCircle size={18} className="text-red-500" /> Rejected Attendance</span> <span className="text-gray-700 font-medium">{rejected} ({attendancePct(rejected)}%)</span></div>
            <div className="flex justify-between items-center p-2 rounded hover:bg-gray-50"><span className="flex items-center gap-2 text-gray-400"><AlertCircle size={18} className="text-gray-400" /> Missing Records</span> <span className="text-gray-700 font-medium">{missing} ({attendancePct(missing)}%)</span></div>
          </div>
          <div className="mt-4 text-center border-t pt-3 border-gray-100">
            <a href="#/attendance" className="text-blue-600 text-xs font-medium hover:underline inline-flex items-center">View attendance records <ChevronRight size={14} className="ml-1" /></a>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm col-span-1">
          <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Calendar size={18} className="text-blue-500" /> Upcoming Reminders</h4>
          <div className="mb-6 pb-6 border-b border-gray-100">
            <div className="font-semibold text-gray-700 text-sm">Next Cut-Off Period</div>
            <div className="text-blue-600 font-bold text-lg">{cutoffLabel(new Date(Date.now() + 16 * 86400000))}</div>
            <div className="text-xs text-gray-500 mt-1">Starts after the current cut-off</div>
          </div>
          <div>
            <div className="font-semibold text-gray-700 text-sm">Payroll Due Date</div>
            <div className="text-blue-600 font-bold text-lg">End of cut-off day</div>
            <div className="text-xs text-gray-500 mt-1">Submit records before cut-off closes</div>
          </div>
          <div className="mt-6 text-center border-t pt-3 border-gray-100">
            <a href="#/payroll" className="text-blue-600 text-xs font-medium hover:underline inline-flex items-center">View payroll records <ChevronRight size={14} className="ml-1" /></a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm col-span-2">
          <h4 className="font-semibold text-gray-800 mb-4">Recent Activity</h4>
          {recent.length === 0 ? (
            <p className="text-sm text-gray-400">No recent activity yet.</p>
          ) : (
            <div className="space-y-4 text-sm">
              {recent.map((n, i) => (
                <div key={i} className="flex justify-between items-start border-b pb-3 border-gray-100">
                  <div>
                    <div className="font-medium text-gray-800 flex items-center gap-2">
                      {activityIcon(n.type)} {n.title}
                    </div>
                    <div className="text-gray-500">{n.description}</div>
                  </div>
                  <div className="text-xs text-gray-400 text-right whitespace-nowrap pl-4">{formatDateTime(n.timestamp)}</div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 text-center border-t pt-3 border-gray-100">
            <a href="#/notifications" className="text-blue-600 text-xs font-medium hover:underline inline-flex items-center">View all notifications <ChevronRight size={14} className="ml-1" /></a>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm col-span-1">
          <h4 className="font-semibold text-gray-800 mb-4">System Announcements</h4>
          {announcements.length === 0 ? (
            <div className="space-y-4">
              <div className="pb-4 border-b border-gray-100">
                <div className="font-medium text-gray-800 text-sm flex items-start gap-2"><Bell size={16} className="text-blue-500 mt-0.5" /> System Maintenance Schedule</div>
                <div className="text-xs text-gray-500 mt-1">Scheduled maintenance is announced here when it happens.</div>
                <div className="text-xs text-gray-400 mt-2">FleetOps</div>
              </div>
              <div>
                <div className="font-medium text-gray-800 text-sm flex items-start gap-2"><Bell size={16} className="text-blue-500 mt-0.5" /> New Feature Update</div>
                <div className="text-xs text-gray-500 mt-1">Payroll and attendance updates are announced here.</div>
                <div className="text-xs text-gray-400 mt-2">FleetOps</div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map((n, i) => (
                <div key={i} className={i < announcements.length - 1 ? 'pb-4 border-b border-gray-100' : ''}>
                  <div className="font-medium text-gray-800 text-sm flex items-start gap-2">
                    <Bell size={16} className="text-blue-500 mt-0.5" /> {n.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{n.description}</div>
                  <div className="text-xs text-gray-400 mt-2">{formatDateTime(n.timestamp)}</div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 text-center border-t pt-3 border-gray-100">
            <a href="#/notifications" className="text-blue-600 text-xs font-medium hover:underline inline-flex items-center">View all announcements <ChevronRight size={14} className="ml-1" /></a>
          </div>
        </div>
      </div>
    </div>
  )
}