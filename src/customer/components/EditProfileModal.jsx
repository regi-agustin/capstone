import { useEffect, useState } from 'react';
import Modal from '../../ro/components/Modal.jsx';
import { fetchProfile, updateProfile } from '../services/customerService.js';

export default function EditProfileModal({ open, onClose, profile = null, onSaved }) {
  const [form, setForm] = useState({ fullname: '', username: '', email: '', contactNumber: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const account = profile?.account || {};
    setForm({
      fullname: account.name || '',
      username: account.username || '',
      email: account.email || '',
      contactNumber: account.contactNumber || '',
    });
    setErrors({});
    setSaving(false);
  }, [open, profile]);

  const setField = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const validate = () => {
    const errs = {};
    const name = form.fullname.trim();
    if (!name) errs.fullname = 'Full name is required.';
    else if (name.length > 100) errs.fullname = 'Full name must be 100 characters or fewer.';

    const username = form.username.trim();
    if (!username) errs.username = 'Username is required.';
    else if (username.length < 3 || username.length > 50) errs.username = 'Username must be 3 to 50 characters.';

    const email = form.email.trim();
    if (!email) errs.email = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Please enter a valid email address.';

    const digits = form.contactNumber.replace(/\D/g, '');
    if (!form.contactNumber.trim()) errs.contactNumber = 'Phone number is required.';
    else if (digits.length < 7 || digits.length > 15) errs.contactNumber = 'Please enter a valid phone number (7–15 digits).';

    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      const payload = {
        fullname: form.fullname.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        contactNumber: form.contactNumber.trim(),
      };
      await updateProfile(payload);

      // Keep the app-level session (name shown beside Log out) in sync.
      window.dispatchEvent(
        new CustomEvent('fleetops:user-updated', { detail: { fullname: payload.fullname } }),
      );

      let fresh = null;
      try {
        fresh = await fetchProfile();
      } catch {
        fresh = null;
      }
      onSaved?.(
        fresh || {
          ...profile,
          account: {
            ...(profile?.account || {}),
            name: payload.fullname,
            username: payload.username,
            email: payload.email,
            contactNumber: payload.contactNumber,
          },
        },
      );
      onClose?.();
    } catch (err) {
      setErrors({ form: err.message || 'Unable to update your profile.' });
    } finally {
      setSaving(false);
    }
  };

  const field = (key, label, type = 'text', hint = null) => (
    <div className="form-group">
      <label className="form-label" htmlFor={`edit-profile-${key}`}>
        {label} <span className="req">*</span>
      </label>
      <input
        id={`edit-profile-${key}`}
        className={`form-input${errors[key] ? ' is-invalid' : ''}`}
        type={type}
        value={form[key]}
        onChange={setField(key)}
        autoComplete="off"
      />
      {errors[key] ? (
        <div className="form-error">{errors[key]}</div>
      ) : hint ? (
        <div className="form-hint">{hint}</div>
      ) : null}
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      lockClose={saving}
      title="Edit Profile"
      subtitle="Update your personal information."
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner spinner--sm" /> : null}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
        style={{ display: 'grid', gap: 16 }}
      >
        {errors.form && <div className="error-banner">{errors.form}</div>}

        <div className="form-grid">
          {field('fullname', 'Full Name')}
          {field('username', 'Username', 'text', 'Used to log in to your account.')}
          {field('email', 'Email Address', 'email')}
          {field('contactNumber', 'Phone Number', 'tel')}
        </div>

        <p className="muted" style={{ fontSize: 13, margin: 0 }}>
          Keep your account information up to date to ensure a smooth rental experience.
        </p>
      </form>
    </Modal>
  );
}
