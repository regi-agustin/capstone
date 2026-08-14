import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import '../ro/styles/main.css'
import AppLayout from './components/AppLayout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import BrowseVehicles from './pages/BrowseVehicles.jsx'
import MyReservations from './pages/MyReservations.jsx'
import RentalHistory from './pages/RentalHistory.jsx'
import Notifications from './pages/Notifications.jsx'
import Feedback from './pages/Feedback.jsx'
import Profile from './pages/Profile.jsx'
import Security from './pages/Security.jsx'
import HelpCenter from './pages/HelpCenter.jsx'

function CustomerApp({ user, onLogout, onSwitchToAdmin }) {
  return (
    <div className="ro-app customer-app">
      <Router>
        <Routes>
          <Route element={<AppLayout user={user} onLogout={onLogout} onSwitchToAdmin={onSwitchToAdmin} />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/browse" element={<BrowseVehicles />} />
            <Route path="/reservations" element={<MyReservations />} />
            <Route path="/history" element={<RentalHistory />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/feedback" element={<Feedback />} />
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

export default CustomerApp