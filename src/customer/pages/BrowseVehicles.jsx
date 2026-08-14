import { useEffect, useMemo, useState } from 'react'
import { FiSearch, FiStar, FiX, FiTruck } from 'react-icons/fi'
import { fetchVehicles, createBooking, formatPeso } from '../services/customerService.js'

const emojis = { MPV: '🚙', SUV: '🚘', Sedan: '🚗', Van: '🚐' }

export default function BrowseVehicles() {
  const [vehicles, setVehicles] = useState([])
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [seatsFilter, setSeatsFilter] = useState('All Capacity')
  const [priceRange, setPriceRange] = useState(6000)
  const [availableOnly, setAvailableOnly] = useState(false)
  const [booking, setBooking] = useState(null)
  const [form, setForm] = useState({ destination: '', pickupDate: '', returnDate: '', passengers: 1 })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchVehicles()
      .then(setVehicles)
      .catch((e) => setError(e.message))
  }, [])

  const filtered = useMemo(() => {
    return vehicles.filter((v) => {
      if (searchTerm && !`${v.model} ${v.type}`.toLowerCase().includes(searchTerm.toLowerCase())) return false
      if (typeFilter !== 'All Types' && v.type !== typeFilter) return false
      if (seatsFilter !== 'All Capacity' && v.seats !== Number(seatsFilter)) return false
      if (v.dailyRate > priceRange) return false
      if (availableOnly && v.status !== 'Available') return false
      return true
    })
  }, [vehicles, searchTerm, typeFilter, seatsFilter, priceRange, availableOnly])

  const types = [...new Set(vehicles.map((v) => v.type))].sort()
  const seats = [...new Set(vehicles.map((v) => v.seats))].sort()

  function openBooking(v) {
    setBooking(v)
    setSuccess('')
    const today = new Date().toISOString().slice(0, 10)
    setForm({ destination: '', pickupDate: today, returnDate: today, passengers: Math.min(v.seats, 1) })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const days = Math.max(1, Math.ceil((new Date(form.returnDate) - new Date(form.pickupDate)) / 86400000))
      const estimatedTotal = booking.dailyRate * days
      await createBooking({
        vehicleId: booking.id,
        client: {},
        trip: {
          destination: form.destination,
          pickupDate: form.pickupDate,
          returnDate: form.returnDate,
          passengers: Number(form.passengers),
        },
        estimatedTotal,
      })
      setSuccess('Reservation submitted! It is now pending approval. Check My Reservations.')
      setBooking(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Browse Vehicles</h1>
        <p className="text-gray-500">Find the perfect vehicle for your trip</p>
      </div>

      {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>}
      {success && <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm">{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 sticky top-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Filters</h3>
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 block mb-2">Vehicle Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option>All Types</option>
                {types.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 block mb-2">Seating Capacity</label>
              <select
                value={seatsFilter}
                onChange={(e) => setSeatsFilter(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option>All Capacity</option>
                {seats.map((s) => (
                  <option key={s}>{s} Seats</option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 block mb-2">Price Range (per day)</label>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">₱1,000</span>
                <input
                  type="range"
                  min="1000"
                  max="6000"
                  step="500"
                  value={priceRange}
                  onChange={(e) => setPriceRange(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm text-gray-500">₱{priceRange.toLocaleString()}</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={availableOnly}
                  onChange={(e) => setAvailableOnly(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm text-gray-700">Available Only</span>
              </label>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 mb-6">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search vehicles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <p className="text-sm text-gray-500 mb-4">{filtered.length} vehicle{filtered.length !== 1 && 's'} available</p>

          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center">
              <p className="text-gray-500">No vehicles match your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((vehicle) => (
                <div key={vehicle.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-4xl">{emojis[vehicle.type] || '🚗'}</div>
                      <div>
                        <h3 className="font-semibold text-gray-800">{vehicle.model}</h3>
                        <p className="text-sm text-gray-500">{vehicle.type}</p>
                        <p className="text-sm text-gray-500">{vehicle.seats} Seats · {vehicle.plate}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      vehicle.status === 'Available' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {vehicle.status}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-lg font-bold text-blue-600">
                      {formatPeso(vehicle.dailyRate)} <span className="text-sm font-normal text-gray-500">/ day</span>
                    </p>
                    <button
                      onClick={() => openBooking(vehicle)}
                      disabled={vehicle.status !== 'Available'}
                      className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Rent Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {booking && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-50 p-3 rounded-xl">
                  <FiTruck className="h-7 w-7 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">{booking.model}</h3>
                  <p className="text-sm text-gray-500">
                    {booking.type} · {booking.seats} Seats · {formatPeso(booking.dailyRate)}/day
                  </p>
                </div>
              </div>
              <button onClick={() => setBooking(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <FiX className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Destination</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Clark Freeport Zone, Pampanga"
                  value={form.destination}
                  onChange={(e) => setForm({ ...form, destination: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Pickup Date</label>
                  <input
                    type="date"
                    required
                    value={form.pickupDate}
                    onChange={(e) => setForm({ ...form, pickupDate: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Return Date</label>
                  <input
                    type="date"
                    required
                    value={form.returnDate}
                    onChange={(e) => setForm({ ...form, returnDate: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Passengers</label>
                <input
                  type="number"
                  min="1"
                  max={booking.seats}
                  value={form.passengers}
                  onChange={(e) => setForm({ ...form, passengers: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <p className="text-xs text-gray-500">
                Your reservation will be submitted for approval. An administrator will confirm your booking.
              </p>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Reservation'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}