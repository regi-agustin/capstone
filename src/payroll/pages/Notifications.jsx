import { useEffect, useMemo, useState } from 'react'
import { Search, Bell, Mail, AlertCircle, Calendar, CheckCircle, XCircle, FileText, Users, Settings, Truck, DollarSign, Filter, ChevronDown, ChevronRight, Eye } from 'lucide-react'
import { fetchNotifications, markAllNotificationsRead } from '../services/payrollService.js'

const TYPE_LABELS = {
  attendance_verified: 'Driver Attendance',
  attendance_rejected: 'Driver Attendance',
  payroll_released: 'Payroll',
  vehicle_updated: 'Vehicle',
  default: 'System',
}

const TYPE_ICONS = {
  CheckCircle: [CheckCircle, 'text-green-500'],
  XCircle: [XCircle, 'text-red-500'],
  DollarSign: [DollarSign, 'text-blue-500'],
  Truck: [Truck, 'text-orange-500'],
  default: [Bell, 'text-gray-500'],
}

function priorityOf(type) {
  if (type === 'attendance_rejected') return { label: 'High', cls: 'bg-red-100 text-red-700' }
  if (type === 'attendance_verified' || type === 'vehicle_updated') return { label: 'Medium', cls: 'bg-yellow-100 text-yellow-700' }
  return { label: 'Low', cls: 'bg-green-100 text-green-700' }
}

function isThisWeek(ts) {
  const d = new Date(ts)
  if (isNaN(d.getTime())) return false
  return Date.now() - d.getTime() < 7 * 86400000
}

