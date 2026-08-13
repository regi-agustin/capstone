import { useCallback, useEffect, useState } from 'react'
import { Icon } from '../components/Icons.jsx'
import AppShell from '../components/AppShell.jsx'
import { apiFetch } from '../services/api.js'

const ROLE_LABELS = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  reservation_officer: 'Reservation Officer',
  driver_management_head: 'Driver Mgmt Head',
  payroll_officer: 'Payroll Officer',
  billing_officer: 'Billing Officer',
  driver: 'Driver',
  auditor: 'Auditor',
  customer: 'Customer',
}

const ROLE_OPTIONS = [
  ['superadmin', 'Super Admin'],
  ['admin', 'Admin'],
  ['reservation_officer', 'Reservation Officer'],
  ['driver_management_head', 'Driver Management Head'],
  ['payroll_officer', 'Payroll Officer'],
  ['billing_officer', 'Billing Officer'],
  ['driver', 'Driver'],
  ['auditor', 'Auditor'],
  ['customer', 'Customer'],
]

const NAV = [
  { key: 'overview', label: 'Overview', icon: Icon.dashboard },
  { key: 'accounts', label: 'Accounts', icon: Icon.users },
  { key: 'pricing', label: 'Pricing', icon: Icon.tag },
]

const MODULES = [
  { key: 'dmh', label: 'Driver Management Hub', desc: 'Drivers, fleet, assignments', icon: Icon.clipboard },
  { key: 'ro', label: 'Reservation Desk', desc: 'Bookings & vehicle availability', icon: Icon.eye },
  { key: 'billing', label: 'Billing & Payments', desc: 'Invoices, payments, reports', icon: Icon.dashboard },
]

const DEFAULT_MATRIX = {
  Home: ['View'],
  Accounts: ['View', 'Add', 'Edit', 'Delete'],
  Drivers: ['View', 'Add', 'Edit', 'Delete'],
  Fleet: ['View', 'Add', 'Edit', 'Delete'],
  Assignments: ['View', 'Add', 'Delete'],
  Reservations: ['View', 'Add', 'Edit', 'Delete'],
  Billing: ['View', 'Add', 'Edit', 'Delete'],
  Payroll: ['View'],
  Pricing: ['View', 'Edit'],
}

const PASSWORD_RULE = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};:'",.\/<>?]).{8,}$/

function roleLabel(r) {
  return ROLE_LABELS[r] || r
}

function toPermList(permissions) {
  return (permissions || []).map((p) => ({ scope: p.scope, action: p.action }))
}

