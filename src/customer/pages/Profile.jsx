import { useEffect, useState } from 'react'
import { FiCalendar, FiClock, FiBell, FiShield } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { fetchProfile } from '../services/customerService.js'

export default function Profile({ user }) {
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    fetchProfile()
      .then(setProfile)
      .catch(() => {})
  }, [])

  const account = profile?.account || {
    name: user?.name || 'Customer',
    email: '',
    contactNumber: '',
    memberSince: '',
  }

  const initials = account.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">My Profile</h1>
      <p className="text-gray-500 mb-6">Manage your personal information and account settings.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <div className="h-20 w-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-3xl font-bold">
                  {initials}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{account.name}</h2>
                  <p className="text-gray-500">
                    Member since {account.memberSince ? new Date(account.memberSince).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Verified</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">Customer Account</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Account Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Full Name</p>
                <p className="font-medium text-gray-800">{account.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Username</p>
                <p className="font-medium text-gray-800">{account.username || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email Address</p>
                <p className="font-medium text-gray-800">{account.email || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone Number</p>
                <p className="font-medium text-gray-800">{account.contactNumber || '—'}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">Keep your account information up to date to ensure a smooth rental experience.</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-800 mb-3">Quick Links</h3>
            <div className="space-y-2">
              <Link to="/reservations" className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-600 flex items-center space-x-2">
                <FiCalendar className="h-4 w-4" />
                <span>My Reservations</span>
              </Link>
              <Link to="/history" className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-600 flex items-center space-x-2">
                <FiClock className="h-4 w-4" />
                <span>Rental History</span>
              </Link>
              <Link to="/notifications" className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-600 flex items-center space-x-2">
                <FiBell className="h-4 w-4" />
                <span>Notifications</span>
              </Link>
              <Link to="/security" className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-600 flex items-center space-x-2">
                <FiShield className="h-4 w-4" />
                <span>Security</span>
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-800 mb-2">Need Help?</h3>
            <p className="text-sm text-gray-600">We're here to help you! If you need any assistance with your account.</p>
            <p className="mt-3 text-sm font-medium text-blue-700">📞 0912 345 6789 · support@hollydot.com</p>
          </div>
        </div>
      </div>
    </div>
  )
}