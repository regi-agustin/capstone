import { useEffect, useMemo, useState } from 'react'
import { FiTruck, FiPlus } from 'react-icons/fi'
import { fetchVehicles, fetchMyBookings, fetchProfile, formatPeso } from '../services/customerService.js'
import SearchBar from '../../ro/components/SearchBar.jsx'
import StatusBadge from '../../ro/components/StatusBadge.jsx'
import VehiclePhotos from '../../ro/components/VehiclePhotos.jsx'
import NewBookingModal from '../components/NewBookingModal.jsx'
import { Icon } from '../../components/Icons.jsx'

export default function BrowseVehicles() {
  const [vehicles, setVehicles] = useState([])
  const [bookings, setBookings] = useState([])
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [seatsFilter, setSeatsFilter] = useState('All Capacity')
  const [priceRange, setPriceRange] = useState(6000)
  const [availableOnly, setAvailableOnly] = useState(false)
  const [profile, setProfile] = useState(null)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [initialVehicleId, setInitialVehicleId] = useState(null)
  const [banner, setBanner] = useState('')

  useEffect(() => {
    fetchVehicles()
      .then(setVehicles)
      .catch((e) => setError(e.message))
    fetchMyBookings()
      .then(setBookings)
      .catch(() => {})
    fetchProfile()
      .then(setProfile)
      .catch(() => {})
  }, [])

  const notify = (type, msg) => {
    setError(type === 'error' ? msg : '')
    setBanner(type !== 'error' ? msg : '')
  }

  function openBooking(vehicleId = null) {
    setInitialVehicleId(vehicleId)
    setBookingOpen(true)
    setError('')
    setBanner('')
  }

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

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Browse Vehicles</h1>
          <p className="page-head__sub">Find the perfect vehicle for your trip.</p>
        </div>
        <button className="btn btn--primary" onClick={() => openBooking(null)}>
          <FiPlus size={16} /> Book a Vehicle
        </button>
      </div>

      {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}
      {banner && <div className="success-banner" style={{ marginBottom: 16 }}>{banner}</div>}

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
                        onClick={() => openBooking(vehicle.id)}
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

      <NewBookingModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        vehicles={vehicles}
        bookings={bookings}
        profile={profile}
        initialVehicleId={initialVehicleId}
        notify={notify}
      />
    </div>
  )
}