export default function Notifications() {
  const [notifs, setNotifs] = useState([])
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [msg, setMsg] = useState(null)
  const [error, setError] = useState('')

  const load = () =>
    fetchNotifications()
      .then(setNotifs)
      .catch((e) => setError(e.message))

  useEffect(() => {
    load()
  }, [])

  const unreadCount = notifs.filter((n) => !n.isRead).length
  const highCount = notifs.filter((n) => priorityOf(n.type).label === 'High').length
  const weekCount = notifs.filter((n) => isThisWeek(n.timestamp)).length

  const filtered = useMemo(
    () =>
      notifs.filter((n) => {
        const matchesTab =
          tab === 'all' ? true : tab === 'unread' ? !n.isRead : n.isRead
        const q = search.toLowerCase()
        const matchesSearch = !q || (n.title || '').toLowerCase().includes(q) || (n.description || '').toLowerCase().includes(q)
        return matchesTab && matchesSearch
      }),
    [notifs, tab, search]
  )

  async function handleMarkAll() {
    try {
      await markAllNotificationsRead()
      setMsg('All notifications marked as read.')
      await load()
      setTimeout(() => setMsg(null), 3000)
    } catch (e) {
      setMsg(e.message)
    }
  }

  return (
    <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-200px)] pr-2 pb-10">
      <h2 className="text-xl font-bold text-gray-800">Notifications</h2>
      <p className="text-sm text-gray-500 -mt-4">View and manage system notifications and alerts.</p>

      {msg && <div className="text-sm px-4 py-2.5 rounded-lg bg-green-50 text-green-700 border border-green-200">{msg}</div>}
      {error && <div className="text-sm px-4 py-2.5 rounded-lg bg-red-50 text-red-700 border border-red-200">{error}</div>}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-3 px-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-6">
          {[
            { key: 'all', label: 'All', count: notifs.length, cls: 'bg-blue-500 text-white' },
            { key: 'unread', label: 'Unread', count: unreadCount, cls: 'bg-red-500 text-white' },
            { key: 'read', label: 'Read', count: notifs.length - unreadCount, cls: 'bg-gray-300 text-gray-700' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 font-medium text-sm pb-3 -mb-3.5 border-b-2 transition-colors ${
                tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.label} <span className={`text-[10px] px-2 py-0.5 rounded-full ml-1 ${t.cls}`}>{t.count}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notifications..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button onClick={handleMarkAll} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 flex items-center gap-2 whitespace-nowrap">
            <CheckCircle size={16} /> Mark all as read
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 flex items-center gap-2">
            <Filter size={16} /> Filter <ChevronDown size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-lg border border-blue-200 flex items-center justify-center text-blue-500 shadow-sm"><Bell size={24} /></div>
          <div><div className="text-sm font-bold text-gray-800">Total Notifications</div><div className="text-2xl font-bold text-blue-600">{notifs.length}</div><div className="text-xs text-gray-500">All time</div></div>
        </div>
        <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-lg border border-green-200 flex items-center justify-center text-green-500 shadow-sm"><Mail size={24} /></div>
          <div><div className="text-sm font-bold text-gray-800">Unread</div><div className="text-2xl font-bold text-green-600">{unreadCount}</div><div className="text-xs text-gray-500">Requires your attention</div></div>
        </div>
        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-lg border border-orange-200 flex items-center justify-center text-orange-500 shadow-sm"><AlertCircle size={24} /></div>
          <div><div className="text-sm font-bold text-gray-800">High Priority</div><div className="text-2xl font-bold text-orange-600">{highCount}</div><div className="text-xs text-gray-500">Needs immediate action</div></div>
        </div>
        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-lg border border-purple-200 flex items-center justify-center text-purple-500 shadow-sm"><Calendar size={24} /></div>
          <div><div className="text-sm font-bold text-gray-800">This Week</div><div className="text-2xl font-bold text-purple-600">{weekCount}</div><div className="text-xs text-gray-500">Last 7 days</div></div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-center w-8">#</th>
                <th className="px-6 py-3 w-32">Type</th>
                <th className="px-6 py-3">Title</th>
                <th className="px-6 py-3">Message</th>
                <th className="px-6 py-3 whitespace-nowrap">Date &amp; Time</th>
                <th className="px-6 py-3 text-center">Priority</th>
                <th className="px-6 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400 text-sm">No notifications found.</td></tr>
              )}
              {filtered.map((n, idx) => {
                const iconKey = n.icon || 'default'
                const [IconComp, iconColor] = TYPE_ICONS[iconKey] || TYPE_ICONS.default
                const pri = priorityOf(n.type)
                return (
                  <tr key={n.id} className="hover:bg-blue-50/30">
                    <td className="px-6 py-4 text-gray-600 text-center">{idx + 1}</td>
                    <td className="px-6 py-4 flex items-center gap-2 text-xs font-medium text-gray-700">
                      <IconComp size={16} className={iconColor} />
                      {TYPE_LABELS[n.type] || TYPE_LABELS.default}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-800 text-sm">{n.title}</td>
                    <td className="px-6 py-4 text-gray-500 text-xs max-w-xs leading-relaxed">{n.description}</td>
                    <td className="px-6 py-4 text-gray-500 text-xs whitespace-nowrap">{n.timestamp}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-medium ${pri.cls}`}>{pri.label}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-medium ${n.isRead ? 'bg-gray-100 text-gray-700' : 'bg-blue-100 text-blue-700'}`}>
                        {n.isRead ? 'Read' : 'Unread'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center text-xs text-gray-500 bg-white">
          <span>Showing {filtered.length} of {notifs.length} notifications</span>
          <div className="flex items-center gap-1">
            <button className="p-1 border rounded hover:bg-gray-50 text-gray-400"><ChevronRight size={14} className="rotate-180" /></button>
            <button className="px-3 py-1 border rounded bg-blue-600 text-white text-[10px] font-medium">1</button>
            <button className="p-1 border rounded hover:bg-gray-50"><ChevronRight size={14} /></button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50/30 p-5 rounded-xl border border-blue-100 shadow-sm">
          <h4 className="text-xs font-bold text-gray-700 mb-3">Notification Types</h4>
          <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-[11px]">
            <div className="flex items-center gap-3"><div className="w-6 h-6 bg-green-100 rounded flex items-center justify-center text-green-600"><CheckCircle size={14} /></div><div><span className="font-medium text-gray-700 block">Driver Attendance</span><span className="text-gray-500">OCR verification, mismatches</span></div></div>
            <div className="flex items-center gap-3"><div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center text-blue-600"><DollarSign size={14} /></div><div><span className="font-medium text-gray-700 block">Payroll</span><span className="text-gray-500">Cut-off reminders, updates</span></div></div>
            <div className="flex items-center gap-3"><div className="w-6 h-6 bg-green-600 rounded flex items-center justify-center text-white"><Users size={14} /></div><div><span className="font-medium text-gray-700 block">Driver Records</span><span className="text-gray-500">Driver information updates</span></div></div>
            <div className="flex items-center gap-3"><div className="w-6 h-6 bg-orange-100 rounded flex items-center justify-center text-orange-600"><Truck size={14} /></div><div><span className="font-medium text-gray-700 block">Vehicle</span><span className="text-gray-500">Vehicle / fleet updates</span></div></div>
            <div className="flex items-center gap-3"><div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center text-gray-600"><Settings size={14} /></div><div><span className="font-medium text-gray-700 block">System</span><span className="text-gray-500">System announcements</span></div></div>
          </div>
        </div>

        <div className="bg-blue-50/30 p-5 rounded-xl border border-blue-100 shadow-sm">
          <h4 className="text-xs font-bold text-gray-700 mb-3">Notes:</h4>
          <ul className="text-[11px] text-gray-600 list-disc pl-4 space-y-1">
            <li>Unread notifications remain in your list until you mark them as read.</li>
            <li>High priority notifications require immediate attention.</li>
            <li>All dates and times are based on system time.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}