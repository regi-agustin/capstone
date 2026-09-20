import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Icon } from './Icons.jsx'

function initialsOf(name = '') {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('') || '?'
  )
}

const COLLAPSE_KEY = 'fleetops.sidebar.collapsed'

// Shared app shell (sidebar + topbar + content). Every dashboard — current and
// future — renders through this component so the whole system keeps one GUI.
//
// groups: [{ label, items: [{ key | to, label, icon, soon?, end?, onClick? }] }]
//   - items with `to` render as router NavLinks (active state from the route)
//   - items with `key` render as buttons; active when `activeKey` matches,
//     navigation goes through `onNavigate` (or the item's own `onClick`)
export default function AppShell({
  groups = [],
  activeKey,
  onNavigate,
  role,
  roleSub,
  user = '',
  userSub,
  userImage,
  title,
  crumb,
  topbarExtra,
  onLogout,
  children,
}) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1'
    } catch {
      return false
    }
  })
  const [mobileOpen, setMobileOpen] = useState(false)

  function toggleCollapsed() {
    setCollapsed((v) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, v ? '0' : '1')
      } catch {
        /* ignore */
      }
      return !v
    })
  }

  function closeMobile() {
    setMobileOpen(false)
  }

  return (
    <div className={`app${collapsed ? ' sidebar-collapsed' : ''}${mobileOpen ? ' sidebar-open' : ''}`}>
      <div className="sidebar-backdrop" onClick={closeMobile} />
      <aside className="sidebar">
        <div className="logo" onClick={closeMobile}>
          <div className="logo-mark">FO</div>
          FleetOps
        </div>
        <nav className="nav">
          {groups.map((group, gi) => (
            <div key={group.label || gi}>
              {group.label && (
                <div className="nav-label" style={gi > 0 ? { marginTop: 18 } : undefined}>
                  {group.label}
                </div>
              )}
              {group.items.map((item) => {
                const I = item.icon
                if (item.to) {
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      title={item.label}
                      onClick={closeMobile}
                      className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                    >
                      <I size={18} /> {item.label}
                    </NavLink>
                  )
                }
                return (
                  <button
                    key={item.key}
                    className={`nav-item ${activeKey === item.key ? 'active' : ''} ${item.soon ? 'badge-row' : ''}`}
                    onClick={() => {
                      if (item.soon) return
                      closeMobile()
                      if (item.onClick) item.onClick()
                      else if (onNavigate) onNavigate(item.key)
                    }}
                    title={item.soon ? 'Coming soon' : item.label}
                  >
                    <I size={18} /> {item.label}
                    {item.soon && (
                      <span
                        style={{
                          fontSize: 10,
                          background: 'rgba(255,255,255,.15)',
                          borderRadius: 999,
                          padding: '2px 7px',
                          letterSpacing: 0.5,
                        }}
                      >
                        SOON
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>
        <div className="role-chip">
          <strong>{role}</strong>
          <span>{roleSub}</span>
        </div>
        <button
          type="button"
          className="collapse-btn"
          onClick={toggleCollapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <Icon.chevronsRight size={18} /> : <Icon.chevronsLeft size={18} />}
          <span>{collapsed ? 'Expand' : 'Collapse'}</span>
        </button>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="sidebar-toggle"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              title="Menu"
            >
              <Icon.menu size={20} />
            </button>
            <div className="topbar-title">
              <h2>{title}</h2>
              <div className="crumb">{crumb}</div>
            </div>
          </div>
          <div className="topbar-right">
            {topbarExtra}
            <div className="avatar">
              {userImage ? (
                <img
                  src={userImage}
                  alt={`${user} profile`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                initialsOf(user)
              )}
            </div>
            <div className="topbar-name" style={{ lineHeight: 1.2 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{user}</div>
              <div className="cell-sub">{userSub}</div>
            </div>
            <button className="logout-btn" onClick={onLogout}>
              <Icon.logout width={14} height={14} /> Log out
            </button>
          </div>
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  )
}