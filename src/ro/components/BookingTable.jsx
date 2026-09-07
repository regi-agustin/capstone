import { CalendarDays, User, MapPin, Car, SearchX } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { searchBookings, sortBookings } from '../services/bookingService.js';
import { formatMoney, formatDate, formatTime } from '../utils/format.js';
import SearchBar from './SearchBar.jsx';
import StatusBadge from './StatusBadge.jsx';

const STATUS_FILTERS = ['All', 'Pending', 'Confirmed', 'Denied', 'Cancelled'];

export default function BookingTable({ loading, onView, onConfirm, onDeny, onAdd }) {
  const { bookings, bookingSearch, setBookingSearch, bookingStatus, setBookingStatus, bookingSort, setBookingSort } = useApp();

  const filtered = sortBookings(searchBookings(bookings, bookingSearch), bookingSort)
    .filter((b) => bookingStatus === 'All' || b.status === bookingStatus);

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <div className="card__title">
            Client Booking List
            <span className="badge badge--neutral">{filtered.length}</span>
          </div>
          <div className="card__subtitle">Review and manage client reservation requests.</div>
        </div>
        <button type="button" className="btn btn--primary" onClick={onAdd}>
          + Booking
        </button>
      </div>

      <div className="card__body">
        <div className="toolbar" style={{ marginBottom: 16 }}>
          <SearchBar
            value={bookingSearch}
            onChange={setBookingSearch}
            placeholder="Search client, booking ID, destination, or vehicle..."
          />
          <div className="filter-tabs" role="tablist" aria-label="Filter by status">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={bookingStatus === f}
                className={`filter-tab${bookingStatus === f ? ' filter-tab--active' : ''}`}
                onClick={() => setBookingStatus(f)}
              >
                {f}
              </button>
            ))}
          </div>
          <select
            className="sort-select"
            value={bookingSort}
            disabled={bookingStatus !== 'All'}
            onChange={(e) => setBookingSort(e.target.value)}
            aria-label="Sort bookings"
          >
            <option value="newest">Sort: Booking Date</option>
            <option value="tripDate">Sort: Trip Date</option>
            <option value="client">Sort: Client Name</option>
            <option value="status">Sort: Status</option>
          </select>
        </div>

        {loading ? (
          <div className="loading-state">
            <span className="spinner" /> Loading bookings…
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <SearchX size={36} />
            <div className="empty-state__title">No bookings found</div>
            <div className="empty-state__sub">
              No records match the current search or status filter. Try adjusting your filters.
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Client Credentials</th>
                  <th>Trip Details</th>
                  <th>Pre-Billing</th>
                  <th>Driver &amp; Vehicle</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id} className={b.status === 'Pending' ? 'row--pending' : ''}>
                    <td>
                      <div className="cell-main">{b.id}</div>
                      <div className="cell-sub">Created {formatDate(b.createdAt)}</div>
                    </td>
                    <td>
                      <div className="cell-main">
                        <User size={14} style={{ color: 'var(--text-faint)' }} />
                        {b.client.name}
                      </div>
                      <div className="cell-sub">{b.client.contact}</div>
                      <div className="cell-sub">{b.client.email}</div>
                    </td>
                    <td>
                      <div className="cell-main">
                        <MapPin size={14} style={{ color: 'var(--text-faint)' }} />
                        {b.trip.destination}
                      </div>
                      <div className="cell-sub">
                        <CalendarDays size={13} style={{ display: 'inline', verticalAlign: '-2px' }} />
                        Pickup {formatDate(b.trip.pickupDate)} · {formatTime(b.trip.pickupTime)}
                      </div>
                      <div className="cell-sub">
                        <CalendarDays size={13} style={{ display: 'inline', verticalAlign: '-2px' }} />
                        Return {formatDate(b.trip.returnDate)} · {formatTime(b.trip.returnTime)}
                      </div>
                      <div className="cell-muted">
                        Duration: {b.trip.durationLabel}
                        {b.trip.passengers ? ` · ${b.trip.passengers} pax` : ''}
                      </div>
                      {b.trip.specialRequests && (
                        <div className="cell-muted" style={{ color: 'var(--primary-dark)' }} title={b.trip.specialRequests}>
                          📝 {b.trip.specialRequests}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="cell-main">{formatMoney(b.preBilling.estimatedTotal)}</div>
                      <div className="cell-sub">Rental {formatMoney(b.preBilling.rentalFee)}</div>
                      <div className="cell-sub">Charges {formatMoney(b.preBilling.additionalCharges)}</div>
                      <div className="badge badge--neutral" style={{ marginTop: 4 }}>Pre-Billing</div>
                    </td>
                    <td>
                      <div className="cell-main">
                        <Car size={14} style={{ color: 'var(--text-faint)' }} />
                        {b.vehicleLabel ? b.vehicleLabel.type : 'Not Assigned'}
                      </div>
                      <div className="cell-sub">{b.vehicleLabel ? b.vehicleLabel.plateNumber : '—'}</div>
                      <div className="cell-sub">
                        Driver: {b.driver ? b.driver.name : <span className="faint">Not Assigned</span>}
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={b.status} />
                      {b.status === 'Pending' && (
                        <div className="badge badge--neutral" style={{ marginTop: 4, fontSize: 11 }}>
                          needs action
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="actions-row">
                        <button type="button" className="btn btn--secondary btn--sm" onClick={() => onView(b)}>
                          View Details
                        </button>
                        {b.status === 'Pending' && (
                          <>
                            <button type="button" className="btn btn--success btn--sm" onClick={() => onConfirm(b)}>
                              Confirm
                            </button>
                            <button type="button" className="btn btn--danger btn--sm" onClick={() => onDeny(b)}>
                              Deny
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}