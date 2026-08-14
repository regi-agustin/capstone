import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiTruck, FiClock, FiCheckCircle, FiXCircle, FiBell, FiArrowRight } from 'react-icons/fi'
import {
  fetchVehicles,
  fetchMyBookings,
  fetchNotifications,
  formatDate,
  formatPeso,
} from '../services/customerService.js'

export default function Dashboard({ user }) {
  const [vehicles, setVehicles] = useState([])
  const [bookings, setBookings] = useState([])
  const [notifications, setNotifications] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([fetchVehicles(), fetchMyBookings(), fetchNotifications()])
      .then(([v, b, n]) => {
        setVehicles(v)
        setBookings(b)
        setNotifications(n)
      })
      .catch((e) => setError(e.message))
  }, [])

  const availableVehicles = vehicles.filter((v) => v.status === 'Available').length
  const pending = bookings.filter((b) => b.status === 'Pending').length
  const active = bookings.filter((b) => b.status === 'On trip' || b.status === 'Confirmed').length
  const completed = bookings.filter((b) => b.status === 'Completed').length
  const latest = bookings[0] || null
  const recommended = vehicles.find((v) => v.status === 'Available' && v.type === 'SUV') || vehicles[0] || null

  const firstName = (user?.name || 'there').split(' ')[0]

  return (
    <div>
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-6 mb-6 text-white">
        <h1 className="text-2xl font-bold">Welcome, {firstName} 🚗</h1>
        <p className="text-blue-100 mt-1">Good day! Ready for another great journey with Hollydot?</p>
      </div>

      {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Available Vehicles</p>
              <p className="text-2xl font-bold text-gray-800">{availableVehicles}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg text-blue-600">
              <FiTruck className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1">vehicles available</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Reservations</p>
              <p className="text-2xl font-bold text-gray-800">{pending}</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg text-yellow-600">
              <FiClock className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1">waiting for approval</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Rental</p>
              <p className="text-2xl font-bold text-gray-800">{active}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg text-green-600">
              <FiCheckCircle className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1">ongoing rental</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Completed Rentals</p>
              <p className="text-2xl font-bold text-gray-800">{completed}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg text-purple-600">
              <FiXCircle className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1">total completed</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Latest Reservation</h2>
          {latest ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Reservation No.</p>
                <p className="font-medium text-gray-800">{latest.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Vehicle</p>
                <p className="font-medium text-gray-800">{latest.vehicleLabel?.model || 'To be assigned'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Pickup Date</p>
                  <p className="font-medium text-gray-800">{formatDate(latest.trip.pickupDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Return Date</p>
                  <p className="font-medium text-gray-800">{formatDate(latest.trip.returnDate)}</p>
                </div>
              </div>
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">{latest.status}</span>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No reservations yet. Browse vehicles to book your first trip!</p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Recommended For You</h2>
          {recommended ? (
            <div className="flex items-center space-x-4">
              <div className="bg-blue-50 p-4 rounded-xl">
                <FiTruck className="h-10 w-10 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-800">{recommended.model}</p>
                <p className="text-sm text-gray-500">
                  {recommended.type} · {recommended.seats} Seats · {formatPeso(recommended.dailyRate)}/day
                </p>
                <p className="text-xs text-gray-400 mt-1">Available now — rent it for your next trip</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No vehicles available at the moment.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Notifications</h2>
          {notifications.length === 0 ? (
            <p className="text-sm text-gray-500">No notifications yet.</p>
          ) : (
            <div className="space-y-4">
              {notifications.slice(0, 3).map((n) => (
                <div key={n.id} className="flex items-start space-x-3 pb-3 border-b border-gray-100 last:border-0">
                  <FiBell className={`h-5 w-5 mt-0.5 ${n.isRead ? 'text-gray-400' : 'text-green-500'}`} />
                  <div>
                    <p className="text-sm text-gray-800">{n.description || n.title}</p>
                    <p className="text-xs text-gray-400">{n.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link to="/browse" className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition">
              <div className="flex items-center space-x-3">
                <FiTruck className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-gray-800">Browse Vehicles</span>
              </div>
              <FiArrowRight className="h-4 w-4 text-blue-600" />
            </Link>
            <Link to="/reservations" className="w-full flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 rounded-lg transition">
              <div className="flex items-center space-x-3">
                <FiCheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium text-gray-800">My Reservations</span>
              </div>
              <FiArrowRight className="h-4 w-4 text-green-600" />
            </Link>
            <Link to="/history" className="w-full flex items-center justify-between p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition">
              <div className="flex items-center space-x-3">
                <FiClock className="h-5 w-5 text-purple-600" />
                <span className="font-medium text-gray-800">Rental History</span>
              </div>
              <FiArrowRight className="h-4 w-4 text-purple-600" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}