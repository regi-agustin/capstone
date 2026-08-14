import { useState } from 'react'
import { FiSearch, FiBook, FiMapPin, FiFileText, FiShield, FiMail, FiPhone, FiCheckSquare } from 'react-icons/fi'

const helpTopics = [
  { id: 1, title: 'Reservations', description: 'Find answers about booking, modifying, and cancelling your reservations.', icon: FiBook, color: 'text-blue-600' },
  { id: 2, title: 'Pickup & Return', description: 'Learn about pickup locations, return process, and late returns.', icon: FiMapPin, color: 'text-green-600' },
  { id: 3, title: 'Requirements', description: 'Check driver requirements, documents, and rental policies.', icon: FiFileText, color: 'text-purple-600' },
  { id: 4, title: 'Policies & Terms', description: 'Read our rental policies, terms, and important information.', icon: FiBook, color: 'text-orange-600' },
  { id: 5, title: 'Account & Security', description: 'Manage your account, security settings, and face recognition.', icon: FiShield, color: 'text-red-600' },
]

const popularArticles = [
  'How do I make a reservation?',
  'What documents do I need to rent a car?',
  'How do I modify or cancel my reservation?',
  'What happens if I return the car late?',
  'How does face recognition login work?',
]

export default function HelpCenter() {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredTopics = helpTopics.filter(
    (t) => !searchTerm || `${t.title} ${t.description}`.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Help Center</h1>
      <p className="text-gray-500 mb-6">Find answers to common questions or get in touch with our support team.</p>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="font-semibold text-gray-800 mb-3">How can we help you?</h3>
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search for help articles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Browse Help Topics</h3>
          {filteredTopics.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center">
              <p className="text-gray-500">No help topics match your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTopics.map((topic) => (
                <div key={topic.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition">
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 bg-gray-50 rounded-lg ${topic.color}`}>
                      <topic.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">{topic.title}</h4>
                      <p className="text-sm text-gray-500 mt-1">{topic.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Popular Articles</h3>
            <div className="space-y-3">
              {popularArticles.map((article, idx) => (
                <div key={idx} className="w-full text-left flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition">
                  <span className="text-sm text-gray-700">{article}</span>
                  <span className="text-blue-600 text-sm">→</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-800 mb-3">Need More Help?</h3>
            <p className="text-sm text-gray-600 mb-4">Our support team is here to assist you.</p>

            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <FiPhone className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-800">Call Us</p>
                  <p className="text-sm text-gray-600">0912 345 6789</p>
                  <p className="text-xs text-gray-500">Mon - Sat: 8:00 AM - 6:00 PM</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <FiMail className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-800">Email Us</p>
                  <p className="text-sm text-gray-600">support@hollydot.com</p>
                  <p className="text-xs text-gray-500">We usually reply within 24 hours</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <FiMapPin className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-800">Visit Our Office</p>
                  <p className="text-sm text-gray-600">Clark Freeport Zone, Pampanga</p>
                  <p className="text-xs text-gray-500">Mon - Sat: 8:00 AM - 6:00 PM</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
            <h3 className="font-semibold text-gray-800 mb-3">Before You Contact Us</h3>
            <p className="text-sm text-gray-600 mb-3">Please have the following information ready so we can assist you faster.</p>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-sm text-gray-700">
                <FiCheckSquare className="h-4 w-4 text-blue-600" />
                <span>Reservation ID (if applicable)</span>
              </label>
              <label className="flex items-center space-x-2 text-sm text-gray-700">
                <FiCheckSquare className="h-4 w-4 text-blue-600" />
                <span>Full name on the reservation</span>
              </label>
              <label className="flex items-center space-x-2 text-sm text-gray-700">
                <FiCheckSquare className="h-4 w-4 text-blue-600" />
                <span>Phone number or email address</span>
              </label>
              <label className="flex items-center space-x-2 text-sm text-gray-700">
                <FiCheckSquare className="h-4 w-4 text-blue-600" />
                <span>Details of your concern</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}