import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext.jsx';
import AppLayout from './components/AppLayout.jsx';
import BookingDashboard from './pages/BookingDashboard.jsx';
import VehicleAvailability from './pages/VehicleAvailability.jsx';
import './styles/main.css';

function ROApp({ user, onLogout, onSwitchToAdmin }) {
  return (
    <div className="ro-app">
      <Router>
        <AppProvider initialUser={user} onLogout={onLogout} onSwitchToAdmin={onSwitchToAdmin}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<BookingDashboard />} />
              <Route path="/vehicles" element={<VehicleAvailability />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AppProvider>
      </Router>
    </div>
  );
}

export default ROApp;
