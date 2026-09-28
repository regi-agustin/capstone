import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import '../ro/styles/main.css'
import AppLayout from './components/AppLayout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import PayrollManagement from './pages/PayrollManagement.jsx'
import CarRates from './pages/CarRates.jsx'
import DriverRecords from './pages/DriverRecords.jsx'
import Attendance from './pages/Attendance.jsx'
import Notifications from './pages/Notifications.jsx'
import Profile from './pages/Profile.jsx'
import Security from './pages/Security.jsx'
import HelpCenter from './pages/HelpCenter.jsx'

function PayrollApp({ user, onLogout, onSwitchToAdmin }) {
  return (
    <div className="ro-app payroll-app">
      <Router>
        <Routes>
          <Route element={<AppLayout user={user} onLogout={onLogout} onSwitchToAdmin={onSwitchToAdmin} />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/payroll" element={<PayrollManagement />} />
            <Route path="/car-rates" element={<CarRates />} />
            <Route path="/drivers" element={<DriverRecords />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/security" element={<Security />} />
            <Route path="/help" element={<HelpCenter />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </div>
  )
}

export default PayrollApp