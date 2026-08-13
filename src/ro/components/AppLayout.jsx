import { Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Car, ShieldCheck } from 'lucide-react';
import AppShell from '../../components/AppShell.jsx';
import NotificationsBell from '../../components/NotificationsBell.jsx';
import { useApp } from '../context/AppContext.jsx';

const TITLES = {
  '/dashboard': { title: 'Booking Dashboard', crumb: 'FleetOps / Reservation Desk' },
  '/vehicles': { title: 'Vehicle Availability', crumb: 'FleetOps / Fleet Status' },
};

const NAV = [
  { to: '/dashboard', label: 'Dashboard / Bookings', icon: LayoutDashboard },
  { to: '/vehicles', label: 'Vehicle Availability', icon: Car },
];

export default function AppLayout() {
  const location = useLocation();
  const { auth, switchToAdmin, logout } = useApp();
  const user = auth.currentUser;
  const meta = TITLES[location.pathname] || { title: 'Dashboard', crumb: 'FleetOps' };

  return (
    <AppShell
      groups={[
        {
          label: 'Reservation',
          items: NAV,
        },
        ...(switchToAdmin
          ? [
              {
                label: 'Account',
                items: [
                  { key: 'admin', label: 'Super Admin Console', icon: ShieldCheck, onClick: switchToAdmin },
                ],
              },
            ]
          : []),
      ]}
      role="Reservation Officer"
      roleSub="Manage bookings and availability"
      user={user?.name || 'Reservation Officer'}
      userSub="Reservation Officer"
      title={meta.title}
      crumb={meta.crumb}
      topbarExtra={<NotificationsBell />}
      onLogout={logout}
    >
      <Outlet />
    </AppShell>
  );
}