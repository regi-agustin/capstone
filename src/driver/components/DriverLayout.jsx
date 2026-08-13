import { useEffect, useState } from 'react';
import { Outlet, useLocation, NavLink } from 'react-router-dom';
import { LayoutDashboard, Truck, CalendarClock, Wallet, Bell, User } from 'lucide-react';
import AppShell from '../../components/AppShell.jsx';
import { apiFetch } from '../../services/api.js';

const TITLES = {
  '/dashboard': { title: 'My Dashboard', crumb: 'FleetOps / Driver' },
  '/trips': { title: 'My Trips', crumb: 'FleetOps / Trip Dispatch' },
  '/attendance': { title: 'Attendance Dashboard', crumb: 'FleetOps / Time Tracking' },
  '/payroll': { title: 'Payroll Dashboard', crumb: 'FleetOps / Payslips' },
  '/notifications': { title: 'Notifications', crumb: 'FleetOps / System Updates' },
  '/profile': { title: 'Profile', crumb: 'FleetOps / Account' },
};

const NAV = [
  { to: '/dashboard', label: 'My Dashboard', icon: LayoutDashboard, end: true },
  { to: '/trips', label: 'My Trips', icon: Truck, end: false },
  { to: '/attendance', label: 'Attendance', icon: CalendarClock, end: false },
  { to: '/payroll', label: 'Payroll', icon: Wallet, end: false },
  { to: '/notifications', label: 'Notifications', icon: Bell, end: false },
  { to: '/profile', label: 'Profile', icon: User, end: false },
];

export default function DriverLayout({ onLogout }) {
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [unread, setUnread] = useState(0);
  const meta = TITLES[location.pathname] || { title: 'Driver', crumb: 'FleetOps / Driver' };

  useEffect(() => {
    apiFetch('profile.php')
      .then((p) => {
        setProfile(p);
        if (p.stats) setUnread(p.stats.unreadNotifications || 0);
      })
      .catch(() => {});
  }, []);

  const name = profile?.driver?.name || '';

  return (
    <AppShell
      groups={[{ label: 'Modules', items: NAV }]}
      role="Driver"
      roleSub="Accept trips · clock attendance"
      user={name || 'Driver'}
      userSub="Driver"
      title={meta.title}
      crumb={meta.crumb}
      topbarExtra={
        <NavLink
          to="/notifications"
          aria-label="Notifications"
          style={{ position: 'relative', color: 'var(--muted)', display: 'inline-flex' }}
        >
          <Bell width={19} height={19} />
          {unread > 0 && <span className="notif-dot" />}
        </NavLink>
      }
      onLogout={onLogout}
    >
      <Outlet />
    </AppShell>
  );
}