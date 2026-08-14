import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  Users,
  UserCheck,
  Bell,
  User,
  Shield,
  HelpCircle,
  LogOut,
  FileBarChart,
  ChevronDown,
} from 'lucide-react'
import { fetchNotifications } from '../services/payrollService.js'

const menuItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/payroll', label: 'Payroll Management', icon: FileText },
  { to: '/drivers', label: 'Driver Records', icon: Users },
  { to: '/attendance', label: 'Driver Attendance', icon: UserCheck },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/profile', label: 'My Profile', icon: User },
  { to: '/security', label: 'Security', icon: Shield },
  { to: '/help', label: 'Help Center', icon: HelpCircle },
]

function initials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function AppLayout({ user, onLogout }) {
  const navigate = useNavigate()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    let mounted = true
    fetchNotifications()
      .then((list) => {
        if (mounted) setUnread(list.filter((n) => !n.isRead).length)
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [])

  function handleLogout() {
    onLogout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      <aside className="w-64 h-screen bg-white border-r border-gray-200 fixed left-0 top-0 z-20 shadow-sm flex flex-col">
        <div className="p-6 border-b border-gray-100 pb-4 bg-white">
          <div className="text-blue-700 font-bold text-xl tracking-wider flex items-center gap-1">
            <FileBarChart className="text-blue-500" size={24} /> FLEETOPS
          </div>
          <div className="text-[10px] text-gray-500 pl-1">Hollydot Car Rental</div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className="flex items-center gap-3">
                    <item.icon size={20} />
                    <span>{item.label}</span>
                  </span>
                  {item.to === '/notifications' && unread > 0 && (
                    <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{unread}</span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100 bg-white">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 text-gray-600 hover:text-red-600 text-sm font-medium w-full px-4 py-2 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={20} /> <span>Logout</span>
          </button>
        </div>
      </aside>

      <div className="ml-64 flex-1 px-8 pb-10 min-h-screen">
        <header className="flex items-center justify-between mb-6 pt-6 pb-4 border-b border-gray-200">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {greeting()}, {user?.name || 'there'}
            </h1>
            <p className="text-gray-500 text-sm">{user?.role || 'Payroll Officer'}</p>
          </div>
          <div className="flex items-center gap-4">
            <NavLink to="/notifications" className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full">
              <Bell size={20} />
              {unread > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>}
            </NavLink>
            <div className="flex items-center gap-3 border-l pl-4 border-gray-200">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-medium text-sm">
                {initials(user?.name)}
              </div>
              <div className="text-sm hidden md:block">
                <div className="font-semibold text-gray-800">{user?.name}</div>
                <div className="text-xs text-gray-500">{user?.role}</div>
              </div>
              <ChevronDown size={16} className="text-gray-400" />
            </div>
          </div>
        </header>

        <Outlet />
      </div>
    </div>
  )
}