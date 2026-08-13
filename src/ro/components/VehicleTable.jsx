import { SearchX } from 'lucide-react';
import SearchBar from './SearchBar.jsx';
import StatusBadge from './StatusBadge.jsx';
import { searchVehicles } from '../services/vehicleService.js';
import { formatDate } from '../utils/format.js';

const STATUS_FILTERS = ['All', 'Available', 'In Use', 'In Maintenance'];

export default function VehicleTable({ vehicles, loading, search, onSearchChange, status, onStatusChange, onView }) {
  const filtered = searchVehicles(vehicles, search).filter((v) => status === 'All' || v.status === status);

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <div className="card__title">
            Vehicle Availability List
            <span className="badge badge--neutral">{filtered.length}</span>
          </div>
          <div className="card__subtitle">Monitor fleet availability and active assignments.</div>
        </div>
      </div>

      <div className="card__body">
        <div className="toolbar" style={{ marginBottom: 16 }}>
          <SearchBar value={search} onChange={onSearchChange} placeholder="Search plate number or vehicle type..." />
          <div className="filter-tabs" role="tablist" aria-label="Filter by vehicle status">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={status === f}
                className={`filter-tab${status === f ? ' filter-tab--active' : ''}`}
                onClick={() => onStatusChange(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <span className="spinner" /> Loading fleet…
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <SearchX size={36} />
            <div className="empty-state__title">No vehicles found</div>
            <div className="empty-state__sub">No vehicles match the current search or status filter.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Vehicle ID</th>
                  <th>Plate Number</th>
                  <th>Vehicle Type</th>
                  <th>Vehicle Status</th>
                  <th>Current Booking</th>
                  <th>Driver</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr key={v.id} className={v.status === 'In Maintenance' ? 'row--pending' : ''}>
                    <td>
                      <div className="cell-main">{v.id}</div>
                      <div className="cell-sub">{v.year} · {v.seats} seats</div>
                    </td>
                    <td>
                      <div className="cell-main">{v.plateNumber}</div>
                      <div className="cell-sub">{v.model}</div>
                    </td>
                    <td>
                      <div className="cell-main">{v.type}</div>
                    </td>
                    <td>
                      <StatusBadge status={v.status} />
                    </td>
                    <td>
                      {v.currentBooking ? (
                        <>
                          <div className="cell-main">{v.currentBooking}</div>
                          <div className="cell-sub">{v.currentClient}</div>
                          <div className="cell-sub">
                            {formatDate(v.currentTripDate)} · {v.currentDestination}
                          </div>
                        </>
                      ) : (
                        <div className="cell-sub faint">No Active Booking</div>
                      )}
                    </td>
                    <td>
                      {v.driver ? (
                        <>
                          <div className="cell-main">{v.driver.name}</div>
                          <div className="cell-sub">{v.driver.contact}</div>
                        </>
                      ) : (
                        <div className="cell-sub faint">Not Assigned</div>
                      )}
                    </td>
                    <td>
                      <button type="button" className="btn btn--secondary btn--sm" onClick={() => onView(v)}>
                        View Details
                      </button>
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