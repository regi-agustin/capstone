import { useEffect, useState } from 'react'
import { Mail, Phone, MapPin, Pencil, User, Shield, Settings, Lock, Clock, ChevronRight } from 'lucide-react'
import { fetchProfile, formatDate } from '../services/payrollService.js'

function initials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

const ROLE_LABELS = {
  payroll_officer: 'Payroll Officer',
  customer: 'Customer',
  driver_management_head: 'Driver Management Head',
  reservation_officer: 'Reservation Officer',
  billing_officer: 'Billing Officer',
  superadmin: 'Super Admin',
  admin: 'Admin',
  driver: 'Driver',
}

export default function Profile() {
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchProfile()
      .then(setProfile)
      .catch((e) => setError(e.message))
  }, [])

  if (error) {
    return <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">{error}</div>
  }

  const name = profile?.account?.name || 'Loading...'
  const role = ROLE_LABELS[profile?.role] || profile?.role || ''

  return (
    <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-200px)] pr-2 pb-10">
      <h2 className="text-xl font-bold text-gray-800">My Profile</h2>
      <p className="text-sm text-gray-500 -mt-4">View and manage your personal information and account settings.</p>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row justify-between gap-6">
          <div className="flex flex-col md:flex-row gap-6 w-full md:w-auto">
            <div className="w-24 h-24 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-3xl border-4 border-gray-100 shrink-0">
              {initials(name)}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                {name}
                <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">Active</span>
              </h2>
              <p className="text-gray-500 text-sm mb-2">{role}</p>
              <div className="space-y-1 text-sm text-gray-600">
                <p className="flex items-center gap-2"><Mail size={16} className="text-gray-400" /> {profile?.account?.email || '-'}</p>
                <p className="flex items-center gap-2"><Phone size={16} className="text-gray-400" /> {profile?.account?.contactNumber || '-'}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-8 md:gap-12 pl-0 md:pl-8 border-l-0 md:border-l border-gray-200 w-full md:w-auto">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-4"><span className="text-gray-500">Username</span><span className="font-medium text-gray-800">{profile?.account?.username || '-'}</span></div>
              <div className="flex justify-between gap-4"><span className="text-gray-500">Role</span><span className="font-medium text-gray-800">{role}</span></div>
              <div className="flex justify-between gap-4"><span className="text-gray-500">Member Since</span><span className="font-medium text-gray-800">{formatDate(profile?.account?.memberSince)}</span></div>
              <div className="flex justify-between gap-4"><span className="text-gray-500">Status</span><span className="text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded text-[10px]">Active</span></div>
            </div>
          </div>
        </div>

        <div className="border-b border-gray-200 px-8 flex gap-8">
          <button className="py-4 border-b-2 border-blue-600 text-blue-600 font-medium text-sm">Overview</button>
          <button className="py-4 text-gray-500 hover:text-gray-800 font-medium text-sm">Activity Log</button>
          <button className="py-4 text-gray-500 hover:text-gray-800 font-medium text-sm">Notification Preferences</button>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative">
            <div className="flex justify-between items-center mb-5 border-b border-gray-100 pb-3">
              <h4 className="text-sm font-bold text-blue-600 flex items-center gap-2"><User size={16} /> Personal Information</h4>
              <button className="text-xs text-blue-600 hover:underline flex items-center gap-1 border border-blue-200 px-3 py-1 rounded hover:bg-blue-50 transition-colors" title="Editing is managed by the admin"><Pencil size={12} /> Edit</button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-gray-50 pb-1.5"><span className="text-gray-500">Full Name</span><span className="font-medium text-gray-800">{name}</span></div>
              <div className="flex justify-between border-b border-gray-50 pb-1.5"><span className="text-gray-500">Email Address</span><span className="font-medium text-gray-800 text-xs text-right">{profile?.account?.email || '-'}</span></div>
              <div className="flex justify-between border-b border-gray-50 pb-1.5"><span className="text-gray-500">Phone Number</span><span className="font-medium text-gray-800">{profile?.account?.contactNumber || '-'}</span></div>
              <div className="flex justify-between border-b border-gray-50 pb-1.5"><span className="text-gray-500">Member Since</span><span className="font-medium text-gray-800">{formatDate(profile?.account?.memberSince)}</span></div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative">
            <div className="flex justify-between items-center mb-5 border-b border-gray-100 pb-3">
              <h4 className="text-sm font-bold text-blue-600 flex items-center gap-2"><Shield size={16} /> Account Information</h4>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-gray-50 pb-1.5"><span className="text-gray-500">Username</span><span className="font-medium text-gray-800">{profile?.account?.username || '-'}</span></div>
              <div className="flex justify-between border-b border-gray-50 pb-1.5"><span className="text-gray-500">Role</span><span className="font-medium text-gray-800">{role}</span></div>
              <div className="flex justify-between border-b border-gray-50 pb-1.5"><span className="text-gray-500">Email Address</span><span className="font-medium text-gray-800 text-xs text-right">{profile?.account?.email || '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Status</span><span className="text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded text-[10px]">Active</span></div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative">
            <div className="flex justify-between items-center mb-5 border-b border-gray-100 pb-3">
              <h4 className="text-sm font-bold text-blue-600 flex items-center gap-2"><Settings size={16} /> Preferences</h4>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-gray-50 pb-1.5"><span className="text-gray-500">Language</span><span className="font-medium text-gray-800">English</span></div>
              <div className="flex justify-between border-b border-gray-50 pb-1.5"><span className="text-gray-500">Date Format</span><span className="font-medium text-gray-800">MMM D, YYYY</span></div>
              <div className="flex justify-between border-b border-gray-50 pb-1.5"><span className="text-gray-500">Time Format</span><span className="font-medium text-gray-800">12-hour (AM/PM)</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Timezone</span><span className="font-medium text-gray-800">(GMT+08:00) Asia/Manila</span></div>
            </div>
          </div>
        </div>

        <div className="p-8 pt-0 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative">
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
              <h4 className="text-sm font-bold text-blue-600 flex items-center gap-2"><Lock size={16} /> Security</h4>
              <button className="text-xs text-blue-600 hover:underline flex items-center gap-1 border border-blue-200 px-3 py-1 rounded hover:bg-blue-50 transition-colors"><Lock size={12} /> Change Password</button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-gray-50 pb-1.5"><span className="text-gray-500">Password</span><span className="font-medium text-gray-800 tracking-widest">********</span></div>
              <div className="flex justify-between border-b border-gray-50 pb-1.5"><span className="text-gray-500">Two-Factor Authentication</span><span className="text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded text-[10px]">Enabled</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Login Notifications</span><span className="text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded text-[10px]">Enabled</span></div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative">
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
              <h4 className="text-sm font-bold text-blue-600 flex items-center gap-2"><Clock size={16} /> Recent Account Activity</h4>
              <button className="text-xs text-blue-600 hover:underline flex items-center gap-1"><ChevronRight size={12} /> View All Activity</button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-gray-50 pb-1.5"><span className="text-gray-500">Today</span><span className="font-medium text-gray-800">Logged in</span></div>
              <div className="flex justify-between border-b border-gray-50 pb-1.5"><span className="text-gray-500">Today</span><span className="font-medium text-orange-500">Updated Profile</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Yesterday</span><span className="font-medium text-gray-800">Logged in</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}