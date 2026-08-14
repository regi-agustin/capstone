import { useEffect, useMemo, useState } from 'react'
import { FiTruck } from 'react-icons/fi'
import { fetchMyBookings, formatDate, formatPeso } from '../services/customerService.js'

export default function RentalHistory() {
  const [bookings, setBookings] = useState([])
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchMyBookings()
      .then(setBookings)
      .catch((e) => setError(e.message))
  }, [])

  const history = useMemo(
    () => bookings.filter((b) => b.status === 'Completed' || b.status === 'Cancelled' || b.status === 'Denied'),
    [bookings]
  )

  const filtered = filter === 'all' ? history : history.filter((b) => b.status.toLowerCase() === filter)

  const totalDays = history.reduce((sum, b) => sum + b.trip.days, 0)
  const totalSpent = history.filter((b) => b.status === 'Completed').reduce((sum, b) => sum + b.preBilling.estimatedTotal, 0)
  const completedCount = history.filter((b) => b.status === 'Completed').length
  const cancelledCount = history.filter((b) => b.status === 'Cancelled' || b.status === 'Denied').length
  const mostRented = (() => {
    const counts = {}
    for (const b of history) {
      const name = b.vehicleLabel?.model
      if (name) counts[name] = (counts[name] || 0) + 1
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || null
  })()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Rental History</h1>
      <p className="text-gray-500 mb-6">View your past rentals and details.</p>

      {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>}

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All Rentals
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            filter === 'completed' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Completed
        </button>
        <button
          onClick={() => setFilter('cancelled')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            filter === 'cancelled' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Cancelled
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Total Rentals</p>
          <p className="text-2xl font-bold text-gray-800">{history.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Total Days Rented</p>
          <p className="text-2xl font-bold text-gray-800">{totalDays}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Total Spent</p>
          <p className="text-2xl font-bold text-blue-600">{formatPeso(totalSpent)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Most Rented</p>
          <p className="text-lg font-bold text-gray-800">{mostRented ? mostRented[0] : '—'}</p>
          <p className="text-xs text-gray-400">{mostRented ? `Rented ${mostRented[1]} time${mostRented[1] > 1 ? 's' : ''}` : 'No rentals yet'}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <p className="text-sm text-gray-600">
            Showing {filtered.length} of {history.length} rentals ({completedCount} completed · {cancelledCount} cancelled)
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-500 text-sm">No rentals in this category</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((rental) => (
              <div key={rental.id} className="p-4 hover:bg-gray-50 transition">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="bg-blue-50 p-2 rounded-lg">
                      <FiTruck className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="text-sm text-gray-500">{rental.id}</p>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          rental.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {rental.status}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-800">{rental.vehicleLabel?.model || '—'}</h3>
                      <p className="text-sm text-gray-500">{rental.vehicleLabel?.type || ''}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                  <div>
                    <p className="text-xs text-gray-500">Pickup Date</p>
                    <p className="text-sm font-medium">{formatDate(rental.trip.pickupDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Return Date</p>
                    <p className="text-sm font-medium">{formatDate(rental.trip.returnDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Duration</p>
                    <p className="text-sm font-medium">{rental.trip.durationLabel}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total Price</p>
                    <p className="text-sm font-bold text-blue-600">{formatPeso(rental.preBilling.estimatedTotal)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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