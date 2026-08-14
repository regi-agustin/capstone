import { useState } from 'react'
import { FiBook, FiMapPin, FiFileText, FiShield, FiMail, FiPhone, FiCheckSquare } from 'react-icons/fi'
import SearchBar from '../../ro/components/SearchBar.jsx'

const helpTopics = [
  { id: 1, title: 'Reservations', description: 'Find answers about booking, modifying, and cancelling your reservations.', icon: FiBook, color: 'var(--primary-dark)' },
  { id: 2, title: 'Pickup & Return', description: 'Learn about pickup locations, return process, and late returns.', icon: FiMapPin, color: 'var(--success)' },
  { id: 3, title: 'Requirements', description: 'Check driver requirements, documents, and rental policies.', icon: FiFileText, color: 'var(--info)' },
  { id: 4, title: 'Policies & Terms', description: 'Read our rental policies, terms, and important information.', icon: FiBook, color: 'var(--warning)' },
  { id: 5, title: 'Account & Security', description: 'Manage your account, security settings, and face recognition.', icon: FiShield, color: 'var(--danger)' },
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
      <div className="page-head">
        <div>
          <h1>Help Center</h1>
          <p className="page-head__sub">Find answers to common questions or get in touch with our support team.</p>
        </div>
      </div>

      <section className="card" style={{ marginBottom: 22 }}>
        <div className="card__header">
          <div className="card__title">How can we help you?</div>
        </div>
        <div className="card__body">
          <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search for help articles…" />
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 22, alignItems: 'start' }}>
        <div>
          <h3 style={{ fontSize: 16, marginBottom: 14 }}>Browse Help Topics</h3>
          {filteredTopics.length === 0 ? (
            <div className="empty-state">
              <FiBook size={36} />
              <div className="empty-state__title">No help topics match your search</div>
              <div className="empty-state__sub">Try different keywords or browse all topics.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {filteredTopics.map((topic) => (
                <section key={topic.id} className="card">
                  <div className="card__body">
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div
                        className="stat-card__icon"
                        style={{ width: 42, height: 42, background: 'var(--surface-2)', color: topic.color }}
                      >
                        <topic.icon size={20} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: 14 }}>{topic.title}</h4>
                        <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>{topic.description}</p>
                      </div>
                    </div>
                  </div>
                </section>
              ))}
            </div>
          )}

          <section className="card" style={{ marginTop: 16 }}>
            <div className="card__header">
              <div className="card__title">Popular Articles</div>
            </div>
            <div className="card__body" style={{ display: 'grid', gap: 8 }}>
              {popularArticles.map((article, idx) => (
                <div
                  key={idx}
                  className="btn btn--secondary btn--block"
                  style={{ justifyContent: 'space-between', textAlign: 'left' }}
                >
                  <span>{article}</span>
                  <span style={{ color: 'var(--primary-dark)' }}>→</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          <section className="card">
            <div className="card__header">
              <div className="card__title">Need More Help?</div>
            </div>
            <div className="card__body" style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <FiPhone size={18} style={{ color: 'var(--primary-dark)', marginTop: 2 }} />
                <div>
                  <p style={{ fontWeight: 600, color: 'var(--ink)' }}>Call Us</p>
                  <p className="muted" style={{ fontSize: 13 }}>0912 345 6789</p>
                  <p className="faint" style={{ fontSize: 12 }}>Mon - Sat: 8:00 AM - 6:00 PM</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <FiMail size={18} style={{ color: 'var(--primary-dark)', marginTop: 2 }} />
                <div>
                  <p style={{ fontWeight: 600, color: 'var(--ink)' }}>Email Us</p>
                  <p className="muted" style={{ fontSize: 13 }}>support@hollydot.com</p>
                  <p className="faint" style={{ fontSize: 12 }}>We usually reply within 24 hours</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <FiMapPin size={18} style={{ color: 'var(--primary-dark)', marginTop: 2 }} />
                <div>
                  <p style={{ fontWeight: 600, color: 'var(--ink)' }}>Visit Our Office</p>
                  <p className="muted" style={{ fontSize: 13 }}>Clark Freeport Zone, Pampanga</p>
                  <p className="faint" style={{ fontSize: 12 }}>Mon - Sat: 8:00 AM - 6:00 PM</p>
                </div>
              </div>
            </div>
          </section>

          <section className="card" style={{ background: 'var(--warning-soft)', borderColor: 'var(--warning)' }}>
            <div className="card__body">
              <h3 style={{ marginBottom: 4 }}>Before You Contact Us</h3>
              <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
                Please have the following information ready so we can assist you faster.
              </p>
              <div style={{ display: 'grid', gap: 8 }}>
                <label className="toggle-wrap" style={{ gap: 10, fontSize: 13 }}>
                  <FiCheckSquare size={16} style={{ color: 'var(--primary-dark)' }} />
                  <span>Reservation ID (if applicable)</span>
                </label>
                <label className="toggle-wrap" style={{ gap: 10, fontSize: 13 }}>
                  <FiCheckSquare size={16} style={{ color: 'var(--primary-dark)' }} />
                  <span>Full name on the reservation</span>
                </label>
                <label className="toggle-wrap" style={{ gap: 10, fontSize: 13 }}>
                  <FiCheckSquare size={16} style={{ color: 'var(--primary-dark)' }} />
                  <span>Phone number or email address</span>
                </label>
                <label className="toggle-wrap" style={{ gap: 10, fontSize: 13 }}>
                  <FiCheckSquare size={16} style={{ color: 'var(--primary-dark)' }} />
                  <span>Details of your concern</span>
                </label>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}