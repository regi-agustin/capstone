import { useEffect, useState } from 'react'
import { FiCheckCircle, FiClock, FiXCircle, FiInfo } from 'react-icons/fi'
import { fetchNotifications } from '../services/customerService.js'

const typeMeta = {
  reservation_confirmed: { icon: FiCheckCircle, color: 'text-green-500', type: 'reservation' },
  maintenance_due: { icon: FiClock, color: 'text-yellow-500', type: 'system' },
  attendance_rejected: { icon: FiXCircle, color: 'text-red-500', type: 'system' },
  system_alert: { icon: FiInfo, color: 'text-orange-500', type: 'system' },
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    fetchNotifications()
      .then(setNotifications)
      .catch((e) => setError(e.message))
  }, [])

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread' },
    { id: 'reservation', label: 'Reservations' },
    { id: 'system', label: 'System' },
  ]

  const filtered = notifications.filter((n) => {
    if (activeTab === 'all') return true
    if (activeTab === 'unread') return !n.isRead
    return (typeMeta[n.type]?.type || 'system') === activeTab
  })
  const display = showAll ? filtered : filtered.slice(0, 5)

  const summary = {
    total: notifications.length,
    unread: notifications.filter((n) => !n.isRead).length,
    reservations: notifications.filter((n) => (typeMeta[n.type]?.type || 'system') === 'reservation').length,
    system: notifications.filter((n) => (typeMeta[n.type]?.type || 'system') === 'system').length,
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Notifications</h1>
      <p className="text-gray-500 mb-6">Stay updated with the latest announcements and important updates.</p>

      {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>}

      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'all' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-800">Unread Notifications ({summary.unread})</h3>
          <p className="text-sm text-blue-600">These are the latest notifications you haven't read yet.</p>
        </div>
      )}

      {display.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center">
          <p className="text-gray-500">No notifications found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {display.map((notif) => {
            const meta = typeMeta[notif.type] || { icon: FiInfo, color: 'text-blue-500', type: 'system' }
            const Icon = meta.icon
            return (
              <div
                key={notif.id}
                className={`bg-white rounded-xl shadow-sm border p-4 ${!notif.isRead ? 'border-blue-200 bg-blue-50/30' : 'border-gray-100'}`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${notif.isRead ? 'bg-gray-100' : 'bg-blue-100'} flex-shrink-0`}>
                    <Icon className={`h-5 w-5 ${meta.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className={`font-semibold ${!notif.isRead ? 'text-gray-800' : 'text-gray-600'}`}>{notif.title}</h4>
                      {!notif.isRead && <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">NEW</span>}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{notif.description}</p>
                    <p className="text-xs text-gray-400 mt-2">{notif.timestamp}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {filtered.length > 5 && (
        <button onClick={() => setShowAll(!showAll)} className="mt-4 text-blue-600 hover:text-blue-700 font-medium text-sm">
          {showAll ? 'Show less' : `View all ${filtered.length} notifications`}
        </button>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Total Notifications</p>
          <p className="text-2xl font-bold text-gray-800">{summary.total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Unread</p>
          <p className="text-2xl font-bold text-yellow-600">{summary.unread}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Reservations</p>
          <p className="text-2xl font-bold text-blue-600">{summary.reservations}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-500">System</p>
          <p className="text-2xl font-bold text-purple-600">{summary.system}</p>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-800 mb-2">Need Assistance?</h3>
        <p className="text-sm text-gray-600">We're here to help you.</p>
        <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
          <div>📞 0912 345 6789</div>
          <div>✉️ support@hollydot.com</div>
          <div>🕐 Mon - Sat: 8:00 AM - 6:00 PM</div>
          <div>📍 Clark Freeport Zone, Pampanga</div>
        </div>
      </div>
    </div>
  )
}