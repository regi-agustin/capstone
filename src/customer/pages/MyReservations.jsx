import { useEffect, useMemo, useState } from 'react'
import { FiMapPin } from 'react-icons/fi'
import { fetchMyBookings, formatDate, formatTime, formatPeso } from '../services/customerService.js'

const statusMeta = {
  Pending: 'bg-yellow-100 text-yellow-700',
  Denied: 'bg-red-100 text-red-700',
  Confirmed: 'bg-green-100 text-green-700',
  'On trip': 'bg-blue-100 text-blue-700',
  Completed: 'bg-gray-100 text-gray-600',
  Cancelled: 'bg-red-100 text-red-700',
}

const tabs = [
  { id: 'pending', label: 'Pending', statuses: ['Pending'] },
  { id: 'approved', label: 'Approved', statuses: ['Confirmed'] },
  { id: 'ongoing', label: 'Ongoing', statuses: ['On trip'] },
  { id: 'completed', label: 'Completed', statuses: ['Completed'] },
  { id: 'cancelled', label: 'Cancelled', statuses: ['Cancelled', 'Denied'] },
]

export default function MyReservations() {
  const [bookings, setBookings] = useState([])
  const [activeTab, setActiveTab] = useState('pending')
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    fetchMyBookings()
      .then(setBookings)
      .catch((e) => setError(e.message))
  }, [])

  const grouped = useMemo(() => {
    const map = {}
    for (const t of tabs) map[t.id] = bookings.filter((b) => t.statuses.includes(b.status))
    return map
  }, [bookings])

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">My Reservations</h1>
      <p className="text-gray-500 mb-6">Manage and track all your vehicle reservations.</p>

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
            {tab.label} ({grouped[tab.id].length})
          </button>
        ))}
      </div>

      {grouped[activeTab].length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <p className="text-gray-500">No reservations in this category</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped[activeTab].map((res) => (
            <div key={res.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">{res.id}</p>
                  <h3 className="font-semibold text-gray-800">{res.vehicleLabel?.model || 'Vehicle to be assigned'}</h3>
                </div>
                <span className={`px-3 py-1 text-xs rounded-full ${statusMeta[res.status] || 'bg-gray-100 text-gray-600'}`}>
                  {res.status}
                </span>
              </div>

              {res.status === 'Denied' && res.denialReason && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <strong>Reason:</strong> {res.denialReason}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <p className="text-xs text-gray-500">Pickup Date & Time</p>
                  <p className="text-sm font-medium">
                    {formatDate(res.trip.pickupDate)} · {formatTime(res.trip.pickupTime)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Return Date & Time</p>
                  <p className="text-sm font-medium">
                    {formatDate(res.trip.returnDate)} · {formatTime(res.trip.returnTime)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <div>
                  <p className="text-xs text-gray-500">Destination</p>
                  <p className="text-sm font-medium flex items-center">
                    <FiMapPin className="h-3 w-3 mr-1" /> {res.trip.destination || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Estimated Price</p>
                  <p className="text-sm font-bold text-blue-600">{formatPeso(res.preBilling.estimatedTotal)}</p>
                </div>
              </div>

              <button
                onClick={() => setExpanded(expanded === res.id ? null : res.id)}
                className="mt-3 w-full py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition font-medium"
              >
                {expanded === res.id ? 'Hide Details' : 'View Details'}
              </button>

              {expanded === res.id && (
                <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Duration</p>
                    <p className="font-medium">{res.trip.durationLabel}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Passengers</p>
                    <p className="font-medium">{res.trip.passengers || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Vehicle Type</p>
                    <p className="font-medium">{res.vehicleLabel?.type || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Base Rate</p>
                    <p className="font-medium">{formatPeso(res.preBilling.baseRate)}/day</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">Special Requests</p>
                    <p className="font-medium">{res.trip.specialRequests || 'None'}</p>
                  </div>
                  {res.driver && (
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500">Assigned Driver</p>
                      <p className="font-medium">{res.driver.name}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
          <h3 className="font-semibold text-gray-800 mb-2">Reservation Tips</h3>
          <ul className="space-y-1 text-sm text-gray-600">
            <li>• Reservations are subject to administrator approval.</li>
            <li>• You will receive a notification once your reservation status changes.</li>
            <li>• Ensure your contact information is up to date.</li>
          </ul>
        </div>

        <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-2">Rental Requirements</h3>
          <ul className="space-y-1 text-sm text-gray-600">
            <li>• Valid driver's license</li>
            <li>• Valid government-issued ID</li>
            <li>• Additional documents may be required</li>
          </ul>
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