import { Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Car,
  CalendarClock,
  History,
  Bell,
  MessageSquareText,
  User,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react'
import AppShell from '../../components/AppShell.jsx'
import NotificationsBell from '../../components/NotificationsBell.jsx'

const TITLES = {
  '/dashboard': { title: 'Customer Dashboard', crumb: 'FleetOps / Customer Portal' },
  '/browse': { title: 'Browse Vehicles', crumb: 'FleetOps / Fleet Catalog' },
  '/reservations': { title: 'My Reservations', crumb: 'FleetOps / Bookings' },
  '/history': { title: 'Rental History', crumb: 'FleetOps / Past Rentals' },
  '/notifications': { title: 'Notifications', crumb: 'FleetOps / Alerts' },
  '/feedback': { title: 'Feedback', crumb: 'FleetOps / Support' },
  '/profile': { title: 'My Profile', crumb: 'FleetOps / Account' },
  '/security': { title: 'Security', crumb: 'FleetOps / Account' },
  '/help': { title: 'Help Center', crumb: 'FleetOps / Support' },
}

const NAV_BOOKING = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/browse', label: 'Browse Vehicles', icon: Car },
  { to: '/reservations', label: 'My Reservations', icon: CalendarClock },
  { to: '/history', label: 'Rental History', icon: History },
]

const NAV_ACCOUNT = [
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/feedback', label: 'Feedback', icon: MessageSquareText },
  { to: '/profile', label: 'My Profile', icon: User },
  { to: '/security', label: 'Security', icon: ShieldCheck },
  { to: '/help', label: 'Help Center', icon: HelpCircle },
]

export default function AppLayout({ user, onLogout, onSwitchToAdmin }) {
  const location = useLocation()
  const meta = TITLES[location.pathname] || { title: 'Customer Portal', crumb: 'FleetOps' }

  const accountNav = [
    ...(onSwitchToAdmin
      ? [{ key: 'admin', label: 'Super Admin Console', icon: ShieldCheck, onClick: onSwitchToAdmin }]
      : []),
    ...NAV_ACCOUNT,
  ]

  return (
    <AppShell
      groups={[
        { label: 'Booking', items: NAV_BOOKING },
        { label: 'Account', items: accountNav },
      ]}
      role="Customer"
      roleSub="Rent and manage your reservations"
      user={user?.name || 'Customer'}
      userSub="Customer"
      title={meta.title}
      crumb={meta.crumb}
      topbarExtra={<NotificationsBell />}
      onLogout={onLogout}
    >
      <Outlet />
    </AppShell>
  )
}