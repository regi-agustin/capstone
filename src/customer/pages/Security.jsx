import { useState } from 'react'
import { FiShield, FiLock, FiUser, FiClock, FiCheckCircle, FiAlertCircle } from 'react-icons/fi'

export default function Security() {
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' })
  const [notice, setNotice] = useState('')

  const loginActivity = [
    { id: 1, device: 'Windows · Chrome', location: 'Pampanga, Philippines', status: 'Current Session', time: 'Now' },
    { id: 2, device: 'Android · Chrome', location: 'Pampanga, Philippines', status: 'Active', time: '2 hours ago' },
    { id: 3, device: 'Windows · Edge', location: 'Pampanga, Philippines', status: 'Active', time: '1 day ago' },
  ]

  function handleUpdate(e) {
    e.preventDefault()
    if (passwords.new !== passwords.confirm) {
      setNotice('New password and confirmation do not match.')
      return
    }
    if (passwords.new.length < 8) {
      setNotice('Password must be at least 8 characters.')
      return
    }
    setNotice('Password change is handled by the administrator. Please contact support.')
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Security</h1>
      <p className="text-gray-500 mb-6">Manage your account security and authentication settings.</p>

      {notice && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-sm">{notice}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Face Recognition Authentication</h3>
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FiShield className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-800">Enabled</p>
                  <p className="text-sm text-gray-600">Face recognition is used to securely verify your identity when logging in.</p>
                </div>
              </div>
              <div className="text-right">
                <span className="px-2 py-1 bg-green-200 text-green-700 text-xs rounded-full">Active</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleUpdate} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Change Password</h3>
            <p className="text-sm text-gray-500 mb-4">Update your password regularly to keep your account secure.</p>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Current Password</label>
                <input
                  type="password"
                  value={passwords.current}
                  onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter current password"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">New Password</label>
                <input
                  type="password"
                  value={passwords.new}
                  onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter new password"
                />
                <p className="text-xs text-gray-500 mt-1">Use at least 8 characters with a mix of letters, numbers, and symbols.</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Confirm new password"
                />
              </div>
              <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
                Update Password
              </button>
            </div>
          </form>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Login Activity</h3>
            <p className="text-sm text-gray-500 mb-4">Review your recent account activity.</p>

            <div className="space-y-3">
              {loginActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${activity.status === 'Current Session' ? 'bg-blue-100' : 'bg-gray-200'}`}>
                      <FiUser className={`h-4 w-4 ${activity.status === 'Current Session' ? 'text-blue-600' : 'text-gray-500'}`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{activity.device}</p>
                      <p className="text-sm text-gray-500">{activity.location}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {activity.status === 'Current Session' ? (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">Current Session</span>
                    ) : (
                      <span className="text-xs text-gray-500">{activity.status} • {activity.time}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center space-x-3 mb-3">
              <FiCheckCircle className="h-6 w-6 text-green-500" />
              <div>
                <h3 className="font-semibold text-gray-800">Account Protection</h3>
                <p className="text-sm text-green-600">Your account is protected</p>
              </div>
            </div>
            <div className="border-t border-gray-100 pt-3">
              <p className="text-sm text-gray-500">Last security check:</p>
              <p className="font-medium text-gray-800">Today</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-800 mb-3">Security Tips</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start space-x-2">
                <FiLock className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <span>Keep your password strong and unique.</span>
              </li>
              <li className="flex items-start space-x-2">
                <FiAlertCircle className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <span>Do not share your account information with anyone.</span>
              </li>
              <li className="flex items-start space-x-2">
                <FiClock className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <span>Always log out after using a public or shared device.</span>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-800 mb-2">Need Help?</h3>
            <p className="text-sm text-gray-600">We're here to help you keep your account secure.</p>
            <p className="mt-3 text-sm font-medium text-blue-700">📞 0912 345 6789 · support@hollydot.com</p>
          </div>
        </div>
      </div>
    </div>
  )
}