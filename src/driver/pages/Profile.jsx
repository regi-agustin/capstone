import { useEffect, useRef, useState } from 'react';
import {
  Mail,
  Phone,
  CreditCard,
  CalendarDays,
  Truck,
  User,
  Pencil,
  X,
  Briefcase,
  Camera,
} from 'lucide-react';
import {
  fetchDriverProfile,
  updateDriverProfile,
  uploadDriverProfileImage,
  validateDriverProfileForm,
  validateProfileImageFile,
  resolveProfileImageUrl,
  formatProfileDate,
} from '../services/driverService.js';

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ email: '', contactNumber: '' });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  const loadProfile = () => {
    setError('');
    return fetchDriverProfile()
      .then(setProfile)
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    loadProfile().finally(() => setLoading(false));
  }, []);

  function openEdit() {
    setEditForm({
      email: profile?.driver?.email || '',
      contactNumber: profile?.driver?.contactNumber || '',
    });
    setFormErrors({});
    setShowEdit(true);
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    const errors = validateDriverProfileForm(editForm);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    try {
      await updateDriverProfile({
        email: editForm.email.trim(),
        contactNumber: editForm.contactNumber.trim(),
      });
      setShowEdit(false);
      setMsg('Profile updated successfully.');
      setTimeout(() => setMsg(''), 4000);
      await loadProfile();
    } catch (err) {
      setFormErrors({ form: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleImageChange(e) {
    const file = e.target.files?.[0];
    const validationError = validateProfileImageFile(file);
    if (validationError) {
      setError(validationError);
      setTimeout(() => setError(''), 5000);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      setUploadingImage(true);
      setError('');
      try {
        const result = await uploadDriverProfileImage(ev.target.result);
        setMsg('Profile photo updated successfully.');
        setTimeout(() => setMsg(''), 4000);
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                driver: {
                  ...prev.driver,
                  profileImage: result.profileImage,
                },
              }
            : prev
        );
      } catch (err) {
        setError(err.message);
      } finally {
        setUploadingImage(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  }

  if (loading) {
    return (
      <div className="panel">
        <div className="empty">
          <User width={40} height={40} />
          <div className="help" style={{ marginTop: 6 }}>Loading profile...</div>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="panel">
        <div className="empty">
          <div className="error-msg" style={{ display: 'inline-block', maxWidth: 420 }}>
            {error}
          </div>
          <button type="button" className="btn sm" style={{ marginTop: 12 }} onClick={() => { setLoading(true); loadProfile().finally(() => setLoading(false)); }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const driver = profile?.driver ?? {};
  const vehicle = profile?.vehicle ?? null;
  const stats = profile?.stats ?? {};
  const profileImageUrl = resolveProfileImageUrl(driver.profileImage);

  const initials = (driver.name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  const statusClass = driver.employmentStatus?.toLowerCase() === 'active' ? 'available' : 'unavailable';

  const infoRows = [
    { icon: User, label: 'Full Name', value: driver.name },
    { icon: CreditCard, label: 'Employee ID', value: driver.id },
    { icon: Phone, label: 'Contact Number', value: driver.contactNumber },
    { icon: Mail, label: 'Email Address', value: driver.email },
    { icon: CreditCard, label: "Driver's License Number", value: driver.licenseNumber },
    { icon: CalendarDays, label: 'License Expiration Date', value: formatProfileDate(driver.licenseExpiry) },
    { icon: Briefcase, label: 'Employment Status', value: driver.employmentStatus },
    { icon: CalendarDays, label: 'Date Hired', value: formatProfileDate(driver.hireDate) },
    { icon: Truck, label: 'Assigned Vehicle', value: vehicle ? `${vehicle.name} (${vehicle.plateNumber})` : null },
  ];

  const perfCards = [
    { icon: CalendarDays, label: 'Attendance This Month', value: `${stats.totalAttendanceThisMonth ?? 0} days`, bg: '#dbeafe', fg: '#2563eb' },
    { icon: Truck, label: 'Total Hours This Month', value: `${stats.totalHoursThisMonth ?? 0} hrs`, bg: '#dcfce7', fg: '#16a34a' },
    { icon: User, label: 'Average Rating', value: `${stats.averageRating ?? 0} / 5`, bg: '#fef3c7', fg: '#d97706' },
    { icon: CalendarDays, label: 'On-Time Attendance', value: stats.onTimeAttendance ?? '0%', bg: '#f3e8ff', fg: '#9333ea' },
  ];

  return (
    <div>
      {msg && (
        <div className="success-msg" style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8 }}>
          {msg}
        </div>
      )}

      {error && profile && (
        <div className="error-msg" style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8 }}>
          {error}
        </div>
      )}

      {/* Profile header */}
      <div className="panel" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 18, alignItems: 'center', padding: 18, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <div
              className="avatar"
              style={{
                width: 68,
                height: 68,
                fontSize: 24,
                borderRadius: 16,
                background: 'var(--navy-700)',
                overflow: 'hidden',
                cursor: uploadingImage ? 'wait' : 'pointer',
              }}
              onClick={() => !uploadingImage && fileInputRef.current?.click()}
              title={uploadingImage ? 'Uploading photo...' : 'Upload profile photo'}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && !uploadingImage && fileInputRef.current?.click()}
            >
              {profileImageUrl ? (
                <img
                  src={profileImageUrl}
                  alt={`${driver.name || 'Driver'} profile`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                initials
              )}
            </div>
            <button
              type="button"
              className="btn sm"
              style={{
                position: 'absolute',
                right: -4,
                bottom: -4,
                width: 28,
                height: 28,
                padding: 0,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
              }}
              onClick={() => !uploadingImage && fileInputRef.current?.click()}
              disabled={uploadingImage}
              aria-label="Upload profile photo"
            >
              <Camera width={13} height={13} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleImageChange}
              style={{ display: 'none' }}
              aria-hidden="true"
            />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{driver.name || '—'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
              <span className={`status ${statusClass}`}>{driver.employmentStatus || '—'}</span>
              <span className="cell-sub mono">{driver.id || '—'}</span>
            </div>
            <div className="cell-sub" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <Mail width={13} height={13} /> {driver.email || '—'}
            </div>
            <div className="cell-sub" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <Phone width={13} height={13} /> {driver.contactNumber || '—'}
            </div>
          </div>
        </div>
      </div>

      <div className="twocol" style={{ marginBottom: 18 }}>
        {/* Driver information */}
        <div className="panel">
          <div className="panel-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3>Driver Information</h3>
            <button type="button" className="btn sm" onClick={openEdit}>
              <Pencil width={14} height={14} /> Edit
            </button>
          </div>
          {infoRows.map(({ icon: I, label, value }) => (
            <div className="assign-card" key={label}>
              <span style={{ color: 'var(--muted)', display: 'inline-flex' }}><I width={16} height={16} /></span>
              <span className="cell-sub" style={{ flex: 1 }}>{label}</span>
              <span className="cell-strong" style={{ textAlign: 'right' }}>{value || '—'}</span>
            </div>
          ))}
        </div>

        {/* Assigned vehicle */}
        <div className="panel">
          <div className="panel-head"><h3>Assigned Vehicle</h3></div>
          {vehicle ? (
            <>
              <div
                style={{
                  width: '100%', height: 150,
                  background: 'var(--navy-800)', color: '#94a3b8',
                  display: 'grid', placeItems: 'center'
                }}
              >
                <Truck width={44} height={44} />
              </div>
              <div>
                <div className="assign-card">
                  <span className="cell-sub" style={{ flex: 1 }}>Plate Number</span>
                  <span className="vehicle-chip">{vehicle.plateNumber}</span>
                </div>
                <div className="assign-card">
                  <span className="cell-sub" style={{ flex: 1 }}>Vehicle Type</span>
                  <span className="cell-strong">{vehicle.type}</span>
                </div>
                <div className="assign-card">
                  <span className="cell-sub" style={{ flex: 1 }}>Model</span>
                  <span className="cell-strong">{vehicle.name}</span>
                </div>
                <div className="assign-card">
                  <span className="cell-sub" style={{ flex: 1 }}>Assigned Date</span>
                  <span className="cell-strong">{formatProfileDate(vehicle.assignedDate)}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="empty">
              <Truck width={40} height={40} />
              <div className="help" style={{ marginTop: 6 }}>No vehicle assigned.</div>
            </div>
          )}
        </div>
      </div>

      {/* Performance overview */}
      <div className="panel">
        <div className="panel-head"><h3>Performance Overview</h3></div>
        <div className="stats" style={{ margin: 0, padding: 16 }}>
          {perfCards.map(({ icon: I, label, value, bg, fg }) => (
            <div className="stat" key={label}>
              <span style={{ width: 36, height: 36, borderRadius: 9, background: bg, color: fg, display: 'grid', placeItems: 'center', marginBottom: 8 }}>
                <I width={18} height={18} />
              </span>
              <span className="label">{label}</span>
              <div className="value" style={{ fontSize: 22 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {showEdit && (
        <div className="overlay" onClick={() => setShowEdit(false)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Edit Profile</h3>
              <button className="x" onClick={() => setShowEdit(false)} aria-label="Close">
                <X width={16} height={16} />
              </button>
            </div>
            <form onSubmit={handleSaveEdit}>
              <div className="modal-body">
                <p className="cell-sub" style={{ marginBottom: 14 }}>
                  You may update your email and contact number. All other fields are managed by administration.
                </p>
                <div style={{ display: 'grid', gap: 12 }}>
                  <label style={{ display: 'grid', gap: 6 }}>
                    <span className="cell-sub">Full Name</span>
                    <input className="search" style={{ width: '100%' }} value={driver.name || ''} disabled />
                  </label>
                  <label style={{ display: 'grid', gap: 6 }}>
                    <span className="cell-sub">Employee ID</span>
                    <input className="search" style={{ width: '100%' }} value={driver.id || ''} disabled />
                  </label>
                  <label style={{ display: 'grid', gap: 6 }}>
                    <span className="cell-sub">Email Address</span>
                    <input
                      className="search"
                      style={{ width: '100%' }}
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    />
                    {formErrors.email && <span className="error-msg">{formErrors.email}</span>}
                  </label>
                  <label style={{ display: 'grid', gap: 6 }}>
                    <span className="cell-sub">Contact Number</span>
                    <input
                      className="search"
                      style={{ width: '100%' }}
                      value={editForm.contactNumber}
                      onChange={(e) => setEditForm({ ...editForm, contactNumber: e.target.value })}
                    />
                    {formErrors.contactNumber && <span className="error-msg">{formErrors.contactNumber}</span>}
                  </label>
                  <label style={{ display: 'grid', gap: 6 }}>
                    <span className="cell-sub">Driver&apos;s License Number</span>
                    <input className="search" style={{ width: '100%' }} value={driver.licenseNumber || ''} disabled />
                  </label>
                  <label style={{ display: 'grid', gap: 6 }}>
                    <span className="cell-sub">License Expiration Date</span>
                    <input className="search" style={{ width: '100%' }} value={formatProfileDate(driver.licenseExpiry)} disabled />
                  </label>
                  <label style={{ display: 'grid', gap: 6 }}>
                    <span className="cell-sub">Employment Status</span>
                    <input className="search" style={{ width: '100%' }} value={driver.employmentStatus || ''} disabled />
                  </label>
                  <label style={{ display: 'grid', gap: 6 }}>
                    <span className="cell-sub">Date Hired</span>
                    <input className="search" style={{ width: '100%' }} value={formatProfileDate(driver.hireDate)} disabled />
                  </label>
                </div>
                {formErrors.form && <div className="error-msg" style={{ marginTop: 10 }}>{formErrors.form}</div>}
              </div>
              <div className="modal-foot">
                <button type="button" className="btn" onClick={() => setShowEdit(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
