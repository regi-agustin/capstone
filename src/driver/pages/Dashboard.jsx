import { useEffect, useState } from 'react';
import TimeInModal from '../components/TimeInModal.jsx';
import TimeOutModal from '../components/TimeOutModal.jsx';
import { apiFetch } from '../../services/api.js';
import { CalendarDays, CheckCircle2, XCircle, Wallet, Clock, Car, Truck, AlertCircle } from 'lucide-react';

const Dashboard = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTimeInModal, setShowTimeInModal] = useState(false);
  const [showTimeOutModal, setShowTimeOutModal] = useState(false);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [hasCompletedToday, setHasCompletedToday] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [todayAttendance, setTodayAttendance] = useState(null);

  // Ensure modal is closed on page load and clear any stale errors
  useEffect(() => {
    setShowTimeInModal(false);
    setShowTimeOutModal(false);
    setError(''); // Clear any stale error messages
  }, []);

  useEffect(() => {
    apiFetch('driver/profile.php')
      .then((p) => {
        setProfile(p);
        setIsClockedIn(Boolean(p.clockedIn));
        setHasCompletedToday(Boolean(p.hasCompletedToday));

        // Quick check: if backend says completed, ensure both states are correct
        if (p.hasCompletedToday) {
          setHasCompletedToday(true);
          setIsClockedIn(false);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Fetch today's attendance data for lateness status
  useEffect(() => {
    apiFetch('attendance.php')
      .then((records) => {
        const today = new Date().toISOString().split('T')[0];
        const todayRecord = records.find(record => record.date === today);
        setTodayAttendance(todayRecord || null);
      })
      .catch((e) => console.error('Failed to fetch attendance:', e));
  }, []);

  // Add refresh function to manually reload clocked-in status
  const refreshClockStatus = async () => {
    try {
      const updatedProfile = await apiFetch('driver/profile.php');
      setProfile(updatedProfile);
      setIsClockedIn(Boolean(updatedProfile.clockedIn));
      setHasCompletedToday(Boolean(updatedProfile.hasCompletedToday));
      setError('');
      return updatedProfile;
    } catch (e) {
      setError(`Failed to refresh status: ${e.message}`);
      return null;
    }
  };

  // Check if already clocked in before opening modal
  const handleTimeInClick = async () => {
    try {
      console.log('Time In button clicked - checking status...');
      
      // Direct attendance check before any modal state changes
      const response = await apiFetch('attendance.php');
      console.log('Attendance records:', response);
      
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      console.log('Today date:', today);
      
      // Find attendance record for today specifically
      const todayAttendance = response.find(record => record.date === today);
      console.log('Today attendance record:', todayAttendance);
      
      // Check if there's a completed attendance record for today (both time_in and time_out exist)
      if (todayAttendance && todayAttendance.timeOut) {
        console.log('Blocking: Completed attendance found for today');
        const errorMsg = 'Attendance already recorded for today.';
        showPopupNotification(errorMsg);
        console.log('Popup notification set:', errorMsg);
        return;
      }
      
      // Check if already clocked in today (time_in exists but no time_out)
      if (todayAttendance && todayAttendance.timeIn && !todayAttendance.timeOut) {
        console.log('Blocking: Already clocked in today');
        const errorMsg = 'You are already clocked in for today. Please time out first before attempting to time in again.';
        showPopupNotification(errorMsg);
        console.log('Popup notification set:', errorMsg);
        return;
      }

      console.log('Allowing modal to open');
      // If not clocked in today, open the modal
      setShowTimeInModal(true);
    } catch (e) {
      console.error('Error in handleTimeInClick:', e);
      setError(`Failed to check attendance status: ${e.message}`);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const showPopupNotification = (message) => {
    setNotificationMessage(message);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 4000);
  };

  const handleTimeIn = async (image, detectedPlate) => {
    try {
      console.log('Submitting time-in with detected plate:', detectedPlate);
      const response = await apiFetch('attendance.php', {
        method: 'POST',
        body: JSON.stringify({ action: 'time_in', image, detectedPlateNumber: detectedPlate })
      });

      console.log('Time-in response:', response);

      // Only accept successful time-in (with ID)
      if (response && response.id) {
        console.log('SUCCESS: Time-in recorded, updating state');
        
        // Close modal immediately
        setShowTimeInModal(false);
        
        // Refresh profile to get updated clocked-in status
        const updatedProfile = await refreshClockStatus();
        
        if (updatedProfile) {
          console.log('Status updated after time in:', updatedProfile);
          showPopupNotification('Time-in successful! You are now clocked in.');
        }
      } else {
        // Handle error case (plate number mismatch, etc.)
        const errorMsg = response?.error || 'Unknown error';
        console.error('Time-in failed:', errorMsg);

        // If attendance already recorded for today, close modal and update status
        if (errorMsg.includes('already clocked in') || errorMsg.includes('already recorded')) {
          console.log('User already clocked in - closing modal and refreshing status');
          setShowTimeInModal(false);
          showPopupNotification('You are already clocked in. Please time out first.');
          await refreshClockStatus();
        } else {
          setError(`Time-in failed: ${errorMsg}`);
          // Keep modal open so user can retry with correct vehicle
        }
      }
    } catch (e) {
      console.error('Time-in error:', e);
      console.error('Error message:', e.message);
      
      // Handle 409 Conflict errors specifically
      if (e.message && e.message.includes('409')) {
        console.log('409 Conflict - User already clocked in');
        setShowTimeInModal(false);
        showPopupNotification('You are already clocked in. Please time out first.');
        await refreshClockStatus();
      } else {
        setError(`Error: ${e.message}`);
        // Keep modal open so user can retry
      }
    }
  };

  const handleTimeOut = async () => {
    try {
      console.log('Time Out button clicked - processing...');
      
      await apiFetch('attendance.php', {
        method: 'POST',
        body: JSON.stringify({ action: 'time_out' })
      });
      
      console.log('Time out successful, refreshing status...');
      
      // Refresh profile to get updated clocked-in status
      const updatedProfile = await refreshClockStatus();
      
      if (updatedProfile) {
        console.log('Status updated after time out:', updatedProfile);
        showPopupNotification('Time out successful! You have completed your attendance for today.');
      }
      
      setShowTimeOutModal(false);
    } catch (e) {
      console.error('Time out error:', e);
      const errorMsg = e.message || 'Failed to time out. Please try again.';
      showPopupNotification(errorMsg);
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
    { title: 'Late Days', value: stats.lateDays, icon: AlertCircle, tone: { bg: '#fef3c7', fg: '#d97706' } },
    { title: 'Absent Days', value: stats.absentDays, icon: XCircle, tone: { bg: '#fee2e2', fg: '#dc2626' } },
    { title: 'Latest Payroll', value: stats.latestPayrollStatus, icon: Wallet, tone: { bg: '#e0e7ff', fg: '#4f46e5' } },
  ];

  return (
    <div>
      {/* Welcome banner */}
      <div
        className="panel"
        style={{
          background: 'linear-gradient(160deg, var(--navy-900), var(--navy-700))',
          border: 'none',
          color: '#fff',
          padding: '20px 24px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Welcome back, {driver.name}!</div>
            <div style={{ color: '#cbd5e1', fontSize: 14, marginBottom: 14 }}>
              Here's your fleet operations overview for today.
            </div>
            <div>
              <span className="pill" style={{ display: 'inline-block', background: 'rgba(255,255,255,.12)', borderColor: 'rgba(255,255,255,.25)', padding: '6px 12px', borderRadius: 20 }}>
                {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
          </div>
          <div style={{ textAlign: 'right', minWidth: 180, flexShrink: 0 }}>
            <div className="label" style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 8 }}>
              Attendance Status
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', marginBottom: 12 }}>
              <span className={`status ${hasCompletedToday ? 'available' : (isClockedIn ? 'available' : 'unavailable')}`} style={{ background: hasCompletedToday ? 'rgba(251,191,36,.9)' : (isClockedIn ? 'rgba(220,252,231,.9)' : 'rgba(248,250,252,.9)'), padding: '6px 12px', borderRadius: 8 }}>
                {hasCompletedToday ? 'Attendance Already Recorded Today' : (isClockedIn ? 'Currently Timed In' : 'Not Yet Timed In')}
              </span>
            </div>
            {todayAttendance && todayAttendance.timeIn && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', marginBottom: 12 }}>
                <span className={`status ${todayAttendance.isLate ? 'unavailable' : 'available'}`} style={{ background: todayAttendance.isLate ? 'rgba(251,191,36,.9)' : 'rgba(220,252,231,.9)', padding: '6px 12px', borderRadius: 8 }}>
                  {todayAttendance.isLate ? 'Late' : 'On Time'}
                </span>
              </div>
            )}
            {!hasCompletedToday && !isClockedIn ? (
              <button className="btn btn-accent-solid" style={{ width: '100%', minWidth: 120 }} onClick={handleTimeInClick}>
                <Clock width={15} height={15} /> Time In
              </button>
            ) : isClockedIn && !hasCompletedToday ? (
              <button className="btn btn-danger-ghost" style={{ width: '100%', minWidth: 120, background: 'rgba(255,255,255,.9)' }} onClick={() => setShowTimeOutModal(true)}>
                <Clock width={15} height={15} /> Time Out
              </button>
            ) : hasCompletedToday ? (
              <button className="btn" style={{ width: '100%', minWidth: 120 }} disabled>
                <Clock width={15} height={15} /> Completed
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {error && (
        <div className="error-msg" style={{ marginBottom: 16 }}>
          {error}
          {error.includes('Verification failed') && !isClockedIn && (
            <button 
              className="btn sm" 
              style={{ marginLeft: 10, marginTop: 5 }}
              onClick={() => setShowTimeInModal(true)}
            >
              Retry Upload
            </button>
          )}
        </div>
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
              <span className={`status ${hasCompletedToday ? 'available' : (isClockedIn ? 'available' : 'unavailable')}`}>{hasCompletedToday ? 'Attendance Already Recorded Today' : (isClockedIn ? 'Currently Timed In' : 'Not Yet Timed In')}</span>
              <span className="cell-sub" style={{ marginLeft: 'auto' }}>
                <CalendarDays width={13} height={13} style={{ display: 'inline', verticalAlign: '-2px' }} />{' '}
                {currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            {todayAttendance && todayAttendance.timeIn && (
              <div className="assign-card">
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)' }}>
                  <AlertCircle width={15} height={15} /> Today's Lateness Status
                </span>
                <span className={`status ${todayAttendance.isLate ? 'unavailable' : 'available'}`} style={{ marginLeft: 'auto' }}>
                  {todayAttendance.isLate ? 'Late' : 'On Time'}
                </span>
              </div>
            )}
            <div className="assign-card">
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)' }}>
                <Clock width={15} height={15} /> Current Date
              </span>
              <span style={{ fontWeight: 600, marginLeft: 'auto' }}>
                {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </span>
            </div>
            <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)' }}>
              {!hasCompletedToday && !isClockedIn ? (
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleTimeInClick}>
                  <Clock width={15} height={15} /> Time In
                </button>
              ) : isClockedIn && !hasCompletedToday ? (
                <button className="btn btn-accent-solid" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowTimeOutModal(true)}>
                  <Clock width={15} height={15} /> Time Out
                </button>
              ) : hasCompletedToday ? (
                <button className="btn" style={{ width: '100%', justifyContent: 'center' }} disabled>
                  <Clock width={15} height={15} /> Completed
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <TimeInModal 
        isOpen={showTimeInModal} 
        onClose={() => {
          setShowTimeInModal(false);
          setError('');
        }} 
        onSubmit={handleTimeIn} 
        assignedPlateNumber={profile?.vehicle?.plateNumber}
        submissionError={error.includes('Time-in failed') ? error : ''}
      />
      <TimeOutModal isOpen={showTimeOutModal} onClose={() => setShowTimeOutModal(false)} onConfirm={handleTimeOut} />
      
      {/* Popup Notification */}
      {showNotification && (
        <div className="overlay" onClick={() => setShowNotification(false)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Attendance Notice</h3>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'grid', placeItems: 'center' }}>
                  <AlertCircle width={20} height={20} />
                </div>
                <p style={{ margin: 0, flex: 1 }}>{notificationMessage}</p>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-primary" onClick={() => setShowNotification(false)}>OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;