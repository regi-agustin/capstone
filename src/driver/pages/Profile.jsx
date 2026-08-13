import { useEffect, useState } from 'react';
import { apiFetch } from '../../services/api.js';
import { Mail, Phone, CreditCard, CalendarDays, Truck, MapPin, User } from 'lucide-react';

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('profile.php')
      .then(setProfile)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="panel">
        <div className="empty"><div className="help">Loading profile...</div></div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="panel">
        <div className="empty"><div className="error-msg" style={{ display: 'inline-block' }}>{error}</div></div>
      </div>
    );
  }

  const { driver, vehicle, stats } = profile;
  const initials = (driver.name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  const infoRows = [
    { icon: CreditCard, label: 'Employee ID', value: driver.id },
    { icon: CreditCard, label: 'License Number', value: driver.licenseNumber },
    { icon: CalendarDays, label: 'License Expiry', value: driver.licenseExpiry },
    { icon: Phone, label: 'Contact Number', value: driver.contactNumber },
    { icon: Mail, label: 'Email', value: driver.email },
    { icon: Truck, label: 'Vehicle Assigned', value: vehicle ? vehicle.name : '—' },
    { icon: MapPin, label: 'Department', value: driver.department },
  ];

  const perfCards = [
    { icon: CalendarDays, label: 'Attendance This Month', value: `${stats.totalAttendanceThisMonth} days`, bg: '#dbeafe', fg: '#2563eb' },
    { icon: Truck, label: 'Total Hours This Month', value: `${stats.totalHoursThisMonth} hrs`, bg: '#dcfce7', fg: '#16a34a' },
    { icon: User, label: 'Average Rating', value: `${stats.averageRating} / 5`, bg: '#fef3c7', fg: '#d97706' },
    { icon: CalendarDays, label: 'On-Time Attendance', value: stats.onTimeAttendance, bg: '#f3e8ff', fg: '#9333ea' },
  ];

  return (
    <div>
      {/* Profile header */}
      <div className="panel" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 18, alignItems: 'center', padding: 18, flexWrap: 'wrap' }}>
          <div
            className="avatar"
            style={{ width: 68, height: 68, fontSize: 24, borderRadius: 16, background: 'var(--navy-700)' }}
          >
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{driver.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
              <span className="status available">{driver.status}</span>
              <span className="cell-sub mono">{driver.id}</span>
            </div>
            <div className="cell-sub" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <Mail width={13} height={13} /> {driver.email}
            </div>
          </div>
        </div>
      </div>

      <div className="twocol" style={{ marginBottom: 18 }}>
        {/* Driver information */}
        <div className="panel">
          <div className="panel-head"><h3>Driver Information</h3></div>
          {infoRows.map(({ icon: I, label, value }) => (
            <div className="assign-card" key={label}>
              <span style={{ color: 'var(--muted)', display: 'inline-flex' }}><I width={16} height={16} /></span>
              <span className="cell-sub" style={{ flex: 1 }}>{label}</span>
              <span className="cell-strong" style={{ textAlign: 'right' }}>{value || '—'}</span>
            </div>
          ))}
        </div>

        {/* Assigned vehicle */}
        <div className="panel">
          <div className="panel-head"><h3>Assigned Vehicle</h3></div>
          {vehicle ? (
            <>
              <div
                style={{
                  width: '100%', height: 150,
                  background: 'var(--navy-800)', color: '#94a3b8',
                  display: 'grid', placeItems: 'center'
                }}
              >
                <Truck width={44} height={44} />
              </div>
              <div>
                <div className="assign-card">
                  <span className="cell-sub" style={{ flex: 1 }}>Plate Number</span>
                  <span className="vehicle-chip">{vehicle.plateNumber}</span>
                </div>
                <div className="assign-card">
                  <span className="cell-sub" style={{ flex: 1 }}>Vehicle Type</span>
                  <span className="cell-strong">{vehicle.type}</span>
                </div>
                <div className="assign-card">
                  <span className="cell-sub" style={{ flex: 1 }}>Model</span>
                  <span className="cell-strong">{vehicle.name}</span>
                </div>
                <div className="assign-card">
                  <span className="cell-sub" style={{ flex: 1 }}>Assigned Date</span>
                  <span className="cell-strong">{vehicle.assignedDate}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="empty">
              <Truck width={40} height={40} />
              <div className="help" style={{ marginTop: 6 }}>No vehicle assigned.</div>
            </div>
          )}
        </div>
      </div>

      {/* Performance overview */}
      <div className="panel">
        <div className="panel-head"><h3>Performance Overview</h3></div>
        <div className="stats" style={{ margin: 0, padding: 16 }}>
          {perfCards.map(({ icon: I, label, value, bg, fg }) => (
            <div className="stat" key={label}>
              <span style={{ width: 36, height: 36, borderRadius: 9, background: bg, color: fg, display: 'grid', placeItems: 'center', marginBottom: 8 }}>
                <I width={18} height={18} />
              </span>
              <span className="label">{label}</span>
              <div className="value" style={{ fontSize: 22 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Profile;