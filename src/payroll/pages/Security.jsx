import { Shield, Lock, Mail, CheckCircle, Pencil, Smartphone, Eye } from 'lucide-react'

export default function Security() {
  return (
    <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-200px)] pr-2 pb-10">
      <h2 className="text-xl font-bold text-gray-800">Security</h2>
      <p className="text-sm text-gray-500 -mt-4">Manage your account security settings and monitor account activity.</p>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col xl:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5 flex-1 w-full">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 shrink-0">
            <Shield size={32} />
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-lg">Keep your account secure</h3>
            <p className="text-sm text-gray-500">Your account is protected. Review your security settings and activity regularly.</p>
            <div className="mt-1.5 flex items-center gap-2 text-xs text-green-600 font-medium">
              <CheckCircle size={14} /> All security settings look good
            </div>
          </div>
        </div>

        <div className="flex flex-wrap w-full xl:w-auto justify-between xl:justify-end gap-6 xl:gap-8 border-t xl:border-t-0 pt-4 xl:pt-0 border-gray-100">
          <div className="flex items-center gap-3">
            <Lock className="text-blue-500" size={22} />
            <div><div className="text-xs text-gray-500">Password Strength</div><div className="text-sm font-bold text-green-600">Strong</div></div>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="text-blue-500" size={22} />
            <div><div className="text-xs text-gray-500">Two-Factor Authentication</div><div className="text-sm font-bold text-green-600">Enabled</div></div>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="text-blue-500" size={22} />
            <div><div className="text-xs text-gray-500">Login Notifications</div><div className="text-sm font-bold text-green-600">Enabled</div></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h4 className="font-bold text-blue-600 text-sm mb-4 flex items-center gap-2">
            <Pencil size={16} /> Change Password
          </h4>
          <p className="text-xs text-gray-500 mb-4 -mt-2">Password changes are managed by the system administrator. Contact support for assistance.</p>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1.5">Current Password</label>
              <div className="relative">
                <input type="password" defaultValue="********" disabled className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50" />
                <Eye size={16} className="absolute right-3 top-2.5 text-gray-400" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1.5">New Password</label>
              <div className="relative">
                <input type="password" defaultValue="********" disabled className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50" />
                <Eye size={16} className="absolute right-3 top-2.5 text-gray-400" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1.5">Confirm New Password</label>
              <div className="relative">
                <input type="password" defaultValue="********" disabled className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50" />
                <Eye size={16} className="absolute right-3 top-2.5 text-gray-400" />
              </div>
            </div>
            <button className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              Update Password
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h4 className="font-bold text-blue-600 text-sm mb-1 flex items-center gap-2">
            <Smartphone size={16} /> Two-Factor Authentication (2FA)
          </h4>
          <p className="text-xs text-gray-500 mb-6">Add an extra layer of security to your account.</p>
          <div className="flex flex-col md:flex-row justify-between gap-6">
            <div className="space-y-3 flex-1">
              <div className="flex justify-between text-sm border-b border-gray-100 pb-1.5"><span className="text-gray-500">Status</span><span className="text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded text-[10px]">Enabled</span></div>
              <div className="flex justify-between text-sm border-b border-gray-100 pb-1.5"><span className="text-gray-500">Method</span><span className="font-medium text-gray-800">Authenticator App (TOTP)</span></div>
              <div className="flex justify-between text-sm border-b border-gray-100 pb-1.5"><span className="text-gray-500">Backup Codes</span><span className="font-medium text-gray-800">8 of 10 remaining</span></div>
            </div>
            <div className="w-28 h-40 bg-blue-50/80 rounded-xl border-2 border-blue-200 flex flex-col items-center justify-center text-blue-500 relative shrink-0 mx-auto md:mx-0 shadow-sm">
              <Smartphone size={32} className="mb-2" />
              <div className="text-[10px] text-blue-600 font-bold tracking-widest flex gap-1 mt-2">
                <span>6</span><span>7</span><span>8</span><span>9</span><span>1</span><span>2</span>
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button className="flex-1 py-2 border border-blue-600 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors">View Backup Codes</button>
            <button className="flex-1 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Disable 2FA</button>
          </div>
        </div>
      </div>

      <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-start gap-3 w-full">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 shrink-0"><Shield size={20} /></div>
          <div>
            <h4 className="font-bold text-gray-800 text-sm">Security Tips</h4>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-2 text-[11px] text-gray-700 font-medium">
              <div className="flex items-center gap-2"><CheckCircle size={14} className="text-blue-500" /> Use a strong password and change it regularly.</div>
              <div className="flex items-center gap-2"><CheckCircle size={14} className="text-blue-500" /> Do not share your account with anyone.</div>
              <div className="flex items-center gap-2"><CheckCircle size={14} className="text-blue-500" /> Enable two-factor authentication for extra security.</div>
              <div className="flex items-center gap-2"><CheckCircle size={14} className="text-blue-500" /> Log out when using shared devices.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}