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
      <div className="page-head">
        <div>
          <h1>Feedback</h1>
          <p className="page-head__sub">We value your feedback! Share your experience and help us improve our services.</p>
        </div>
      </div>

      {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}
      {success && <div className="success-banner" style={{ marginBottom: 16 }}>{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 22, alignItems: 'start' }}>
        <section className="card">
          <div className="card__header">
            <div>
              <div className="card__title">My Feedback</div>
              <div className="card__sub">View the feedback you've submitted.</div>
            </div>
          </div>
          <div className="card__body">
            {feedbackList.length === 0 ? (
              <div className="empty-state">
                <FiMessageSquare size={36} />
                <div className="empty-state__title">No feedback submitted yet</div>
                <div className="empty-state__sub">Your submitted feedback will appear here.</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 14 }}>
                {feedbackList.map((feedback) => (
                  <div key={feedback.id} style={{ paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 2 }}>
                      {[...Array(5)].map((_, i) => (
                        <FiStar
                          key={i}
                          size={16}
                          style={{ color: i < feedback.rating ? 'var(--warning)' : 'var(--text-faint)', fill: i < feedback.rating ? 'var(--warning)' : 'transparent' }}
                        />
                      ))}
                      <span className="muted" style={{ fontSize: 13, marginLeft: 4 }}>{feedback.rating}.0</span>
                    </div>

                    <p style={{ marginTop: 8 }}>{feedback.comment}</p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                      <span className="faint" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                        <FiCalendar size={14} /> {feedback.date}
                      </span>
                      {feedback.reservationId && (
                        <span className="faint" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                          <FiMessageSquare size={14} /> RES-{String(feedback.reservationId).padStart(4, '0')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <div style={{ display: 'grid', gap: 16 }}>
          <section className="card">
            <div className="card__header">
              <div className="card__title">Feedback Summary</div>
            </div>
            <div className="card__body" style={{ display: 'grid', gap: 8 }}>
              {[5, 4, 3, 2, 1].map((star) => (
                <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="muted" style={{ width: 58, fontSize: 13 }}>{star} ⭐</span>
                  <div style={{ flex: 1, height: 8, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        background: 'var(--warning)',
                        borderRadius: 999,
                        width: `${total > 0 ? (ratingCounts[star] / total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="faint" style={{ fontSize: 12, width: 36, textAlign: 'right' }}>({ratingCounts[star]})</span>
                </div>
              ))}
              <div style={{ marginTop: 6, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                <p style={{ fontWeight: 700 }}>Total Feedback: {total}</p>
              </div>
            </div>
          </section>

          <form onSubmit={handleSubmit} className="card">
            <div className="card__header">
              <div className="card__title">Submit New Feedback</div>
            </div>
            <div className="card__body" style={{ display: 'grid', gap: 12 }}>
              <div className="form-group">
                <span className="form-label">Rating:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormData({ ...formData, rating: star })}
                      style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer' }}
                      aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                    >
                      <FiStar
                        size={22}
                        style={{ color: star <= formData.rating ? 'var(--warning)' : 'var(--text-faint)', fill: star <= formData.rating ? 'var(--warning)' : 'transparent' }}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="fb-comment">Comment</label>
                <textarea
                  id="fb-comment"
                  required
                  placeholder="Share your experience..."
                  rows="3"
                  value={formData.comment}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  className="form-textarea"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="fb-reservation">Reservation ID (optional)</label>
                <input
                  id="fb-reservation"
                  type="text"
                  placeholder="e.g., BK-2026-0001"
                  value={formData.reservation}
                  onChange={(e) => setFormData({ ...formData, reservation: e.target.value })}
                  className="form-input"
                />
              </div>
              <button type="submit" disabled={submitting} className="btn btn--primary btn--block">
                <FiSend size={16} />
                {submitting ? 'Submitting…' : 'Submit Feedback'}
              </button>
            </div>
          </form>

          <section className="card" style={{ background: 'var(--warning-soft)', borderColor: 'var(--warning)' }}>
            <div className="card__body">
              <h3 style={{ marginBottom: 4 }}>We're Here to Help</h3>
              <p className="muted" style={{ fontSize: 13 }}>Have an issue that needs immediate attention?</p>
              <p style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: 'var(--warning)' }}>📞 0912 345 6789 · support@hollydot.com</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}