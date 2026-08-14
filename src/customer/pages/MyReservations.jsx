import { useEffect, useMemo, useState } from 'react'
import { FiMapPin } from 'react-icons/fi'
import { fetchMyBookings, formatDate, formatTime, formatPeso } from '../services/customerService.js'
import StatusBadge from '../../ro/components/StatusBadge.jsx'

const tabs = [
  { id: 'pending', label: 'Pending', statuses: ['Pending'] },
  { id: 'approved', label: 'Approved', statuses: ['Confirmed'] },
  { id: 'ongoing', label: 'Ongoing', statuses: ['On trip'] },
  { id: 'completed', label: 'Completed', statuses: ['Completed'] },
  { id: 'cancelled', label: 'Cancelled', statuses: ['Cancelled', 'Denied'] },
]

const Detail = ({ label, value }) => (
  <div>
    <div className="detail-item__label">{label}</div>
    <div className="detail-item__value">{value || '—'}</div>
  </div>
)

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
      <div className="page-head">
        <div>
          <h1>My Reservations</h1>
          <p className="page-head__sub">Manage and track all your vehicle reservations.</p>
        </div>
      </div>

      {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="toolbar" style={{ marginBottom: 18 }}>
        <div className="filter-tabs" role="tablist" aria-label="Filter by status">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`filter-tab${activeTab === tab.id ? ' filter-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label} ({grouped[tab.id].length})
            </button>
          ))}
        </div>
      </div>

      {grouped[activeTab].length === 0 ? (
        <div className="empty-state">
          <FiMapPin size={36} />
          <div className="empty-state__title">No reservations in this category</div>
          <div className="empty-state__sub">Reservations will appear here once you book a vehicle.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {grouped[activeTab].map((res) => (
            <section key={res.id} className="card">
              <div className="card__body">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div className="cell-muted">{res.id}</div>
                    <h3 style={{ fontSize: 16, marginTop: 2 }}>{res.vehicleLabel?.model || 'Vehicle to be assigned'}</h3>
                  </div>
                  <StatusBadge status={res.status} />
                </div>

                {res.status === 'Denied' && res.denialReason && (
                  <div className="error-banner" style={{ marginTop: 12 }}>
                    <strong>Reason:</strong> {res.denialReason}
                  </div>
                )}

                <div className="detail-grid" style={{ marginTop: 16 }}>
                  <Detail label="Pickup Date & Time" value={`${formatDate(res.trip.pickupDate)} · ${formatTime(res.trip.pickupTime)}`} />
                  <Detail label="Return Date & Time" value={`${formatDate(res.trip.returnDate)} · ${formatTime(res.trip.returnTime)}`} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                  <div>
                    <div className="detail-item__label">Destination</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FiMapPin size={14} className="faint" />
                      <span style={{ fontWeight: 500 }}>{res.trip.destination || '—'}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="detail-item__label">Estimated Price</div>
                    <div style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>{formatPeso(res.preBilling.estimatedTotal)}</div>
                  </div>
                </div>

                <button
                  onClick={() => setExpanded(expanded === res.id ? null : res.id)}
                  className="btn btn--secondary btn--block"
                  style={{ marginTop: 14, borderColor: 'var(--primary)', color: 'var(--primary-dark)' }}
                >
                  {expanded === res.id ? 'Hide Details' : 'View Details'}
                </button>

                {expanded === res.id && (
                  <div className="detail-grid" style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                    <Detail label="Duration" value={res.trip.durationLabel} />
                    <Detail label="Passengers" value={res.trip.passengers || '—'} />
                    <Detail label="Vehicle Type" value={res.vehicleLabel?.type || '—'} />
                    <Detail label="Base Rate" value={`${formatPeso(res.preBilling.baseRate)}/day`} />
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div className="detail-item__label">Special Requests</div>
                      <div className="detail-item__value">{res.trip.specialRequests || 'None'}</div>
                    </div>
                    {res.driver && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <div className="detail-item__label">Assigned Driver</div>
                        <div className="detail-item__value">{res.driver.name}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginTop: 22 }}>
        <section className="card" style={{ background: 'var(--warning-soft)', borderColor: 'var(--warning)' }}>
          <div className="card__body">
            <h3 style={{ marginBottom: 8 }}>Reservation Tips</h3>
            <ul className="muted" style={{ fontSize: 13, margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
              <li>Reservations are subject to administrator approval.</li>
              <li>You will receive a notification once your reservation status changes.</li>
              <li>Ensure your contact information is up to date.</li>
            </ul>
          </div>
        </section>

        <section className="card">
          <div className="card__body">
            <h3 style={{ marginBottom: 8 }}>Rental Requirements</h3>
            <ul className="muted" style={{ fontSize: 13, margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
              <li>Valid driver's license</li>
              <li>Valid government-issued ID</li>
              <li>Additional documents may be required</li>
            </ul>
          </div>
        </section>
      </div>

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