export default function AdminApp({ user, onLogout, onSwitchModule }) {
  const [page, setPage] = useState('overview')
  const [me, setMe] = useState(null)
  const [users, setUsers] = useState([])
  const [matrix, setMatrix] = useState(DEFAULT_MATRIX)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadAll = useCallback(async () => {
    const [m, u] = await Promise.all([apiFetch('me.php'), apiFetch('users.php')])
    setMe(m)
    setUsers(u.users || [])
    if (u.matrix) setMatrix(u.matrix)
  }, [])

  useEffect(() => {
    loadAll()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [loadAll])

  // CenSys HasPermission(scope, action): Super Admin bypasses everything
  function can(scope, action) {
    if (!me || me.role === 'superadmin') return true
    return me.permissions.some((p) => p.scope === scope && p.action === action)
  }

  async function run(fn) {
    setError('')
    try {
      await fn()
      await loadAll()
    } catch (e) {
      setError(e.message)
    }
  }

  function handleLogout() {
    onLogout()
    setPage('overview')
  }

  function createAccount(payload) {
    return run(() => apiFetch('users.php', { method: 'POST', body: JSON.stringify(payload) }))
  }

  function editAccount(id, payload) {
    return run(() => apiFetch('users.php', { method: 'PATCH', body: JSON.stringify({ id, edit: payload }) }))
  }

  function toggleStatus(id, status) {
    return run(() => apiFetch('users.php', { method: 'PATCH', body: JSON.stringify({ id, status }) }))
  }

  function resetPassword(id, password) {
    return run(() => apiFetch('users.php', { method: 'PATCH', body: JSON.stringify({ id, password }) }))
  }

  function archiveAccount(id) {
    return run(() => apiFetch(`users.php?id=${id}`, { method: 'DELETE' }))
  }

  const pageMeta = {
    overview: ['Super Admin Console', 'FleetOps / All Dashboards'],
    accounts: ['Accounts', 'FleetOps / Create Account'],
    pricing: ['Pricing Dashboard', 'FleetOps / Dynamic Pricing'],
  }

  return (
    <AppShell
      groups={[
        {
          label: 'Super Admin',
          items: NAV,
        },
        {
          label: 'All Dashboards',
          items: MODULES.map((m) => ({
            key: m.key,
            label: m.label,
            icon: m.icon,
            onClick: () => onSwitchModule(m.key),
          })),
        },
      ]}
      activeKey={page}
      onNavigate={setPage}
      role="Super Admin"
      roleSub="System-wide access"
      user={user}
      userSub="Super Admin"
      title={pageMeta[page][0]}
      crumb={pageMeta[page][1]}
      onLogout={handleLogout}
    >
      {error && <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div>}
      {loading ? (
        <div className="panel">
          <div className="empty">
            <Icon.gauge width={46} height={46} />
            <div className="help">Loading console...</div>
          </div>
        </div>
      ) : (
        <>
          {page === 'overview' && <Overview users={users} onSwitchModule={onSwitchModule} />}
          {page === 'accounts' && (
            <AccountsPage
              users={users}
              matrix={matrix}
              can={can}
              onCreate={createAccount}
              onEdit={editAccount}
              onToggleStatus={toggleStatus}
              onResetPassword={resetPassword}
              onArchive={archiveAccount}
            />
          )}
          {page === 'pricing' && <PricingPage />}
        </>
      )}
    </AppShell>
  )
}

function Overview({ users, onSwitchModule }) {
  const total = users.length
  const active = users.filter((u) => u.status === 'active').length
  const archived = users.filter((u) => u.status === 'inactive').length
  const linkedDrivers = users.filter((u) => u.linkedDriver).length

  const stats = [
    { label: 'Total Accounts', value: total },
    { label: 'Active Accounts', value: active },
    { label: 'Archived / Suspended', value: archived },
    { label: 'Linked Driver Profiles', value: linkedDrivers },
  ]

  return (
    <div>
      <div className="stats">
        {stats.map((s) => (
          <div className="stat" key={s.label}>
            <div className="label">{s.label}</div>
            <div className="value">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="feed" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14 }}>
            <Icon.shield width={17} height={17} /> Dashboards
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, padding: '0 18px 18px' }}>
          {MODULES.map(({ key, label, desc, icon: I }) => (
            <button
              key={key}
              onClick={() => onSwitchModule(key)}
              style={{
                border: '1px solid var(--border)', borderRadius: 12, padding: 16, textAlign: 'left',
                background: '#fff', cursor: 'pointer', display: 'block', width: '100%',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--navy-900)' }}>
                <I width={20} height={20} />
                <span style={{ fontWeight: 700, fontSize: 14 }}>{label}</span>
              </div>
              <div className="cell-sub" style={{ marginTop: 6 }}>{desc}</div>
              <span className="btn btn-primary sm" style={{ marginTop: 12, pointerEvents: 'none' }}>
                Open module <Icon.arrowRight width={12} height={12} style={{ marginLeft: 4, verticalAlign: -2 }} />
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <div className="feed" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14 }}>
            <Icon.key width={16} height={16} /> Security &amp; access controls
          </div>
          <div className="help" style={{ marginTop: 6, maxWidth: 620 }}>
            Each account gets a role plus a fine-grained permission matrix (scope &times; action),
            exactly like the CenSys RBAC model. Super Admin bypasses all checks. Two-factor
            authentication for admin-level logins is on the roadmap.
          </div>
        </div>
      </div>
    </div>
  )
}

function AccountsPage({ users, matrix, can, onCreate, onEdit, onToggleStatus, onResetPassword, onArchive }) {
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [resetTarget, setResetTarget] = useState(null)
  const [archiveTarget, setArchiveTarget] = useState(null)

  const filtered = users.filter((u) => {
    const q = query.trim().toLowerCase()
    const matchesQ =
      !q ||
      u.fullname.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    const matchesRole = roleFilter === 'all' || u.role === roleFilter
    return matchesQ && matchesRole
  })

  return (
    <div>
      <div className="panel">
        <div className="panel-head">
          <div>
            <h3>Accounts</h3>
            <div className="meta">System users, roles, and permission sets</div>
          </div>
          {can('Accounts', 'Add') && (
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <Icon.plus width={15} height={15} style={{ marginRight: 6, verticalAlign: -2 }} /> Create Account
            </button>
          )}
        </div>

        <div className="panel-head" style={{ borderBottom: '1px solid var(--border)', background: '#fbfdff' }}>
          <div className="search" style={{ flex: 1, maxWidth: 320, minWidth: 200 }}>
            <Icon.search width={15} height={15} />
            <input
              placeholder="Search accounts..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ flex: 1, width: 'auto', minWidth: 0 }}
            />
          </div>
          <select
            className="input-std"
            style={{ width: 190 }}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All roles</option>
            {ROLE_OPTIONS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div className="table-wrap">
          <table className="table-dense">
            <thead>
              <tr>
                <th>Account</th>
                <th>Contact</th>
                <th>Role</th>
                <th>Permissions</th>
                <th>Status</th>
                <th>Driver Profile</th>
                <th>Created</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const permGroups = {}
                ;(u.permissions || []).forEach((p) => {
                  ;(permGroups[p.scope] ||= []).push(p.action)
                })
                return (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{u.fullname}</div>
                    <div className="cell-sub mono">@{u.username}</div>
                  </td>
                  <td>
                    <div className="cell-sub">{u.contactNumber || '—'}</div>
                    <div
                      className="cell-sub"
                      style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}
                    >
                      {u.email || '—'}
                    </div>
                  </td>
                  <td>
                    <span className="vehicle-chip" style={{ background: 'var(--navy-900)' }}>
                      {roleLabel(u.role)}
                    </span>
                  </td>
                  <td>
                    {u.role === 'superadmin' ? (
                      <span className="cell-sub">Full access (bypass)</span>
                    ) : (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 230 }}>
                        {Object.entries(permGroups).map(([scope, actions]) => (
                          <span key={scope} className="perm-chip">
                            {scope} {actions.map((a) => a[0].toUpperCase()).join(',')}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`status ${u.status === 'active' ? 'available' : u.status === 'suspended' ? 'unavailable' : 'neutral'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td>
                    {u.linkedDriver ? (
                      <div className="mono" style={{ fontSize: 11.5 }}>
                        {u.linkedDriver.id}
                        {u.linkedDriver.licenseNumber && <span className="cell-sub"> · {u.linkedDriver.licenseNumber}</span>}
                      </div>
                    ) : (
                      <span className="cell-sub">—</span>
                    )}
                  </td>
                  <td className="cell-sub">{u.createdAt?.slice(0, 10)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="actions-row">
                      {can('Accounts', 'Edit') && (
                        <>
                          <button
                            className="btn sm"
                            title="Edit account"
                            onClick={() => setEditTarget(u)}
                          >
                            <Icon.edit width={13} height={13} style={{ marginRight: 4, verticalAlign: -2 }} /> Edit
                          </button>
                          <button
                            className="btn btn-accent sm"
                            title="Reset password"
                            onClick={() => setResetTarget(u)}
                          >
                            <Icon.key width={13} height={13} style={{ marginRight: 4, verticalAlign: -2 }} /> Reset
                          </button>
                          <button
                            className="btn sm"
                            title={u.status === 'active' ? 'Suspend account' : 'Activate account'}
                            onClick={() => onToggleStatus(u.id, u.status === 'active' ? 'suspended' : 'active')}
                          >
                            {u.status === 'active' ? <Icon.lock width={13} height={13} /> : <Icon.unlock width={13} height={13} />}
                            &nbsp;{u.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                        </>
                      )}
                      {can('Accounts', 'Delete') && u.status !== 'inactive' && (
                        <button
                          className="btn btn-danger-ghost sm"
                          title="Archive account"
                          onClick={() => setArchiveTarget(u)}
                        >
                          <Icon.trash width={13} height={13} style={{ marginRight: 4, verticalAlign: -2 }} /> Archive
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="cell-sub" style={{ textAlign: 'center', padding: 24 }}>
                    No accounts match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <CreateAccountModal
          matrix={matrix}
          onClose={() => setShowCreate(false)}
          onSave={async (payload) => {
            await onCreate(payload)
            setShowCreate(false)
          }}
        />
      )}
      {editTarget && (
        <EditAccountModal
          user={editTarget}
          matrix={matrix}
          onClose={() => setEditTarget(null)}
          onSave={async (payload) => {
            await onEdit(editTarget.id, payload)
            setEditTarget(null)
          }}
        />
      )}
      {resetTarget && (
        <ResetPasswordModal
          user={resetTarget}
          onClose={() => setResetTarget(null)}
          onSave={async (password) => {
            await onResetPassword(resetTarget.id, password)
            setResetTarget(null)
          }}
        />
      )}
      {archiveTarget && (
        <ArchiveModal
          user={archiveTarget}
          onClose={() => setArchiveTarget(null)}
          onSave={async () => {
            await onArchive(archiveTarget.id)
            setArchiveTarget(null)
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Permission matrix (CenSys: checkbox per scope x action; Home/View always on;
// unchecking a scope's View cascades to clear its other actions)
// ---------------------------------------------------------------------------
function PermissionMatrix({ matrix, value, onChange, readOnly }) {
  const has = (scope, action) => value.some((p) => p.scope === scope && p.action === action)

  function toggle(scope, action, checked) {
    if (readOnly) return
    let next = value.filter((p) => !(p.scope === scope && p.action === action))
    if (checked) next.push({ scope, action })
    if (!checked && action === 'View') {
      next = next.filter((p) => p.scope !== scope)
    }
    onChange(next)
  }

  return (
    <fieldset>
      <legend>Permissions</legend>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        {Object.entries(matrix).map(([scope, actions]) => {
          const viewOn = has(scope, 'View')
          return (
            <div key={scope} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 6, color: 'var(--navy-800)' }}>{scope}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {actions.map((action) => {
                  const locked = scope === 'Home' && action === 'View'
                  const disabled = readOnly || locked || (action !== 'View' && !viewOn)
                  return (
                    <label key={action} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: disabled && !locked ? 'var(--muted)' : 'var(--text)', cursor: disabled ? 'not-allowed' : 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={has(scope, action) || locked}
                        disabled={disabled}
                        onChange={(e) => toggle(scope, action, e.target.checked)}
                      />
                      {action}
                    </label>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </fieldset>
  )
}

function PasswordFields({ password, confirm, setPassword, setConfirm, visible, setVisible, errors }) {
  return (
    <>
      <div className="form-row">
        <label>Password</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type={visible ? 'text' : 'password'}
            required={!errors.passwordOptional}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="8+ chars, upper, lower, number, symbol"
          />
          <button type="button" className="btn" onClick={() => setVisible(!visible)} title={visible ? 'Hide' : 'Show'}>
            <Icon.eye width={14} height={14} />
          </button>
        </div>
        {errors.password && <div className="help" style={{ color: 'var(--red)' }}>{errors.password}</div>}
        {errors.passwordOptional && <div className="help" style={{ color: 'var(--red)' }}>{errors.passwordOptional}</div>}
      </div>
      <div className="form-row">
        <label>Confirm Password</label>
        <input
          type={visible ? 'text' : 'password'}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Re-enter password"
        />
        {errors.confirm && <div className="help" style={{ color: 'var(--red)' }}>{errors.confirm}</div>}
      </div>
    </>
  )
}

function CreateAccountModal({ matrix, onClose, onSave }) {
  const [form, setForm] = useState({
    username: '',
    fullname: '',
    email: '',
    contactNumber: '',
    password: '',
    confirm: '',
    role: 'driver_management_head',
    licenseNumber: '',
    licenseExpiry: '',
    permissions: [{ scope: 'Home', action: 'View' }],
  })
  const [visible, setVisible] = useState(false)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [serverErr, setServerErr] = useState('')

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  function validate() {
    const errs = {}
    if (form.username.trim().length < 3) errs.username = 'Username must be at least 3 characters.'
    if (form.username.trim().length > 50) errs.username = 'Username cannot exceed 50 characters.'
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) errs.email = 'Invalid email format.'
    if (!form.password) errs.password = 'Password is required.'
    else if (!PASSWORD_RULE.test(form.password)) errs.password = 'Password must be 8+ chars with uppercase, lowercase, number, and symbol.'
    if (form.password !== form.confirm) errs.confirm = 'Passwords do not match.'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function submit(e) {
    e.preventDefault()
    setServerErr('')
    if (!validate()) return
    setSaving(true)
    try {
      await onSave({
        username: form.username.trim(),
        fullname: form.fullname.trim(),
        email: form.email.trim(),
        contactNumber: form.contactNumber.trim(),
        password: form.password,
        role: form.role,
        licenseNumber: form.licenseNumber.trim(),
        licenseExpiry: form.licenseExpiry,
        permissions: toPermList(form.permissions),
      })
    } catch (e2) {
      setServerErr(e2.message)
      setSaving(false)
    }
  }

  const isDriver = form.role === 'driver'

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ width: 760, maxWidth: '94vw' }} onClick={(e) => e.stopPropagation()}>
        <form onSubmit={submit}>
          <div className="modal-head">
            <h3>Create Account</h3>
            <button type="button" className="x" onClick={onClose}>×</button>
          </div>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-row">
                <label>Username</label>
                <input value={form.username} onChange={set('username')} placeholder="e.g. juan.delacruz" />
                {errors.username && <div className="help" style={{ color: 'var(--red)' }}>{errors.username}</div>}
              </div>
              <div className="form-row">
                <label>Full Name</label>
                <input required value={form.fullname} onChange={set('fullname')} placeholder="e.g. Juan Dela Cruz" />
              </div>
              <div className="form-row">
                <label>E-Mail</label>
                <input type="email" value={form.email} onChange={set('email')} placeholder="name@company.com" />
                {errors.email && <div className="help" style={{ color: 'var(--red)' }}>{errors.email}</div>}
              </div>
              <div className="form-row">
                <label>Contact #</label>
                <input value={form.contactNumber} onChange={set('contactNumber')} placeholder="0917 123 4567" />
              </div>
              <div className="form-row">
                <label>Role / Position</label>
                <select value={form.role} onChange={set('role')}>
                  {ROLE_OPTIONS.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label>Show Password</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8 }}>
                  <input type="checkbox" checked={visible} onChange={() => setVisible(!visible)} />
                  <span className="help">Toggle visibility</span>
                </div>
              </div>
              <div className="form-row">
                <label>Password</label>
                <input
                  type={visible ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  placeholder="8+ chars, upper, lower, number, symbol"
                />
                {errors.password && <div className="help" style={{ color: 'var(--red)' }}>{errors.password}</div>}
              </div>
              <div className="form-row">
                <label>Confirm Password</label>
                <input
                  type={visible ? 'text' : 'password'}
                  value={form.confirm}
                  onChange={set('confirm')}
                  placeholder="Re-enter password"
                />
                {errors.confirm && <div className="help" style={{ color: 'var(--red)' }}>{errors.confirm}</div>}
              </div>
              {isDriver && (
                <>
                  <div className="form-row">
                    <label>Driver License No. <span className="cell-sub">(optional)</span></label>
                    <input value={form.licenseNumber} onChange={set('licenseNumber')} placeholder="e.g. D01-23-456789" />
                  </div>
                  <div className="form-row">
                    <label>License Expiry <span className="cell-sub">(optional)</span></label>
                    <input type="date" value={form.licenseExpiry} onChange={set('licenseExpiry')} />
                  </div>
                </>
              )}
            </div>
            {isDriver && (
              <div className="help" style={{ marginTop: 2 }}>
                Providing license details also creates the linked driver profile in the DMH module.
              </div>
            )}
            <PermissionMatrix
              matrix={matrix}
              value={form.permissions}
              onChange={(permissions) => setForm({ ...form, permissions })}
            />
            {serverErr && <div className="error-msg" style={{ marginTop: 10 }}>{serverErr}</div>}
          </div>
          <div className="modal-foot">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EditAccountModal({ user, matrix, onClose, onSave }) {
  const [form, setForm] = useState({
    fullname: user.fullname,
    email: user.email || '',
    contactNumber: user.contactNumber || '',
    role: user.role,
    password: '',
    confirm: '',
    permissions: user.permissions || [{ scope: 'Home', action: 'View' }],
  })
  const [visible, setVisible] = useState(false)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [serverErr, setServerErr] = useState('')

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  function validate() {
    const errs = {}
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) errs.email = 'Invalid email format.'
    if (form.password && !PASSWORD_RULE.test(form.password)) {
      errs.password = 'Password must be 8+ chars with uppercase, lowercase, number, and symbol.'
    }
    if (form.password !== form.confirm) errs.confirm = 'Passwords do not match.'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function submit(e) {
    e.preventDefault()
    setServerErr('')
    if (!validate()) return
    setSaving(true)
    try {
      await onSave({
        fullname: form.fullname.trim(),
        email: form.email.trim(),
        contactNumber: form.contactNumber.trim(),
        role: form.role,
        password: form.password || undefined,
        permissions: toPermList(form.permissions),
      })
    } catch (e2) {
      setServerErr(e2.message)
      setSaving(false)
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ width: 760, maxWidth: '94vw' }} onClick={(e) => e.stopPropagation()}>
        <form onSubmit={submit}>
          <div className="modal-head">
            <h3>Edit Account — @{user.username}</h3>
            <button type="button" className="x" onClick={onClose}>×</button>
          </div>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-row">
                <label>Full Name</label>
                <input required value={form.fullname} onChange={set('fullname')} />
              </div>
              <div className="form-row">
                <label>Role / Position</label>
                <select value={form.role} onChange={set('role')}>
                  {ROLE_OPTIONS.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label>E-Mail</label>
                <input type="email" value={form.email} onChange={set('email')} />
                {errors.email && <div className="help" style={{ color: 'var(--red)' }}>{errors.email}</div>}
              </div>
              <div className="form-row">
                <label>Contact #</label>
                <input value={form.contactNumber} onChange={set('contactNumber')} />
              </div>
              <div className="form-row">
                <label>Password <span className="cell-sub">(blank = keep existing)</span></label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type={visible ? 'text' : 'password'}
                    value={form.password}
                    onChange={set('password')}
                    placeholder="Leave blank to keep existing"
                  />
                  <button type="button" className="btn" onClick={() => setVisible(!visible)} title={visible ? 'Hide' : 'Show'}>
                    <Icon.eye width={14} height={14} />
                  </button>
                </div>
                {errors.password && <div className="help" style={{ color: 'var(--red)' }}>{errors.password}</div>}
              </div>
              <div className="form-row">
                <label>Confirm Password</label>
                <input
                  type={visible ? 'text' : 'password'}
                  value={form.confirm}
                  onChange={set('confirm')}
                  placeholder="Re-enter password"
                />
                {errors.confirm && <div className="help" style={{ color: 'var(--red)' }}>{errors.confirm}</div>}
              </div>
            </div>
            <PermissionMatrix
              matrix={matrix}
              value={form.permissions}
              onChange={(permissions) => setForm({ ...form, permissions })}
            />
            {serverErr && <div className="error-msg" style={{ marginTop: 10 }}>{serverErr}</div>}
          </div>
          <div className="modal-foot">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ResetPasswordModal({ user, onClose, onSave }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [visible, setVisible] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e) {
    e.preventDefault()
    setErr('')
    if (!PASSWORD_RULE.test(password)) {
      setErr('Password must be 8+ chars with uppercase, lowercase, number, and symbol.')
      return
    }
    if (password !== confirm) {
      setErr('Passwords do not match.')
      return
    }
    setSaving(true)
    try {
      await onSave(password)
    } catch (e2) {
      setErr(e2.message)
      setSaving(false)
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ width: 420, maxWidth: '94vw' }} onClick={(e) => e.stopPropagation()}>
        <form onSubmit={submit}>
          <div className="modal-head">
            <h3>Reset Password</h3>
            <button type="button" className="x" onClick={onClose}>×</button>
          </div>
          <div className="modal-body">
            <div className="form-row">
              <label>New password for {user.fullname} (@{user.username})</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type={visible ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8+ chars, upper, lower, number, symbol"
                />
                <button type="button" className="btn" onClick={() => setVisible(!visible)}>
                  <Icon.eye width={14} height={14} />
                </button>
              </div>
            </div>
            <div className="form-row">
              <label>Confirm new password</label>
              <input type={visible ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            {err && <div className="error-msg" style={{ marginTop: 10 }}>{err}</div>}
          </div>
          <div className="modal-foot">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ArchiveModal({ user, onClose, onSave }) {
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function confirmArchive() {
    setErr('')
    setSaving(true)
    try {
      await onSave()
    } catch (e) {
      setErr(e.message)
      setSaving(false)
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ width: 420, maxWidth: '94vw' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Archive Account</h3>
          <button type="button" className="x" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 13.5, lineHeight: 1.6 }}>
            Are you sure you want to archive <strong>{user.fullname} (@{user.username})</strong>?
            The account will be deactivated and removed from the active list, but the record is
            kept for audit purposes.
          </p>
          {err && <div className="error-msg" style={{ marginTop: 10 }}>{err}</div>}
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={confirmArchive} disabled={saving}>
            {saving ? 'Archiving...' : 'Archive Account'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PricingPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingType, setSavingType] = useState('')
  const [error, setError] = useState('')
  const [savedMsg, setSavedMsg] = useState('')

  const load = useCallback(async () => {
    setRows(await apiFetch('pricing.php'))
  }, [])

  useEffect(() => {
    load()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [load])

  function update(type, key, value) {
    setRows(rows.map((r) => (r.type === type ? { ...r, [key]: value } : r)))
  }

  async function save(row) {
    setError('')
    setSavedMsg('')
    setSavingType(row.type)
    try {
      await apiFetch('pricing.php', {
        method: 'PUT',
        body: JSON.stringify({
          type: row.type,
          baseDailyRate: Number(row.baseDailyRate),
          weeklyDiscountPct: Number(row.weeklyDiscountPct),
          weekendSurchargePct: Number(row.weekendSurchargePct),
        }),
      })
      setSavedMsg(`Pricing saved for ${row.type}.`)
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setSavingType('')
    }
  }

  return (
    <div className="panel">
      <div style={{ padding: '16px 18px' }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>Pricing rules by vehicle type</div>
        <div className="help" style={{ marginTop: 4, maxWidth: 640 }}>
          Base daily rate is the default charge applied to new vehicles of each type. Rule-based
          overrides adjust the effective rate: a weekly discount for rentals of 7+ days and a weekend
          surcharge for trips covering Saturday or Sunday.
        </div>
      </div>

      {error && <div className="error-msg" style={{ margin: '0 18px 12px' }}>{error}</div>}
      {savedMsg && (
        <div style={{ margin: '0 18px 12px', color: 'var(--green)', fontSize: 13 }}>{savedMsg}</div>
      )}

      {loading ? (
        <div className="empty" style={{ padding: 24 }}>
          <div className="help">Loading pricing...</div>
        </div>
      ) : (
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table>
            <thead>
              <tr>
                <th>Vehicle Type</th>
                <th>Base Daily Rate (₱)</th>
                <th>Weekly Discount (%)</th>
                <th>Weekend Surcharge (%)</th>
                <th>Fleet</th>
                <th>Last Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.type}>
                  <td style={{ fontWeight: 700, fontSize: 13.5 }}>{r.type}</td>
                  <td>
                    <input
                      className="input-std"
                      type="number"
                      min="0"
                      step="50"
                      style={{ width: 120 }}
                      value={r.baseDailyRate}
                      onChange={(e) => update(r.type, 'baseDailyRate', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="input-std"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      style={{ width: 90 }}
                      value={r.weeklyDiscountPct}
                      onChange={(e) => update(r.type, 'weeklyDiscountPct', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="input-std"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      style={{ width: 90 }}
                      value={r.weekendSurchargePct}
                      onChange={(e) => update(r.type, 'weekendSurchargePct', e.target.value)}
                    />
                  </td>
                  <td className="cell-sub">{r.fleetCount} vehicle(s)</td>
                  <td className="cell-sub">{r.updatedAt || 'Not configured yet'}</td>
                  <td>
                    <button className="btn btn-primary sm" disabled={savingType === r.type} onClick={() => save(r)}>
                      {savingType === r.type ? 'Saving...' : 'Save'}
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="cell-sub" style={{ textAlign: 'center', padding: 24 }}>
                    No pricing configured yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
