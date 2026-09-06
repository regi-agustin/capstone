import { useRef, useState } from 'react'
import { Upload, FileText, X } from 'lucide-react'
import { Icon } from './Icons.jsx'
import VehiclePhotos from '../ro/components/VehiclePhotos.jsx'

const VEHICLE_TYPES = ['AUV', 'SUV', 'L300']
const MAX_IMAGES = 12

const readAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

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
  const [images, setImages] = useState([])
  const [primaryIndex, setPrimaryIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const fileRef = useRef(null)
  const [error, setError] = useState('')

  const byType = (t) => vehicles.filter((v) => v.type === t)
  const capacity = { AUV: 'AUV / Van (5-7 pax)', SUV: 'SUV (5-7 pax)', L300: 'L300 (8-18 pax)' }

  const openModal = () => {
    setForm({ plate: '', type: 'AUV', model: '', year: new Date().getFullYear(), seats: 5, dailyRate: 0 })
    setImages([])
    setPrimaryIndex(0)
    setError('')
    setModalOpen(true)
  }

  const handlePickImages = async (files) => {
    const list = Array.from(files || [])
    if (!list.length) return
    if (list.some((f) => !f.type.startsWith('image/'))) {
      setError('Only image files (PNG, JPG, or WebP) are supported.')
      return
    }
    setError('')
    const room = Math.max(0, MAX_IMAGES - images.length)
    const pending = list.slice(0, room)
    const added = await Promise.all(pending.map(async (f) => ({ name: f.name, dataUrl: await readAsDataUrl(f) })))
    setImages((prev) => [...prev, ...added])
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    handlePickImages(e.dataTransfer.files)
  }

  const removeImage = (idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx))
    setPrimaryIndex(0)
  }

  const handleSubmit = async () => {
    if (!form.plate.trim() || !form.model.trim()) {
      setError('Plate number and model are required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const ordered = [...images]
      if (ordered.length && primaryIndex >= 0 && primaryIndex < ordered.length) {
        ordered.splice(0, 0, ordered.splice(primaryIndex, 1)[0])
      }
      await onAddVehicle({ ...form, images: ordered.map((i) => i.dataUrl) })
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
                  <th></th>
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
                    <td colSpan={6} className="cell-sub" style={{ textAlign: 'center', padding: 24 }}>
                      No vehicles in this category yet. Use "Add Vehicle" to register the first unit.
                    </td>
                  </tr>
                )}
                {byType(t).map((v) => (
                  <tr key={v.id}>
                    <td>
                      {v.photoUrl || (v.images && v.images.length) ? (
                        <VehiclePhotos vehicle={v} thumb={{ width: 46, height: 34, borderRadius: 6 }} />
                      ) : (
                        <Icon.car width={20} height={20} />
                      )}
                    </td>
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
          <div className="modal" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
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
              <div className="form-row">
                <label>Vehicle Photo ( Add more images for customers to use as visual references. ) </label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  style={{
                    border: `2px dashed ${isDragging ? '#991b1b' : 'var(--border)'}`,
                    background: isDragging ? 'var(--red-bg)' : '#fbfdff',
                    borderRadius: 12,
                    padding: '26px 18px',
                    textAlign: 'center',
                    transition: 'border-color .15s, background .15s',
                  }}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    id="vehicle-photo"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => handlePickImages(e.target.files)}
                  />
                  <label htmlFor="vehicle-photo" style={{ cursor: 'pointer', display: 'block' }}>
                    <span
                      style={{
                        width: 58,
                        height: 58,
                        borderRadius: '50%',
                        background: 'var(--red-bg)',
                        color: '#991b1b',
                        display: 'grid',
                        placeItems: 'center',
                        margin: '0 auto 12px',
                      }}
                    >
                      <Upload size={26} />
                    </span>
                    <span style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>
                      Drag and drop or{' '}
                      <span style={{ color: '#991b1b', fontWeight: 700, textDecoration: 'underline' }}>Browse</span>{' '}
                      to choose files
                    </span>
                  </label>
                </div>
                <span className="help" style={{ display: 'block', textAlign: 'center', marginTop: 8, fontSize: 12 }}>
                  All the PNG, JPG and WebP image formats are supported.
                </span>
                
                {images.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <div className="cell-sub" style={{ marginBottom: 8, fontWeight: 700, fontSize: 12 }}>
                      Uploaded Docs ({images.length})
                    </div>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {images.map((img, i) => {
                        const isPrimary = i === primaryIndex
                        return (
                          <div
                            key={i}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              padding: '8px 10px',
                              borderRadius: 10,
                              background: isPrimary ? 'var(--red-bg)' : '#f8fafc',
                              border: isPrimary ? '1px solid #991b1b' : '1px solid var(--border)',
                            }}
                          >
                            <FileText size={18} style={{ color: '#991b1b', flexShrink: 0 }} />
                            <span
                              style={{
                                flex: 1,
                                fontSize: 13,
                                fontWeight: 600,
                                color: 'var(--text)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {img.name}
                            </span>
                            {isPrimary ? (
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 800,
                                  color: '#991b1b',
                                  background: '#fff',
                                  borderRadius: 999,
                                  padding: '3px 10px',
                                  border: '1px solid #991b1b',
                                  flexShrink: 0,
                                }}
                              >
                                Primary
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setPrimaryIndex(i)}
                                title="Set as primary"
                                aria-label={`Set ${img.name} as primary`}
                                style={{
                                  border: '1.5px solid var(--muted)',
                                  background: '#fff',
                                  borderRadius: 999,
                                  width: 18,
                                  height: 18,
                                  padding: 0,
                                  flexShrink: 0,
                                  cursor: 'pointer',
                                }}
                              />
                            )}
                            <button
                              type="button"
                              onClick={() => removeImage(i)}
                              aria-label="Remove photo"
                              style={{
                                border: 'none',
                                background: 'none',
                                color: 'var(--muted)',
                                cursor: 'pointer',
                                display: 'grid',
                                placeItems: 'center',
                                padding: 4,
                                borderRadius: 6,
                                flexShrink: 0,
                              }}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
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