import {
  Search,
  HelpCircle,
  MessageSquare,
  FileText,
  Users,
  UserCheck,
  Bell,
  Shield,
  User,
  FileQuestion,
  CheckCircle,
  Info,
  ChevronRight,
} from 'lucide-react'

const topics = [
  { icon: FileText, cls: 'bg-blue-50 text-blue-600', title: 'Payroll Management', desc: 'Manage payroll periods, cut-off, driver payroll records, verification and completion.' },
  { icon: Users, cls: 'bg-green-50 text-green-600', title: 'Driver Records', desc: 'Add, update and manage driver information and details.' },
  { icon: UserCheck, cls: 'bg-orange-50 text-orange-600', title: 'Driver Attendance (OCR)', desc: 'Understand OCR attendance verification, mismatches, and missing attendance.' },
  { icon: Bell, cls: 'bg-purple-50 text-purple-600', title: 'Notifications', desc: 'Learn about system notifications, alerts and reminders.' },
  { icon: Shield, cls: 'bg-teal-50 text-teal-600', title: 'Security', desc: 'Learn about account security, access control and data protection.' },
  { icon: User, cls: 'bg-yellow-50 text-yellow-600', title: 'My Profile', desc: 'Manage your profile information and account settings.' },
  { icon: HelpCircle, cls: 'bg-red-50 text-red-600', title: 'Troubleshooting', desc: 'Find solutions to common issues and system errors.' },
  { icon: FileQuestion, cls: 'bg-indigo-50 text-indigo-600', title: 'System Guides', desc: 'Step-by-step guides and best practices for using FleetOps.' },
]

const articles = [
  'How OCR Attendance Verification Works',
  'How to Process Driver Payroll',
  'Understanding Payroll Cut-off',
  'What to Do When Attendance is Missing',
  'Understanding Payroll Verification',
]

export default function HelpCenter() {
  return (
    <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-200px)] pr-2 pb-10">
      <h2 className="text-xl font-bold text-gray-800">Help Center</h2>
      <p className="text-sm text-gray-500 -mt-4">Find answers, guides, and support for using FleetOps.</p>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex-1 relative shadow-sm flex flex-col md:flex-row gap-6 items-center">
          <div className="w-40 h-40 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
            <div className="text-blue-500 text-6xl">👩‍💻</div>
          </div>
          <div className="w-full">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">How can we help you?</h2>
            <p className="text-gray-500 text-sm mb-4">Search for articles, guides, and troubleshooting steps.</p>
            <div className="relative w-full">
              <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search for help topics, articles, or keywords..."
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 w-full md:w-80 shrink-0 shadow-sm flex flex-col justify-center items-center text-center">
          <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-3"><HelpCircle size={28} /></div>
          <h4 className="text-base font-bold text-gray-800">Can't find what you need?</h4>
          <p className="text-xs text-gray-500 mb-4">Our support team is here to help.</p>
          <button className="w-full py-2 border border-blue-600 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 flex justify-center items-center gap-2">
            <MessageSquare size={16} /> Contact Support
          </button>
          <p className="text-xs text-gray-500 mt-3">or email us at <br /> <span className="text-blue-600">support@hollydotcarrental.com</span></p>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-bold text-gray-800 mb-4">Browse Help Topics</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {topics.map((t) => (
            <div key={t.title} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className={`w-10 h-10 ${t.cls} rounded-lg flex items-center justify-center mb-3`}><t.icon size={20} /></div>
              <h5 className="font-bold text-gray-800 text-sm mb-1">{t.title}</h5>
              <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">{t.desc}</p>
              <button className="text-blue-600 text-xs font-medium hover:underline inline-flex items-center">View Articles <ChevronRight size={14} className="ml-1" /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm lg:col-span-2">
          <h4 className="text-sm font-bold text-gray-800 mb-4">Popular Articles</h4>
          <div>
            {articles.map((a) => (
              <div key={a} className="flex justify-between items-center p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer rounded transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-blue-50 rounded flex items-center justify-center text-blue-500"><FileText size={12} /></div>
                  <span className="text-sm font-medium text-gray-700">{a}</span>
                </div>
                <div className="text-gray-400"><ChevronRight size={16} /></div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-1">
            <h4 className="text-sm font-bold text-gray-800">System Status</h4>
            <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-medium"><CheckCircle size={10} /> All Systems Operational</span>
          </div>
          <p className="text-[11px] text-gray-500 mb-4">All systems are running smoothly.</p>
          <div className="border-t border-gray-100 pt-3">
            {['Web Application', 'Database', 'OCR Service', 'File Storage', 'Email Service'].map((s) => (
              <div key={s} className="flex justify-between items-center py-1.5 text-xs">
                <span className="text-gray-700 flex items-center gap-2"><CheckCircle size={12} className="text-green-600" /> {s}</span>
                <span className="text-green-600 font-medium">Operational</span>
                <span className="text-gray-500">100%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white shrink-0"><Info size={20} /></div>
          <div>
            <h4 className="font-bold text-gray-800 text-sm">Still need help?</h4>
            <p className="text-xs text-gray-600 mt-0.5">If you can't find the answer you're looking for, our support team is ready to assist you.</p>
          </div>
        </div>
        <button className="w-full sm:w-auto px-6 py-2.5 bg-white border border-blue-600 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 flex items-center justify-center gap-2 shrink-0 transition-colors">
          <MessageSquare size={16} /> Contact Support
        </button>
      </div>
    </div>
  )
}