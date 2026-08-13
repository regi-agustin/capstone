import { useState } from 'react'
import { Icon } from './Icons.jsx'

const VEHICLE_TYPES = ['AUV', 'SUV', 'L300']

export default function FleetPage({ vehicles, onAddVehicle }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    plate: '',
    type: 'AUV',
    model: '',
    year: new Date().getFullYear(),
    seats: 5,
    dailyRate: 0
  })
  const [error, setError] = useState('')

  const byType = (t) => vehicles.filter((v) => v.type === t)
  const capacity = { AUV: 'AUV / Van (5-7 pax)', SUV: 'SUV (5-7 pax)', L300: 'L300 (8-18 pax)' }

  const openModal = () => {
    setForm({ plate: '', type: 'AUV', model: '', year: new Date().getFullYear(), seats: 5, dailyRate: 0 })
    setError('')
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.plate.trim() || !form.model.trim()) {
      setError('Plate number and model are required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onAddVehicle(form)
      setModalOpen(false)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }))

  return (
    <div>
      <div className="panel-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px' }}>
        <div>
          <h3>Fleet Inventory</h3>
          <div className="meta">Company-owned and subcontracted units</div>
        </div>
        <button className="btn btn-primary" onClick={openModal}>
          <Icon.car width={14} height={14} /> Add Vehicle
        </button>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="label">Internal Units</div>
          <div className="value">{vehicles.filter((v) => v.carCode.startsWith('HD')).length}</div>
          <div className="cell-sub">company-owned</div>
        </div>
        <div className="stat">
          <div className="label">Subcontracted Units</div>
          <div className="value">{vehicles.filter((v) => v.carCode.startsWith('SC')).length}</div>
          <div className="cell-sub">owned by business partners</div>
        </div>
        <div className="stat">
          <div className="label">On Standby</div>
          <div className="value" style={{ color: 'var(--green)' }}>{vehicles.filter((v) => v.status === 'Available').length}</div>
        </div>
        <div className="stat">
          <div className="label">In Maintenance</div>
          <div className="value" style={{ color: 'var(--amber)' }}>{vehicles.filter((v) => v.status === 'Maintenance').length}</div>
        </div>
      </div>

      {['AUV', 'SUV', 'L300'].map((t) => (
        <div className="panel" key={t}>
          <div className="panel-head">
            <div>
              <h3>{capacity[t]}</h3>
              <div className="meta">AI-recommended for passenger count, luggage volume &amp; travel purpose</div>
            </div>
            <span className="cell-sub">{byType(t).length} unit(s)</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fleet / Car Code</th>
                  <th>Plate Number</th>
                  <th>Model</th>
                  <th>Ownership</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {byType(t).length === 0 && (
                  <tr>
                    <td colSpan={5} className="cell-sub" style={{ textAlign: 'center', padding: 24 }}>
                      No vehicles in this category yet. Use "Add Vehicle" to register the first unit.
                    </td>
                  </tr>
                )}
                {byType(t).map((v) => (
                  <tr key={v.id}>
                    <td className="mono cell-strong">{v.carCode}</td>
                    <td className="mono">{v.plate}</td>
                    <td>{v.model}</td>
                    <td>{v.carCode.startsWith('HD') ? 'Internal' : 'Subcontracted'}</td>
                    <td><span className={`status ${v.status.toLowerCase()}`}>{v.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {modalOpen && (
        <div className="overlay" onClick={() => !saving && setModalOpen(false)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Add New Vehicle</h3>
              <button className="x" onClick={() => !saving && setModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              {error && <div className="error-msg">{error}</div>}
              <div className="form-row">
                <label>Plate Number</label>
                <input type="text" placeholder="e.g. ABC 1234" value={form.plate} onChange={set('plate')} />
              </div>
              <div className="form-row">
                <label>Vehicle Type</label>
                <select value={form.type} onChange={set('type')}>
                  {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label>Model</label>
                <input type="text" placeholder="e.g. Toyota Innova" value={form.model} onChange={set('model')} />
              </div>
              <div className="form-row">
                <label>Year</label>
                <input type="number" min={2000} max={2100} value={form.year} onChange={set('year')} />
              </div>
              <div className="form-row">
                <label>Seating Capacity</label>
                <input type="number" min={1} max={60} value={form.seats} onChange={set('seats')} />
              </div>
              <div className="form-row">
                <label>Daily Rate (₱)</label>
                <input type="number" min={0} step="50" value={form.dailyRate} onChange={set('dailyRate')} />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Saving...' : 'Save Vehicle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
