import { Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  Users,
  UserCheck,
  Bell,
  User,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react'
import AppShell from '../../components/AppShell.jsx'
import NotificationsBell from '../../components/NotificationsBell.jsx'

const TITLES = {
  '/dashboard': { title: 'Payroll Dashboard', crumb: 'FleetOps / Payroll Desk' },
  '/payroll': { title: 'Payroll Processing', crumb: 'FleetOps / Payroll Desk' },
  '/drivers': { title: 'Driver Records', crumb: 'FleetOps / Payroll Desk' },
  '/attendance': { title: 'Driver Attendance', crumb: 'FleetOps / Payroll Desk' },
  '/notifications': { title: 'Notifications', crumb: 'FleetOps / Alerts' },
  '/profile': { title: 'My Profile', crumb: 'FleetOps / Account' },
  '/security': { title: 'Security', crumb: 'FleetOps / Account' },
  '/help': { title: 'Help Center', crumb: 'FleetOps / Support' },
}

const NAV_PAYROLL = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/payroll', label: 'Payroll Processing', icon: FileText },
  { to: '/drivers', label: 'Driver Records', icon: Users },
  { to: '/attendance', label: 'Driver Attendance', icon: UserCheck },
  { to: '/notifications', label: 'Notifications', icon: Bell },
]

const NAV_ACCOUNT = [
  { to: '/profile', label: 'My Profile', icon: User },
  { to: '/security', label: 'Security', icon: ShieldCheck },
  { to: '/help', label: 'Help Center', icon: HelpCircle },
]

export default function AppLayout({ user, onLogout, onSwitchToAdmin }) {
  const location = useLocation()
  const meta = TITLES[location.pathname] || { title: 'Payroll Desk', crumb: 'FleetOps' }

  const accountNav = [
    ...(onSwitchToAdmin
      ? [{ key: 'admin', label: 'Super Admin Console', icon: ShieldCheck, onClick: onSwitchToAdmin }]
      : []),
    ...NAV_ACCOUNT,
  ]

  return (
    <AppShell
      groups={[
        { label: 'Payroll', items: NAV_PAYROLL },
        { label: 'Account', items: accountNav },
      ]}
      role="Payroll Officer"
      roleSub="Payroll, drivers, and attendance"
      user={user?.name || 'Payroll Officer'}
      userSub="Payroll Officer"
      title={meta.title}
      crumb={meta.crumb}
      topbarExtra={<NotificationsBell />}
      onLogout={onLogout}
    >
      <Outlet />
    </AppShell>
  )
}