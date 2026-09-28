import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { BillingProvider } from './context/BillingContext.jsx';
import AppLayout from './components/AppLayout.jsx';
import BillingDashboard from './pages/BillingDashboard.jsx';
import PaymentsPage from './pages/PaymentsPage.jsx';
import BookingReview from './pages/BookingReview.jsx';
import '../ro/styles/main.css';

function BillingApp({ user, onLogout, onSwitchToAdmin }) {
  return (
    <div className="ro-app billing-app">
      <Router>
        <BillingProvider initialUser={user} onLogout={onLogout} onSwitchToAdmin={onSwitchToAdmin}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/reviews" replace />} />
              <Route path="/reviews" element={<BookingReview />} />
              <Route path="/invoices" element={<BillingDashboard />} />
              <Route path="/payments" element={<PaymentsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/reviews" replace />} />
          </Routes>
        </BillingProvider>
      </Router>
    </div>
  );
}

export default BillingApp;
