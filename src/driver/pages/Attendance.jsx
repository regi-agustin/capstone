import { useEffect, useState } from 'react';
import { apiFetch } from '../../services/api.js';
import { Search, CalendarDays, Filter, Eye, Truck, X } from 'lucide-react';

const Attendance = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [filteredAttendance, setFilteredAttendance] = useState([]);
  const [viewRecord, setViewRecord] = useState(null);

  useEffect(() => {
    apiFetch('attendance.php')
      .then((rows) => {
        setRecords(rows);
        setFilteredAttendance(rows);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    filterAttendance(term, dateFilter);
  };

  const handleDateFilter = (e) => {
    const date = e.target.value;
    setDateFilter(date);
    filterAttendance(searchTerm, date);
  };

  const filterAttendance = (term, date) => {
    let filtered = records;

    if (term) {
      filtered = filtered.filter(
        (attendance) =>
          attendance.vehicle.toLowerCase().includes(term) ||
          attendance.status.toLowerCase().includes(term) ||
          attendance.verificationStatus.toLowerCase().includes(term)
      );
    }

    if (date) {
      filtered = filtered.filter((attendance) => attendance.date === date);
    }

    setFilteredAttendance(filtered);
  };

  const statusClass = (status) => (status === 'Present' ? 'available' : 'unavailable');
  const verificationClass = (status) => ({
    Verified: 'available',
    Pending: 'pending',
    Rejected: 'unavailable',
  }[status] || 'neutral');

  const presentCount = records.filter((r) => r.status === 'Present').length;

  return (
    <div>
      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-head" style={{ flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span className="search" style={{ width: 'min(340px, 100%)' }}>
              <Search width={15} height={15} />
              <input
                type="text"
                placeholder="Search by vehicle, status, or verification..."
                value={searchTerm}
                onChange={handleSearch}
                style={{ width: '100%' }}
              />
            </span>
            <span className="search" style={{ width: 170 }}>
              <CalendarDays width={15} height={15} />
              <input type="date" value={dateFilter} onChange={handleDateFilter} style={{ width: '100%' }} />
            </span>
            <button
              className="btn sm"
              onClick={() => {
                setSearchTerm('');
                setDateFilter('');
                setFilteredAttendance(records);
              }}
            >
              <Filter width={14} height={14} /> Clear Filters
            </button>
          </div>
          <div className="meta">
            {presentCount} present of {records.length} records
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>Attendance Records</h3>
          <span className="meta">Time-in / time-out log for your assigned fleet.</span>
        </div>
        {loading ? (
          <div className="empty"><div className="help">Loading attendance records...</div></div>
        ) : error ? (
          <div className="empty"><div className="error-msg" style={{ display: 'inline-block' }}>{error}</div></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Vehicle</th>
                  <th>Attendance Status</th>
                  <th>Time In</th>
                  <th>Time Out</th>
                  <th>Verification Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendance.map((attendance) => (
                  <tr key={attendance.id}>
                    <td>{attendance.date}</td>
                    <td className="cell-strong">{attendance.vehicle}</td>
                    <td><span className={`status ${statusClass(attendance.status)}`}>{attendance.status}</span></td>
                    <td>{attendance.timeIn}</td>
                    <td>{attendance.timeOut}</td>
                    <td><span className={`status ${verificationClass(attendance.verificationStatus)}`}>{attendance.verificationStatus}</span></td>
                    <td>
                      <button className="btn sm" onClick={() => setViewRecord(attendance)}>
                        <Eye width={14} height={14} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !error && filteredAttendance.length === 0 && (
          <div className="empty">
            <Truck width={40} height={40} />
            <div className="help" style={{ marginTop: 6 }}>No attendance records found.</div>
          </div>
        )}
      </div>

      {viewRecord && (
        <div className="overlay" onClick={() => setViewRecord(null)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Attendance Record — {viewRecord.date}</h3>
              <button className="x" onClick={() => setViewRecord(null)} aria-label="Close">
                <X width={16} height={16} />
              </button>
            </div>
            <div className="modal-body">
              {[
                ['Date', viewRecord.date],
                ['Vehicle', viewRecord.vehicle],
                ['Attendance Status', viewRecord.status],
                ['Time In', viewRecord.timeIn],
                ['Time Out', viewRecord.timeOut],
                ['Verification Status', viewRecord.verificationStatus],
              ].map(([label, value]) => (
                <div className="assign-card" key={label}>
                  <span className="cell-sub" style={{ flex: 1 }}>{label}</span>
                  <span className="cell-strong" style={{ textAlign: 'right' }}>
                    {value || '—'}
                  </span>
                </div>
              ))}
              {viewRecord.rejectionReason && (
                <div className="error-msg" style={{ marginTop: 10 }}>
                  Rejection reason: {viewRecord.rejectionReason}
                </div>
              )}
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => setViewRecord(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;