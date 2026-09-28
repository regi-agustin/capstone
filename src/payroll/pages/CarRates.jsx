import { useEffect, useState } from 'react'
import { Download, Plus, Pencil, UserPlus, History, Trash2 } from 'lucide-react'
import {
  fetchCarRates,
  addCarRate,
  updateCarRate,
  deleteCarRate,
  formatPeso,
} from '../services/payrollService.js'
import SearchBar from '../../ro/components/SearchBar.jsx'
import StatusBadge from '../../ro/components/StatusBadge.jsx'
import Pagination from '../../ro/components/Pagination.jsx'
import Modal from '../../ro/components/Modal.jsx'
import { downloadCsv } from '../../ro/utils/csv.js'

// Matches the vehicle types priced in the fleet module.
const VEHICLE_TYPES = ['AUV', 'SUV', 'L300']
const PAGE_SIZE = 10

const EMPTY_FORM = { id: null, carCode: '', plate: '', type: 'AUV', model: '', dailyRate: '', ownerId: '' }

export default function CarRates() {
  const [cars, setCars] = useState([])
  const [owners, setOwners] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [page, setPage] = useState(1)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function load() {
    try {
      const data = await fetchCarRates()
      setCars(data.cars)
      setOwners(data.owners)
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = cars.filter((c) => {
    const q = search.trim().toLowerCase()
    const matchesSearch =
      !q ||
      c.carCode.toLowerCase().includes(q) ||
      c.plate.toLowerCase().includes(q) ||
      c.model.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.driver.toLowerCase().includes(q)
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const assigned = cars.filter((c) => c.driver).length
  const unassigned = cars.length - assigned

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE)
  const safePage = Math.min(page, Math.max(1, pageCount))
  const pageData = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function flash(text) {
    setMsg(text)
    setTimeout(() => setMsg(''), 4000)
  }

  function handleExport() {
    if (filtered.length === 0) return
    downloadCsv(
      'current-car-rates.csv',
      ['Car Code', 'Vehicle Type', 'Model', 'Daily Rate', 'Assigned Driver', 'Plate Number', 'Car Owner', 'Status'],
      filtered.map((c) => [
        c.carCode, c.category, c.model, c.dailyRate.toFixed(2),
        c.driver || 'Unassigned', c.plate, c.owner, c.status,
      ])
    )
  }

  function openAdd() {
    setForm(EMPTY_FORM)
    setFormError('')
    setShowForm(true)
  }

  function openEdit(car) {
    setForm({
      id: car.id,
      carCode: car.carCode,
      plate: car.plate,
      type: car.category,
      model: car.model,
      dailyRate: String(car.dailyRate),
      ownerId: car.ownerId || '',
    })
    setFormError('')
    setShowForm(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setFormError('')

    const plate = form.plate.trim()
    const model = form.model.trim()
    const dailyRate = Number(String(form.dailyRate).replace(/[^0-9.]/g, ''))

    if (!plate || !model) {
      setFormError('Plate number and model are required.')
      return
    }
    if (!dailyRate || dailyRate <= 0) {
      setFormError('Enter a daily rate greater than zero.')
      return
    }

    const payload = {
      plate,
      type: form.type,
      model,
      dailyRate,
      ownerId: form.ownerId ? Number(form.ownerId) : null,
    }

    setSaving(true)
    try {
      if (form.id) {
        await updateCarRate({ id: form.id, ...payload })
        flash(`Car rate for ${plate} updated.`)
      } else {
        const created = await addCarRate(payload)
        flash(`Car rate ${created.carCode} added.`)
      }
      setShowForm(false)
      setForm(EMPTY_FORM)
      await load()
    } catch (e) {
      setFormError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteCarRate(deleteTarget.id)
      flash(`Car rate ${deleteTarget.carCode} deleted.`)
      setDeleteTarget(null)
      await load()
    } catch (e) {
      setDeleteError(e.message)
    } finally {
      setDeleting(false)
    }
  }

  if (error) {
    return <div className="error-banner">{error}</div>
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Current Car Rates</h1>
          <p className="page-head__sub">
            Manage the daily rate and assigned driver for each car code used in payroll.
          </p>
        </div>
      </div>

      <div className="toolbar" style={{ marginBottom: 18 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search car code, driver, plate..." />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="form-select"
          style={{ width: 160 }}
        >
          <option>All</option>
          <option>Available</option>
          <option>Assigned</option>
          <option>Maintenance</option>
          <option>Inactive</option>
        </select>
      </div>
      <div className="toolbar" style={{ justifyContent: 'flex-end', marginBottom: 18 }}>
        <button onClick={handleExport} className="btn btn--secondary btn--sm" disabled={filtered.length === 0}>
          <Download size={14} /> Export
        </button>
      </div>

      {msg && <div className="success-banner" style={{ marginBottom: 16 }}>{msg}</div>}

      <section className="card">
        <div className="card__header">
          <div>
            <div className="card__title">
              Car Rate List
              <span className="badge badge--neutral">{filtered.length}</span>
            </div>
            <div className="card__sub">
              {cars.length} active cars &bull; {assigned} assigned &bull; {unassigned} unassigned
            </div>
          </div>
          <button onClick={openAdd} className="btn btn--primary btn--sm">
            <Plus size={14} /> Add
          </button>
        </div>

        <div className="card__body">
          {loading ? (
            <div className="empty-state">
              <div className="empty-state__title">Loading car rates…</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__title">No car rates found.</div>
              <div className="empty-state__sub">
                {cars.length === 0 ? 'Click Add to register the first car.' : 'Try adjusting your search or filters.'}
              </div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Car Code</th>
                    <th>Vehicle Type</th>
                    <th style={{ textAlign: 'right' }}>Daily Rate</th>
                    <th>Assigned Driver</th>
                    <th>Plate Number</th>
                    <th>Car Owner</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((c, idx) => (
                    <tr key={c.id}>
                      <td>
                        <div className="cell-main">{c.carCode}</div>
                        {c.since && <div className="cell-sub">{c.since}</div>}
                      </td>
                      <td>
                        <div className="cell-main">{c.category}</div>
                        <div className="cell-sub">{c.model}</div>
                      </td>
                      <td className="cell-main" style={{ textAlign: 'right' }}>
                        {formatPeso(c.dailyRate)}
                      </td>
                      <td>
                        {c.driver ? c.driver : <span className="cell-muted">Unassigned</span>}
                      </td>
                      <td>{c.plate}</td>
                      <td className="cell-muted">{c.owner}</td>
                      <td>
                        <StatusBadge status={c.status === 'Maintenance' ? 'In Maintenance' : c.status} />
                      </td>
                      <td>
                        <div className="actions-row" style={{ justifyContent: 'center' }}>
                          <button
                            className="btn btn--icon"
                            title="Edit car rate"
                            onClick={() => openEdit(c)}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="btn btn--icon"
                            disabled
                            title="Assign a driver from the Reservations module"
                          >
                            <UserPlus size={16} />
                          </button>
                          <button
                            className="btn btn--icon"
                            disabled
                            title="Rate history is not tracked yet"
                          >
                            <History size={16} />
                          </button>
                          <button
                            className="btn btn--icon"
                            title="Delete car rate"
                            onClick={() => {
                              setDeleteTarget(c)
                              setDeleteError('')
                            }}
                          >
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

          <Pagination
            page={safePage}
            pageCount={pageCount}
            onPage={setPage}
            total={filtered.length}
            label={`Showing ${pageData.length} of ${filtered.length} records`}
          />
        </div>
      </section>

      {/* Add / Edit car rate */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={form.id ? 'Edit Car Rate' : 'Add Car Rate'}
        subtitle={form.id ? form.carCode : 'The car code is generated when the record is saved'}
        size="lg"
        footer={
          <>
            <button type="button" className="btn btn--secondary" onClick={() => setShowForm(false)} disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="car-rate-form" className="btn btn--primary" disabled={saving}>
              <Plus size={16} /> {saving ? 'Saving…' : form.id ? 'Save Changes' : 'Add'}
            </button>
          </>
        }
      >
        <form id="car-rate-form" onSubmit={handleSave} style={{ display: 'grid', gap: 14 }}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="cr-code">Car Code</label>
              <input
                id="cr-code"
                className="form-input"
                disabled
                value={form.carCode}
                placeholder="Generated on save"
              />
              <div className="form-hint">Built from the vehicle type and record ID.</div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="cr-type">Vehicle Type <span className="req">*</span></label>
              <select
                id="cr-type"
                className="form-select"
                value={form.type}
                disabled={Boolean(form.id)}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {VEHICLE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {form.id && <div className="form-hint">Locked, because it forms the car code.</div>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="cr-model">Model <span className="req">*</span></label>
              <input
                id="cr-model"
                className="form-input"
                placeholder="e.g. Toyota Innova"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="cr-rate">Daily Rate (₱) <span className="req">*</span></label>
              <input
                id="cr-rate"
                className="form-input"
                inputMode="decimal"
                placeholder="e.g. 2500.00"
                value={form.dailyRate}
                onChange={(e) => setForm({ ...form, dailyRate: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="cr-plate">Plate Number <span className="req">*</span></label>
              <input
                id="cr-plate"
                className="form-input"
                placeholder="e.g. ABC 1234"
                value={form.plate}
                onChange={(e) => setForm({ ...form, plate: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="cr-owner">Car Owner</label>
              <select
                id="cr-owner"
                className="form-select"
                value={form.ownerId}
                onChange={(e) => setForm({ ...form, ownerId: e.target.value })}
              >
                <option value="">Company Owned</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          </div>

          <p className="form-hint">
            The assigned driver is not set here — it appears in this list automatically once a booking
            assigns the car in the Reservations module.
          </p>

          {formError && <div className="error-banner">{formError}</div>}
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Car Rate?"
        size="sm"
        lockClose={deleting}
        footer={
          <>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </button>
            <button type="button" className="btn btn--danger" onClick={handleDelete} disabled={deleting}>
              <Trash2 size={16} /> {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </>
        }
      >
        <p style={{ fontSize: 14 }}>
          Are you sure you want to delete this car rate? This action cannot be undone.
        </p>
        {deleteTarget && (
          <p className="cell-sub" style={{ marginTop: 8 }}>
            {deleteTarget.carCode} &bull; {deleteTarget.category} {deleteTarget.model} &bull; {deleteTarget.plate}
          </p>
        )}
        {deleteError && <div className="error-banner" style={{ marginTop: 12 }}>{deleteError}</div>}
      </Modal>
    </div>
  )
}
