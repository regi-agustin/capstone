import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Truck, CalendarClock, Wallet, Bell, User } from 'lucide-react';
import AppShell from '../../components/AppShell.jsx';
import NotificationsBell from '../../components/NotificationsBell.jsx';
import { apiFetch } from '../../services/api.js';
import { fetchDriverProfile, resolveProfileImageUrl } from '../services/driverService.js';

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
  const meta = TITLES[location.pathname] || { title: 'Driver', crumb: 'FleetOps / Driver' };

  useEffect(() => {
    fetchDriverProfile()
      .then((p) => {
        setProfile(p);
      })
      .catch(() => {});
  }, []);

  const name = profile?.driver?.name || '';
  const profileImageUrl = resolveProfileImageUrl(profile?.driver?.profileImage);

  return (
    <AppShell
      groups={[{ label: 'Modules', items: NAV }]}
      role="Driver"
      roleSub="Accept trips · clock attendance"
      user={name || 'Driver'}
      userSub="Driver"
      userImage={profileImageUrl}
      title={meta.title}
      crumb={meta.crumb}
      topbarExtra={<NotificationsBell />}
      onLogout={onLogout}
    >
      <Outlet />
    </AppShell>
  );
}