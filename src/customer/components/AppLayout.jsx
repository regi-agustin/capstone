import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  FiHome,
  FiTruck,
  FiCalendar,
  FiClock,
  FiBell,
  FiMessageSquare,
  FiUser,
  FiShield,
  FiHelpCircle,
  FiLogOut,
} from 'react-icons/fi'

const menuItems = [
  { to: '/dashboard', label: 'Dashboard', icon: FiHome },
  { to: '/browse', label: 'Browse Vehicles', icon: FiTruck },
  { to: '/reservations', label: 'My Reservations', icon: FiCalendar },
  { to: '/history', label: 'Rental History', icon: FiClock },
  { to: '/notifications', label: 'Notifications', icon: FiBell },
  { to: '/feedback', label: 'Feedback', icon: FiMessageSquare },
  { to: '/profile', label: 'My Profile', icon: FiUser },
  { to: '/security', label: 'Security', icon: FiShield },
  { to: '/help', label: 'Help Center', icon: FiHelpCircle },
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

export default function AppLayout({ user, onLogout }) {
  const navigate = useNavigate()

  function handleLogout() {
    onLogout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="w-64 bg-white border-r border-gray-200 fixed h-full z-20 overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 text-white p-1.5 rounded-lg flex-shrink-0">
              <FiTruck className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xl font-bold text-gray-800">FleetOps</span>
              <p className="text-xs text-gray-500">Hollydot Car Rental</p>
            </div>
          </div>
        </div>

        <nav className="p-3 space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition ${
                  isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span className="text-sm font-medium">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}

          <div className="border-t border-gray-200 my-2"></div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 transition"
          >
            <FiLogOut className="h-5 w-5" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
              {initials(user?.name)}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">{user?.name}</p>
              <p className="text-xs text-gray-500">Customer</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 ml-64">
        <div className="p-6">
          <Outlet />
        </div>
      </div>
    </div>
  )
}