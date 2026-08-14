import { useEffect, useMemo, useState } from 'react'
import { FiTruck } from 'react-icons/fi'
import { fetchMyBookings, formatDate, formatPeso } from '../services/customerService.js'
import SummaryCard from '../../ro/components/SummaryCard.jsx'
import StatusBadge from '../../ro/components/StatusBadge.jsx'

const Detail = ({ label, value }) => (
  <div>
    <div className="detail-item__label">{label}</div>
    <div className="detail-item__value">{value || '—'}</div>
  </div>
)

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

  const filters = [
    { id: 'all', label: 'All Rentals' },
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Cancelled' },
  ]

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Rental History</h1>
          <p className="page-head__sub">View your past rentals and details.</p>
        </div>
      </div>

      {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="toolbar" style={{ marginBottom: 18 }}>
        <div className="filter-tabs" role="tablist" aria-label="Filter rentals">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              className={`filter-tab${filter === f.id ? ' filter-tab--active' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="stats-grid">
        <SummaryCard icon={<FiTruck size={22} />} label="Total Rentals" value={history.length} tone="primary" />
        <SummaryCard icon={<FiTruck size={22} />} label="Total Days Rented" value={totalDays} tone="in-use" />
        <SummaryCard icon={<FiTruck size={22} />} label="Total Spent" value={formatPeso(totalSpent)} tone="confirmed" />
        <SummaryCard
          icon={<FiTruck size={22} />}
          label="Most Rented"
          value={mostRented ? mostRented[0] : '—'}
          tone="pending"
          note={mostRented ? `Rented ${mostRented[1]} time${mostRented[1] > 1 ? 's' : ''}` : 'No rentals yet'}
        />
      </div>

      <section className="card">
        <div className="card__header">
          <div>
            <div className="card__title">Rental History</div>
            <div className="card__sub">
              Showing {filtered.length} of {history.length} rentals ({completedCount} completed · {cancelledCount} cancelled)
            </div>
          </div>
        </div>
        <div className="card__body">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <FiTruck size={36} />
              <div className="empty-state__title">No rentals in this category</div>
              <div className="empty-state__sub">Past rentals will appear here once completed, cancelled, or denied.</div>
            </div>
          ) : (
            <div style={{ display: 'grid' }}>
              {filtered.map((rental, i) => (
                <div
                  key={rental.id}
                  style={{
                    padding: '16px 0',
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div className="stat-card__icon" style={{ width: 40, height: 40 }}>
                        <FiTruck size={20} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span className="cell-muted">{rental.id}</span>
                          <StatusBadge status={rental.status} />
                        </div>
                        <div className="cell-main" style={{ marginTop: 2 }}>{rental.vehicleLabel?.model || '—'}</div>
                        <div className="cell-sub">{rental.vehicleLabel?.type || ''}</div>
                      </div>
                    </div>
                  </div>

                  <div className="detail-grid" style={{ marginTop: 12 }}>
                    <Detail label="Pickup Date" value={formatDate(rental.trip.pickupDate)} />
                    <Detail label="Return Date" value={formatDate(rental.trip.returnDate)} />
                    <Detail label="Duration" value={rental.trip.durationLabel} />
                    <div>
                      <div className="detail-item__label">Total Price</div>
                      <div className="detail-item__value" style={{ color: 'var(--primary-dark)' }}>{formatPeso(rental.preBilling.estimatedTotal)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="card__body">
          <h3 style={{ marginBottom: 8 }}>Need Assistance?</h3>
          <p className="muted" style={{ fontSize: 13 }}>We're here to help you.</p>
          <div className="detail-grid" style={{ marginTop: 12 }}>
            <Detail label="Phone" value="0912 345 6789" />
            <Detail label="Email" value="support@hollydot.com" />
            <Detail label="Hours" value="Mon - Sat: 8:00 AM - 6:00 PM" />
            <Detail label="Office" value="Clark Freeport Zone, Pampanga" />
          </div>
        </div>
      </section>
    </div>
  )
}