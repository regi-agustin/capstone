import { useEffect, useState } from 'react';
import TimeInModal from '../components/TimeInModal.jsx';
import TimeOutModal from '../components/TimeOutModal.jsx';
import { apiFetch } from '../../services/api.js';
import { CalendarDays, CheckCircle2, XCircle, Wallet, Clock, Car, Truck } from 'lucide-react';

const Dashboard = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTimeInModal, setShowTimeInModal] = useState(false);
  const [showTimeOutModal, setShowTimeOutModal] = useState(false);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    apiFetch('profile.php')
      .then((p) => {
        setProfile(p);
        setIsClockedIn(Boolean(p.clockedIn));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleTimeIn = async (image) => {
    try {
      await apiFetch('attendance.php', {
        method: 'POST',
        body: JSON.stringify({ action: 'time_in', image })
      });
      setIsClockedIn(true);
      setShowTimeInModal(false);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleTimeOut = async () => {
    try {
      await apiFetch('attendance.php', {
        method: 'POST',
        body: JSON.stringify({ action: 'time_out' })
      });
      setIsClockedIn(false);
      setShowTimeOutModal(false);
    } catch (e) {
      setError(e.message);
    }
  };

  if (loading) {
    return (
      <div className="panel">
        <div className="empty">
          <Truck width={46} height={46} />
          <div className="help">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="panel">
        <div className="empty">
          <div className="error-msg" style={{ display: 'inline-block' }}>{error}</div>
        </div>
      </div>
    );
  }

  const { driver, vehicle, stats } = profile;

  const statCards = [
    { title: 'Attendance This Month', value: stats.totalAttendanceThisMonth, icon: CalendarDays, tone: { bg: '#dbeafe', fg: '#2563eb' } },
    { title: 'Present Days', value: stats.presentDays, icon: CheckCircle2, tone: { bg: '#dcfce7', fg: '#16a34a' } },
    { title: 'Absent Days', value: stats.absentDays, icon: XCircle, tone: { bg: '#fee2e2', fg: '#dc2626' } },
    { title: 'Latest Payroll', value: stats.latestPayrollStatus, icon: Wallet, tone: { bg: '#fef3c7', fg: '#d97706' } },
  ];

  return (
    <div>
      {/* Welcome banner */}
      <div
        className="panel"
        style={{
          background: 'linear-gradient(160deg, var(--navy-900), var(--navy-700))',
          border: 'none',
          color: '#fff'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>Welcome back, {driver.name}!</div>
            <div style={{ color: '#cbd5e1', fontSize: 13.5, marginTop: 4 }}>
              Here's your fleet operations overview for today.
            </div>
            <div style={{ marginTop: 12 }}>
              <span className="pill" style={{ display: 'inline-block', background: 'rgba(255,255,255,.12)', borderColor: 'rgba(255,255,255,.25)' }}>
                {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
          </div>
          <div style={{ textAlign: 'right', minWidth: 170 }}>
            <div className="label" style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: .6, fontWeight: 600 }}>
              Attendance Status
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
              <span className={`status ${isClockedIn ? 'available' : 'unavailable'}`} style={{ background: isClockedIn ? 'rgba(220,252,231,.9)' : 'rgba(248,250,252,.9)' }}>
                {isClockedIn ? 'Clocked In' : 'Not Clocked In'}
              </span>
            </div>
            {!isClockedIn ? (
              <button className="btn btn-accent-solid" style={{ marginTop: 12 }} onClick={() => setShowTimeInModal(true)}>
                <Clock width={15} height={15} /> Time In
              </button>
            ) : (
              <button className="btn btn-danger-ghost" style={{ marginTop: 12, background: 'rgba(255,255,255,.9)' }} onClick={() => setShowTimeOutModal(true)}>
                <Clock width={15} height={15} /> Time Out
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div>
      )}

      {/* Stats */}
      <div className="stats">
        {statCards.map((stat, index) => {
          const I = stat.icon;
          return (
            <div className="stat" key={index}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span className="label">{stat.title}</span>
                <span style={{ width: 34, height: 34, borderRadius: 9, background: stat.tone.bg, color: stat.tone.fg, display: 'grid', placeItems: 'center' }}>
                  <I width={17} height={17} />
                </span>
              </div>
              <div className="value">{stat.value}</div>
            </div>
          );
        })}
      </div>

      <div className="twocol">
        {/* Assigned vehicle */}
        <div className="panel">
          <div className="panel-head">
            <h3>Assigned Vehicle</h3>
          </div>
          {vehicle ? (
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: 16, flexWrap: 'wrap' }}>
              <div
                style={{
                  width: 130, height: 96, borderRadius: 10, flexShrink: 0,
                  background: 'var(--navy-800)', color: '#94a3b8',
                  display: 'grid', placeItems: 'center'
                }}
              >
                <Car width={30} height={30} />
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5 }}>{vehicle.name}</div>
                <div className="cell-sub">{vehicle.type}</div>
                <span className="vehicle-chip" style={{ marginTop: 8, display: 'inline-block' }}>{vehicle.plateNumber}</span>
              </div>
              <div className="assign-fleet">
                <span className="status available">On Trip</span>
              </div>
            </div>
          ) : (
            <div className="empty">
              <Car width={40} height={40} />
              <div className="help">No vehicle assigned yet.</div>
            </div>
          )}
        </div>

        {/* Attendance status */}
        <div className="panel">
          <div className="panel-head">
            <h3>Current Attendance Status</h3>
          </div>
          <div style={{ padding: '14px 18px' }}>
            <div className="assign-card">
              <span className={`status ${isClockedIn ? 'available' : 'unavailable'}`}>{isClockedIn ? 'Clocked In' : 'Not Clocked In'}</span>
              <span className="cell-sub" style={{ marginLeft: 'auto' }}>
                <CalendarDays width={13} height={13} style={{ display: 'inline', verticalAlign: '-2px' }} />{' '}
                {currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <div className="assign-card">
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)' }}>
                <Clock width={15} height={15} /> Current Date
              </span>
              <span style={{ fontWeight: 600, marginLeft: 'auto' }}>
                {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </span>
            </div>
            <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)' }}>
              {!isClockedIn ? (
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowTimeInModal(true)}>
                  <Clock width={15} height={15} /> Time In
                </button>
              ) : (
                <button className="btn btn-accent-solid" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowTimeOutModal(true)}>
                  <Clock width={15} height={15} /> Time Out
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <TimeInModal isOpen={showTimeInModal} onClose={() => setShowTimeInModal(false)} onSubmit={handleTimeIn} />
      <TimeOutModal isOpen={showTimeOutModal} onClose={() => setShowTimeOutModal(false)} onConfirm={handleTimeOut} />
    </div>
  );
};

export default Dashboard;