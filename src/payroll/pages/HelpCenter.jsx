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
  { icon: FileText, title: 'Payroll Management', desc: 'Manage payroll periods, cut-off, driver payroll records, verification and completion.' },
  { icon: Users, title: 'Driver Records', desc: 'Add, update and manage driver information and details.' },
  { icon: UserCheck, title: 'Driver Attendance (OCR)', desc: 'Understand OCR attendance verification, mismatches, and missing attendance.' },
  { icon: Bell, title: 'Notifications', desc: 'Learn about system notifications, alerts and reminders.' },
  { icon: Shield, title: 'Security', desc: 'Learn about account security, access control and data protection.' },
  { icon: User, title: 'My Profile', desc: 'Manage your profile information and account settings.' },
  { icon: HelpCircle, title: 'Troubleshooting', desc: 'Find solutions to common issues and system errors.' },
  { icon: FileQuestion, title: 'System Guides', desc: 'Step-by-step guides and best practices for using FleetOps.' },
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
    <div>
      <div className="page-head">
        <div>
          <h1>Help Center</h1>
          <p className="page-head__sub">Find answers, guides, and support for using FleetOps.</p>
        </div>
      </div>

      <div className="form-grid" style={{ marginBottom: 22 }}>
        <section className="card" style={{ marginBottom: 0 }}>
          <div className="card__body">
            <div className="toolbar" style={{ gap: 22, alignItems: 'center', flexWrap: 'wrap' }}>
              <div
                style={{
                  width: 160,
                  height: 160,
                  borderRadius: '50%',
                  background: 'var(--primary-soft)',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                <div style={{ fontSize: 56 }}>👩‍💻</div>
              </div>
              <div style={{ flex: 1, minWidth: 280 }}>
                <h2 className="card__title" style={{ fontSize: 22, marginBottom: 8 }}>How can we help you?</h2>
                <p className="muted" style={{ marginBottom: 14 }}>Search for articles, guides, and troubleshooting steps.</p>
                <div className="field-icon-wrap">
                  <Search size={18} className="icon-left" />
                  <input
                    type="text"
                    placeholder="Search for help topics, articles, or keywords..."
                    className="form-input"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="card" style={{ marginBottom: 0 }}>
          <div className="card__body" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'var(--primary-soft)',
                color: 'var(--primary-dark)',
                display: 'grid',
                placeItems: 'center',
                marginBottom: 12,
              }}
            >
              <HelpCircle size={28} />
            </div>
            <h4 className="card__title" style={{ marginBottom: 4 }}>Can't find what you need?</h4>
            <p className="cell-sub" style={{ marginBottom: 16 }}>Our support team is here to help.</p>
            <button className="btn btn--primary btn--block" style={{ color: 'var(--primary-dark)', background: 'var(--primary-soft)', borderColor: 'var(--primary)' }}>
              <MessageSquare size={16} /> Contact Support
            </button>
            <p className="cell-sub" style={{ marginTop: 12 }}>
              or email us at <br />
              <span style={{ color: 'var(--primary-dark)', fontWeight: 600 }}>support@hollydotcarrental.com</span>
            </p>
          </div>
        </section>
      </div>

      <div style={{ marginBottom: 22 }}>
        <div className="card__title" style={{ marginBottom: 14 }}>Browse Help Topics</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {topics.map((t) => (
            <section key={t.title} className="card">
              <div className="card__body">
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: 'var(--primary-soft)',
                    color: 'var(--primary-dark)',
                    display: 'grid',
                    placeItems: 'center',
                    marginBottom: 12,
                  }}
                >
                  <t.icon size={20} />
                </div>
                <h5 className="card__title" style={{ fontSize: 14, marginBottom: 4 }}>{t.title}</h5>
                <p className="cell-sub" style={{ marginBottom: 12 }}>{t.desc}</p>
                <button className="toolbar" style={{ gap: 4, border: 'none', background: 'none', padding: 0, fontSize: 12, fontWeight: 500, color: 'var(--primary-dark)' }}>
                  View Articles <ChevronRight size={14} />
                </button>
              </div>
            </section>
          ))}
        </div>
      </div>

      <div className="form-grid">
        <section className="card" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
          <div className="card__header">
            <div className="card__title">Popular Articles</div>
          </div>
          <div className="card__body" style={{ padding: 12 }}>
            {articles.map((a) => (
              <div key={a}>
                <div className="toolbar" style={{ justifyContent: 'space-between', padding: 12, borderRadius: 8, cursor: 'pointer' }}>
                  <div className="toolbar" style={{ gap: 12 }}>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        background: 'var(--primary-soft)',
                        color: 'var(--primary-dark)',
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      <FileText size={12} />
                    </div>
                    <span className="cell-main" style={{ fontWeight: 500 }}>{a}</span>
                  </div>
                  <div className="faint"><ChevronRight size={16} /></div>
                </div>
                {a !== articles[articles.length - 1] && <div className="divider" style={{ margin: '0 12px' }} />}
              </div>
            ))}
          </div>
        </section>

        <section className="card" style={{ marginBottom: 0 }}>
          <div className="card__body">
            <div className="toolbar" style={{ justifyContent: 'space-between', marginBottom: 2 }}>
              <h4 className="card__title">System Status</h4>
              <span className="badge badge--confirmed">
                <CheckCircle size={10} /> All Systems Operational
              </span>
            </div>
            <p className="cell-sub" style={{ marginBottom: 14 }}>All systems are running smoothly.</p>
            <div className="divider" />
            <div style={{ display: 'grid', gap: 6, paddingTop: 10 }}>
              {['Web Application', 'Database', 'OCR Service', 'File Storage', 'Email Service'].map((s) => (
                <div key={s} className="toolbar" style={{ justifyContent: 'space-between', fontSize: 12 }}>
                  <span className="cell-main" style={{ fontWeight: 500, gap: 8 }}>
                    <CheckCircle size={12} style={{ color: 'var(--success)' }} /> {s}
                  </span>
                  <span style={{ color: 'var(--success)', fontWeight: 500 }}>Operational</span>
                  <span className="cell-muted">100%</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="ai-banner" style={{ marginTop: 22, justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div className="toolbar" style={{ gap: 14, alignItems: 'flex-start' }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'var(--navy)',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <Info size={20} />
          </div>
          <div>
            <h4 style={{ fontWeight: 700, color: 'var(--ink)' }}>Still need help?</h4>
            <p style={{ fontSize: 12, marginTop: 2 }}>If you can't find the answer you're looking for, our support team is ready to assist you.</p>
          </div>
        </div>
        <button className="btn btn--primary" style={{ color: 'var(--primary-dark)', background: 'var(--surface)', borderColor: 'var(--primary)' }}>
          <MessageSquare size={16} /> Contact Support
        </button>
      </div>
    </div>
  )
}