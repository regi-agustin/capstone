import { useEffect, useState } from 'react'
import { FiStar, FiMessageSquare, FiCalendar, FiSend } from 'react-icons/fi'
import { fetchMyFeedback, submitFeedback } from '../services/customerService.js'

export default function Feedback() {
  const [feedbackList, setFeedbackList] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formData, setFormData] = useState({ rating: 5, comment: '', reservation: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchMyFeedback()
      .then(setFeedbackList)
      .catch((e) => setError(e.message))
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      const reservationId = formData.reservation
        ? Number(formData.reservation.replace(/\D/g, '').slice(-4))
        : 0
      await submitFeedback({ rating: formData.rating, comment: formData.comment, reservationId })
      setSuccess('Thank you for your feedback!')
      setFormData({ rating: 5, comment: '', reservation: '' })
      const list = await fetchMyFeedback()
      setFeedbackList(list)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  for (const f of feedbackList) ratingCounts[f.rating]++
  const total = feedbackList.length

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Feedback</h1>
      <p className="text-gray-500 mb-6">We value your feedback! Share your experience and help us improve our services.</p>

      {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>}
      {success && <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm">{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">My Feedback</h2>
          <p className="text-sm text-gray-500 mb-4">View the feedback you've submitted.</p>

          {feedbackList.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center">
              <p className="text-gray-500">No feedback submitted yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {feedbackList.map((feedback) => (
                <div key={feedback.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <div className="flex items-center space-x-1 mt-1">
                    {[...Array(5)].map((_, i) => (
                      <FiStar key={i} className={`h-4 w-4 ${i < feedback.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                    ))}
                    <span className="text-sm text-gray-500 ml-1">{feedback.rating}.0</span>
                  </div>

                  <p className="text-sm text-gray-600 mt-2">{feedback.comment}</p>

                  <div className="flex items-center space-x-4 mt-3 pt-3 border-t border-gray-100 text-sm text-gray-500">
                    <span className="flex items-center">
                      <FiCalendar className="h-3 w-3 mr-1" /> {feedback.date}
                    </span>
                    {feedback.reservationId && (
                      <span className="flex items-center">
                        <FiMessageSquare className="h-3 w-3 mr-1" /> RES-{String(feedback.reservationId).padStart(4, '0')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-800 mb-3">Feedback Summary</h3>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((star) => (
                <div key={star} className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1 w-16">
                    <span className="text-sm text-gray-600">{star} ⭐</span>
                  </div>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 rounded-full"
                      style={{ width: `${total > 0 ? (ratingCounts[star] / total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-8">({ratingCounts[star]})</span>
                </div>
              ))}
              <div className="mt-2 pt-2 border-t border-gray-100">
                <p className="text-sm font-medium text-gray-800">Total Feedback: {total}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-800 mb-3">Submit New Feedback</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Rating:</span>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFormData({ ...formData, rating: star })}
                    className="focus:outline-none"
                  >
                    <FiStar className={`h-5 w-5 ${star <= formData.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                  </button>
                ))}
              </div>
              <textarea
                required
                placeholder="Share your experience..."
                rows="3"
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Reservation ID (e.g., BK-2026-0001) — optional"
                value={formData.reservation}
                onChange={(e) => setFormData({ ...formData, reservation: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-medium flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <FiSend className="h-4 w-4" />
                <span>{submitting ? 'Submitting...' : 'Submit Feedback'}</span>
              </button>
            </div>
          </form>

          <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
            <h3 className="font-semibold text-gray-800 mb-2">We're Here to Help</h3>
            <p className="text-sm text-gray-600">Have an issue that needs immediate attention?</p>
            <p className="mt-3 text-sm font-medium text-blue-700">📞 0912 345 6789 · support@hollydot.com</p>
          </div>
        </div>
      </div>
    </div>
  )
}