import { useEffect, useMemo, useState } from 'react'
import { FiTruck } from 'react-icons/fi'
import { fetchVehicles, createBooking, fetchProfile, formatPeso } from '../services/customerService.js'
import SearchBar from '../../ro/components/SearchBar.jsx'
import StatusBadge from '../../ro/components/StatusBadge.jsx'
import Modal from '../../ro/components/Modal.jsx'
import VehiclePhotos from '../../ro/components/VehiclePhotos.jsx'
import { Icon } from '../../components/Icons.jsx'

export default function BrowseVehicles() {
  const [vehicles, setVehicles] = useState([])
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [seatsFilter, setSeatsFilter] = useState('All Capacity')
  const [priceRange, setPriceRange] = useState(6000)
  const [availableOnly, setAvailableOnly] = useState(false)
  const [booking, setBooking] = useState(null)
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({ clientName: '', contact: '', email: '', destination: '', pickupDate: '', pickupTime: '', returnDate: '', returnTime: '', passengers: 1, specialRequests: '' })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchVehicles()
      .then(setVehicles)
      .catch((e) => setError(e.message))
    fetchProfile()
      .then(setProfile)
      .catch(() => {})
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
    setForm({
      clientName: profile?.account?.name || '',
      contact: profile?.account?.contactNumber || '',
      email: profile?.account?.email || '',
      destination: '',
      pickupDate: today,
      pickupTime: '',
      returnDate: today,
      returnTime: '',
      passengers: Math.min(v.seats, 1),
      specialRequests: '',
    })
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
        client: {
          name: form.clientName,
          contact: form.contact,
          email: form.email,
        },
        trip: {
          destination: form.destination,
          pickupDate: form.pickupDate,
          pickupTime: form.pickupTime,
          returnDate: form.returnDate,
          returnTime: form.returnTime,
          passengers: Number(form.passengers),
          specialRequests: form.specialRequests,
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
      <div className="page-head">
        <div>
          <h1>Browse Vehicles</h1>
          <p className="page-head__sub">Find the perfect vehicle for your trip.</p>
        </div>
      </div>

      {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}
      {success && <div className="success-banner" style={{ marginBottom: 16 }}>{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 22, alignItems: 'start' }}>
        <aside>
          <section className="card" style={{ position: 'sticky', top: 16 }}>
            <div className="card__header">
              <div className="card__title">Filters</div>
            </div>
            <div className="card__body" style={{ display: 'grid', gap: 16 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="type-filter">Vehicle Type</label>
                <select
                  id="type-filter"
                  className="form-select"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option>All Types</option>
                  {types.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="seats-filter">Seating Capacity</label>
                <select
                  id="seats-filter"
                  className="form-select"
                  value={seatsFilter}
                  onChange={(e) => setSeatsFilter(e.target.value)}
                >
                  <option>All Capacity</option>
                  {seats.map((s) => (
                    <option key={s}>{s} Seats</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="price-range">Price Range (per day)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="muted" style={{ fontSize: 13 }}>₱1,000</span>
                  <input
                    id="price-range"
                    type="range"
                    min="1000"
                    max="6000"
                    step="500"
                    value={priceRange}
                    onChange={(e) => setPriceRange(Number(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <span className="muted" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>₱{priceRange.toLocaleString()}</span>
                </div>
              </div>

              <label className="toggle-wrap" style={{ gap: 10 }}>
                <input
                  type="checkbox"
                  checked={availableOnly}
                  onChange={(e) => setAvailableOnly(e.target.checked)}
                />
                <span>Available Only</span>
              </label>
            </div>
          </section>
        </aside>

        <div>
          <section className="card" style={{ marginBottom: 16 }}>
            <div className="card__body">
              <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search vehicles…" />
            </div>
          </section>

          <p className="muted" style={{ marginBottom: 14, fontSize: 13 }}>
            {filtered.length} vehicle{filtered.length !== 1 && 's'} available
          </p>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <FiTruck size={36} />
              <div className="empty-state__title">No vehicles match your filters</div>
              <div className="empty-state__sub">Try adjusting your filters or search terms.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {filtered.map((vehicle) => (
                <section key={vehicle.id} className="card">
                  <div className="card__body">
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        {vehicle.photoUrl || (vehicle.images && vehicle.images.length) ? (
                          <VehiclePhotos vehicle={vehicle} />
                        ) : (
                          <Icon.car width={20} height={20} />
                        )}
                        <div style={{ minWidth: 0 }}>
                          <h3 style={{ fontSize: 15 }}>{vehicle.model}</h3>
                          <div className="cell-sub">{vehicle.type}</div>
                          <div className="cell-sub">{vehicle.seats} Seats · {vehicle.plate}</div>
                        </div>
                      </div>
                      <StatusBadge status={vehicle.status} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
                      <p style={{ fontWeight: 700, fontSize: 18, color: 'var(--primary-dark)' }}>
                        {formatPeso(vehicle.dailyRate)} <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-2)' }}>/ day</span>
                      </p>
                      <button
                        onClick={() => openBooking(vehicle)}
                        disabled={vehicle.status !== 'Available'}
                        className="btn btn--primary btn--sm"
                      >
                        Rent Now
                      </button>
                    </div>
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>

      {booking && (
        <Modal
          open
          onClose={() => setBooking(null)}
          title={`Rent ${booking.model}`}
          subtitle={`${booking.type} · ${booking.seats} Seats · ${formatPeso(booking.dailyRate)}/day`}
        >
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label" htmlFor="bk-client-name">Client Name</label>
                <input
                  id="bk-client-name"
                  type="text"
                  required
                  placeholder="Enter full name"
                  value={form.clientName}
                  onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="bk-contact">Contact Number</label>
                <input
                  id="bk-contact"
                  type="tel"
                  required
                  placeholder="e.g., 0917 123 4567"
                  value={form.contact}
                  onChange={(e) => setForm({ ...form, contact: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-group full">
                <label className="form-label" htmlFor="bk-email">Email Address</label>
                <input
                  id="bk-email"
                  type="email"
                  required
                  placeholder="e.g., you@email.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-group full">
                <label className="form-label" htmlFor="bk-destination">Destination</label>
                <input
                  id="bk-destination"
                  type="text"
                  required
                  placeholder="e.g., Clark Freeport Zone, Pampanga"
                  value={form.destination}
                  onChange={(e) => setForm({ ...form, destination: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="bk-pickup">Pickup Date</label>
                <input
                  id="bk-pickup"
                  type="date"
                  required
                  value={form.pickupDate}
                  onChange={(e) => setForm({ ...form, pickupDate: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="bk-pickup-time">Pickup Time</label>
                <input
                  id="bk-pickup-time"
                  type="time"
                  placeholder="e.g., 09:00 AM"
                  value={form.pickupTime}
                  onChange={(e) => setForm({ ...form, pickupTime: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="bk-return">Return Date</label>
                <input
                  id="bk-return"
                  type="date"
                  required
                  value={form.returnDate}
                  onChange={(e) => setForm({ ...form, returnDate: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="bk-return-time">Return Time</label>
                <input
                  id="bk-return-time"
                  type="time"
                  placeholder="e.g., 06:00 PM"
                  value={form.returnTime}
                  onChange={(e) => setForm({ ...form, returnTime: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-group full">
                <label className="form-label" htmlFor="bk-passengers">Passengers</label>
                <input
                  id="bk-passengers"
                  type="number"
                  min="1"
                  max={booking.seats}
                  value={form.passengers}
                  onChange={(e) => setForm({ ...form, passengers: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-group full">
                <label className="form-label" htmlFor="bk-special-requests">Special Requests <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>(optional)</span></label>
                <textarea
                  id="bk-special-requests"
                  rows="3"
                  placeholder="Any special requests or notes for this trip"
                  value={form.specialRequests}
                  onChange={(e) => setForm({ ...form, specialRequests: e.target.value })}
                  className="form-textarea"
                />
              </div>
            </div>

            <p className="form-hint" style={{ marginTop: 14 }}>
              Your reservation will be submitted for approval. An administrator will confirm your booking.
            </p>

            <div className="modal__footer" style={{ marginTop: 16 }}>
              <button type="button" className="btn btn--ghost" onClick={() => setBooking(null)}>Cancel</button>
              <button type="submit" className="btn btn--primary" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit Reservation'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}