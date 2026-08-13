import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DriverLayout from './components/DriverLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Trips from './pages/Trips.jsx';
import Attendance from './pages/Attendance.jsx';
import Payroll from './pages/Payroll.jsx';
import Notifications from './pages/Notifications.jsx';
import Profile from './pages/Profile.jsx';

function DriverApp({ user, onLogout }) {
  return (
    <Router>
      <Routes>
        <Route element={<DriverLayout onLogout={onLogout} />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/trips" element={<Trips />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/payroll" element={<Payroll />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default DriverApp;
