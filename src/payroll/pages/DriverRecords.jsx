import { useEffect, useMemo, useState } from 'react'
import { Download, Plus, Eye, Trash2, ChevronLeft, ChevronRight, Phone, MapPin } from 'lucide-react'
import { fetchDrivers, fetchPayrollRecords, formatDate, formatPeso, statusLabel } from '../services/payrollService.js'
import SearchBar from '../../ro/components/SearchBar.jsx'
import StatusBadge from '../../ro/components/StatusBadge.jsx'

function initials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export default function DriverRecords() {
  const [drivers, setDrivers] = useState([])
  const [payroll, setPayroll] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedId, setSelectedId] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([fetchDrivers(), fetchPayrollRecords()])
      .then(([d, p]) => {
        setDrivers(d)
        setPayroll(p)
        setSelectedId(d[0]?.id ?? null)
      })
      .catch((e) => setError(e.message))
  }, [])

  const filtered = drivers.filter((d) => {
    const q = search.toLowerCase()
    const matchesSearch = !q || d.name.toLowerCase().includes(q) || String(d.id).includes(q)
    const matchesStatus = statusFilter === 'All' || d.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const selected = drivers.find((d) => d.id === selectedId) || null
  const selectedPayroll = useMemo(
    () => payroll.filter((p) => p.driverId === selectedId).slice(0, 5),
    [payroll, selectedId]
  )
  const selectedCutoff = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7)
    const cur = payroll.find((p) => p.driverId === selectedId && (p.date || '').startsWith(month))
    if (cur) {
      return {
        period: formatDate(cur.date),
        earnings: cur.basicSalary + cur.allowances,
        deductions: cur.deductions,
        net: cur.netAmount,
        status: cur.status,
      }
    }
    return null
  }, [payroll, selectedId])

  if (error) {
    return <div className="error-banner">{error}</div>
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Driver Records</h1>
          <p className="page-head__sub">View and manage driver information and their payroll history.</p>
        </div>
      </div>

      <div className="toolbar" style={{ marginBottom: 18 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search driver name or ID..." />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="form-select"
          style={{ width: 160 }}
        >
          <option>All</option>
          <option>Assigned</option>
          <option>Unassigned</option>
          <option>Unavailable</option>
        </select>
      </div>
      <div className="toolbar" style={{ justifyContent: 'flex-end', marginBottom: 18 }}>
        <button className="btn btn--secondary btn--sm" title="Export to Excel (upcoming)">
          <Download size={14} /> Export
        </button>
        <button className="btn btn--primary btn--sm" title="Driver enrollment handled by Driver Management">
          <Plus size={14} /> Add Driver
        </button>
      </div>

      <section className="card">
        <div className="card__header">
          <div>
            <div className="card__title">
              Driver List
              <span className="badge badge--neutral">{filtered.length}</span>
            </div>
            <div className="card__sub">All registered drivers</div>
          </div>
        </div>
        <div className="card__body">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__title">No drivers found.</div>
              <div className="empty-state__sub">Try adjusting your search or filters.</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Driver ID</th>
                    <th>Driver Name</th>
                    <th>Contact Number</th>
                    <th>License Expiry</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((d, idx) => (
                    <tr key={d.id}>
                      <td className="cell-muted">{idx + 1}</td>
                      <td className="cell-sub">DRV-{String(d.id).padStart(3, '0')}</td>
                      <td className="cell-main">{d.name}</td>
                      <td>{d.contact}</td>
                      <td>{formatDate(d.licenseExpiry)}</td>
                      <td>
                        <StatusBadge status={d.status} />
                      </td>
                      <td>
                        <div className="actions-row" style={{ justifyContent: 'center' }}>
                          <button onClick={() => setSelectedId(d.id)} className="btn btn--icon" title="View profile">
                            <Eye size={16} />
                          </button>
                          <button className="btn btn--icon" disabled title="Editing handled by Driver Management">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="toolbar" style={{ justifyContent: 'space-between', marginTop: 16 }}>
            <span className="cell-sub">Showing {filtered.length} of {drivers.length} records</span>
            <div className="toolbar">
              <button className="btn btn--secondary btn--icon btn--sm" disabled title="Previous page">
                <ChevronLeft size={16} />
              </button>
              <button className="btn btn--primary btn--sm">1</button>
              <button className="btn btn--secondary btn--icon btn--sm" disabled title="Next page">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {selected && (
        <section className="card" style={{ marginTop: 22 }}>
          <div className="card__body">
            <div className="toolbar" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div className="toolbar" style={{ gap: 18 }}>
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: 'var(--primary-soft)',
                    border: '1px solid var(--primary)',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: 'var(--navy)',
                      color: '#fff',
                      display: 'grid',
                      placeItems: 'center',
                      fontWeight: 700,
                      fontSize: 18,
                    }}
                  >
                    {initials(selected.name)}
                  </div>
                </div>
                <div>
                  <h3 className="card__title">
                    {selected.name}{' '}
                    <StatusBadge status={selected.status} />
                  </h3>
                  <p className="cell-sub">Driver ID: DRV-{String(selected.id).padStart(3, '0')}</p>
                  <div style={{ display: 'grid', gap: 4, marginTop: 8 }}>
                    <p className="toolbar" style={{ gap: 8, color: 'var(--text)' }}>
                      <Phone size={14} className="faint" /> {selected.contact}
                    </p>
                    <p className="toolbar" style={{ gap: 8, color: 'var(--text)' }}>
                      <MapPin size={14} className="faint" /> {selected.address || 'Address not on file'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card__body" style={{ paddingTop: 0, paddingBottom: 0 }}>
            <div className="filter-tabs" role="tablist" aria-label="Driver tabs">
              <button type="button" role="tab" aria-selected="true" className="filter-tab filter-tab--active">Overview</button>
              <button type="button" role="tab" aria-selected="false" className="filter-tab">Payroll History</button>
            </div>
          </div>

          <div className="card__body">
            <div className="form-grid">
              <div className="form-section" style={{ marginBottom: 0 }}>
                <div className="form-section__title">Personal Information</div>
                <div className="detail-grid" style={{ marginTop: 12 }}>
                  <div className="detail-item">
                    <div className="detail-item__label">Full Name</div>
                    <div className="detail-item__value">{selected.name}</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-item__label">Address</div>
                    <div className="detail-item__value">{selected.address || '-'}</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-item__label">Date Hired</div>
                    <div className="detail-item__value">{formatDate(selected.hireDate)}</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-item__label">Employment Status</div>
                    <div className="detail-item__value">{selected.status}</div>
                  </div>
                </div>
              </div>

              <div className="form-section" style={{ marginBottom: 0 }}>
                <div className="form-section__title">Driver Information</div>
                <div className="detail-grid" style={{ marginTop: 12 }}>
                  <div className="detail-item">
                    <div className="detail-item__label">License Number</div>
                    <div className="detail-item__value">{selected.licenseNumber || '-'}</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-item__label">License Expiry</div>
                    <div className="detail-item__value">{formatDate(selected.licenseExpiry)}</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-item__label">Driver Type</div>
                    <div className="detail-item__value">Internal Driver</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-item__label">Remarks</div>
                    <div className="detail-item__value">-</div>
                  </div>
                </div>
              </div>

              <div className="form-section" style={{ marginBottom: 0 }}>
                <div className="form-section__title">Contact Information</div>
                <div className="detail-grid" style={{ marginTop: 12 }}>
                  <div className="detail-item">
                    <div className="detail-item__label">Contact Number</div>
                    <div className="detail-item__value">{selected.contact}</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-item__label">Address</div>
                    <div className="detail-item__value">{selected.address || '-'}</div>
                  </div>
                </div>
              </div>

              <div className="form-section" style={{ marginBottom: 0 }}>
                <div className="form-section__title">
                  Payroll Summary <span className="form-hint">(Current Cut-off)</span>
                </div>
                {selectedCutoff ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <div className="detail-item__label">Payroll Date</div>
                        <div className="detail-item__value">{selectedCutoff.period}</div>
                      </div>
                      <div className="detail-item">
                        <div className="detail-item__label">Total Earnings</div>
                        <div className="detail-item__value">{formatPeso(selectedCutoff.earnings)}</div>
                      </div>
                      <div className="detail-item">
                        <div className="detail-item__label">Total Deductions</div>
                        <div className="detail-item__value" style={{ color: 'var(--danger)' }}>{formatPeso(selectedCutoff.deductions)}</div>
                      </div>
                      <div className="detail-item">
                        <div className="detail-item__label">Total Receivable</div>
                        <div className="detail-item__value" style={{ color: 'var(--primary-dark)' }}>{formatPeso(selectedCutoff.net)}</div>
                      </div>
                      <div className="detail-item">
                        <div className="detail-item__label">Status</div>
                        <StatusBadge status={statusLabel(selectedCutoff.status)} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="cell-muted">No payroll record for this cut-off.</p>
                )}
              </div>
            </div>

            <div className="divider" />

            <div>
              <div className="card__title" style={{ marginBottom: 14 }}>Recent Payroll History</div>
              {selectedPayroll.length === 0 ? (
                <p className="cell-muted">No payroll records yet.</p>
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Payroll Date</th>
                        <th style={{ textAlign: 'right' }}>Basic Salary</th>
                        <th style={{ textAlign: 'right' }}>Allowances</th>
                        <th style={{ textAlign: 'right' }}>Deductions</th>
                        <th style={{ textAlign: 'right' }}>Total Receivable</th>
                        <th style={{ textAlign: 'center' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPayroll.map((p) => (
                        <tr key={p.id}>
                          <td>{formatDate(p.date)}</td>
                          <td style={{ textAlign: 'right' }}>{formatPeso(p.basicSalary)}</td>
                          <td style={{ textAlign: 'right' }}>{formatPeso(p.allowances)}</td>
                          <td style={{ textAlign: 'right' }}>{formatPeso(p.deductions)}</td>
                          <td className="cell-main" style={{ textAlign: 'right' }}>{formatPeso(p.netAmount)}</td>
                          <td style={{ textAlign: 'center' }}>
                            <StatusBadge status={statusLabel(p.status)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}