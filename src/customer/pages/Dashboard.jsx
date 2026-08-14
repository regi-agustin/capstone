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
import SummaryCard from '../../ro/components/SummaryCard.jsx'
import StatusBadge from '../../ro/components/StatusBadge.jsx'

const Detail = ({ label, value }) => (
  <div>
    <div className="detail-item__label">{label}</div>
    <div className="detail-item__value">{value || '—'}</div>
  </div>
)

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
      <div className="page-head">
        <div>
          <h1>Customer Dashboard</h1>
          <p className="page-head__sub">Overview of your rentals, fleet, and account activity.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 22, background: 'linear-gradient(90deg, var(--navy), #16335f)', border: 'none' }}>
        <div className="card__body">
          <h1 style={{ fontSize: 20, color: '#fff' }}>Welcome, {firstName} 🚗</h1>
          <p style={{ color: '#fde68a', marginTop: 4 }}>Good day! Ready for another great journey with Hollydot?</p>
        </div>
      </div>

      {error && <div className="error-banner" style={{ marginBottom: 22 }}>{error}</div>}

      <div className="stats-grid">
        <SummaryCard icon={<FiTruck size={22} />} label="Available Vehicles" value={availableVehicles} tone="primary" note="vehicles available" />
        <SummaryCard icon={<FiClock size={22} />} label="Pending Reservations" value={pending} tone="pending" note="waiting for approval" />
        <SummaryCard icon={<FiCheckCircle size={22} />} label="Active Rental" value={active} tone="in-use" note="ongoing rental" />
        <SummaryCard icon={<FiXCircle size={22} />} label="Completed Rentals" value={completed} tone="confirmed" note="total completed" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 22, marginBottom: 22 }}>
        <section className="card">
          <div className="card__header">
            <div>
              <div className="card__title">Latest Reservation</div>
              <div className="card__sub">Your most recent booking</div>
            </div>
          </div>
          <div className="card__body">
            {latest ? (
              <div>
                <div className="detail-grid">
                  <Detail label="Reservation No." value={latest.id} />
                  <Detail label="Vehicle" value={latest.vehicleLabel?.model || 'To be assigned'} />
                  <Detail label="Pickup Date" value={formatDate(latest.trip.pickupDate)} />
                  <Detail label="Return Date" value={formatDate(latest.trip.returnDate)} />
                </div>
                <div style={{ marginTop: 16 }}>
                  <StatusBadge status={latest.status} />
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <FiClock size={36} />
                <div className="empty-state__title">No reservations yet</div>
                <div className="empty-state__sub">Browse vehicles to book your first trip!</div>
              </div>
            )}
          </div>
        </section>

        <section className="card">
          <div className="card__header">
            <div>
              <div className="card__title">Recommended For You</div>
              <div className="card__sub">A good match for your next trip</div>
            </div>
          </div>
          <div className="card__body">
            {recommended ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div className="stat-card__icon">
                  <FiTruck size={26} />
                </div>
                <div>
                  <div className="stat-card__label" style={{ fontSize: 14 }}>{recommended.model}</div>
                  <div className="cell-sub">
                    {recommended.type} · {recommended.seats} Seats · <span style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>{formatPeso(recommended.dailyRate)}/day</span>
                  </div>
                  <div className="cell-muted" style={{ marginTop: 2 }}>Available now — rent it for your next trip</div>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <FiTruck size={36} />
                <div className="empty-state__title">No vehicles available</div>
                <div className="empty-state__sub">Check back soon for new fleet additions.</div>
              </div>
            )}
          </div>
        </section>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 22 }}>
        <section className="card">
          <div className="card__header">
            <div>
              <div className="card__title">Notifications</div>
              <div className="card__sub">Latest updates</div>
            </div>
          </div>
          <div className="card__body">
            {notifications.length === 0 ? (
              <p className="muted">No notifications yet.</p>
            ) : (
              <div>
                {notifications.slice(0, 3).map((n, i) => (
                  <div
                    key={n.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      paddingBottom: 12,
                      marginBottom: 12,
                      borderBottom: i < notifications.slice(0, 3).length - 1 ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    <FiBell size={18} style={{ marginTop: 2, color: n.isRead ? 'var(--text-faint)' : 'var(--success)' }} />
                    <div>
                      <div className="cell-main">{n.description || n.title}</div>
                      <div className="cell-muted" style={{ marginTop: 2 }}>{n.timestamp}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="card">
          <div className="card__header">
            <div>
              <div className="card__title">Quick Actions</div>
              <div className="card__sub">Jump back into the action</div>
            </div>
          </div>
          <div className="card__body" style={{ display: 'grid', gap: 10 }}>
            <Link to="/browse" className="btn btn--secondary btn--block" style={{ justifyContent: 'space-between' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                <FiTruck size={18} /> Browse Vehicles
              </span>
              <FiArrowRight size={16} />
            </Link>
            <Link to="/reservations" className="btn btn--secondary btn--block" style={{ justifyContent: 'space-between' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                <FiCheckCircle size={18} /> My Reservations
              </span>
              <FiArrowRight size={16} />
            </Link>
            <Link to="/history" className="btn btn--secondary btn--block" style={{ justifyContent: 'space-between' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                <FiClock size={18} /> Rental History
              </span>
              <FiArrowRight size={16} />
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}