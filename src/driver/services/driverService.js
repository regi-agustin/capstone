import { apiFetch } from '../../services/api.js';

const PROFILE_API = 'driver/profile.php';

export const fetchDriverProfile = () => apiFetch(PROFILE_API);

export const updateDriverProfile = ({ email, contactNumber }) =>
  apiFetch(PROFILE_API, {
    method: 'POST',
    body: JSON.stringify({ action: 'update_profile', email, contactNumber }),
  });

export const uploadDriverProfileImage = (image) =>
  apiFetch(PROFILE_API, {
    method: 'POST',
    body: JSON.stringify({ action: 'upload_profile_image', image }),
  });

export function resolveProfileImageUrl(path) {
  if (!path) return null;
  if (path.startsWith('/api/')) return path;
  if (path.startsWith('/fleetops/api/')) {
    return path.replace('/fleetops/api/', '/api/');
  }
  return path;
}

export function formatProfileDate(value) {
  if (!value) return '—';
  const date = new Date(String(value).includes('T') ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function validateDriverProfileForm({ email, contactNumber }) {
  const errors = {};
  const trimmedEmail = (email || '').trim();
  const trimmedContact = (contactNumber || '').trim();

  if (!trimmedEmail) {
    errors.email = 'Email address is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    errors.email = 'Please provide a valid email address.';
  }

  const digits = trimmedContact.replace(/\D/g, '');
  if (!trimmedContact) {
    errors.contactNumber = 'Contact number is required.';
  } else if (digits.length < 7 || digits.length > 15) {
    errors.contactNumber = 'Please provide a valid contact number (7–15 digits).';
  }

  return errors;
}

export function validateProfileImageFile(file) {
  if (!file) return 'Please choose an image file.';
  if (!file.type.startsWith('image/')) {
    return 'Profile image must be a PNG, JPEG, or WebP file.';
  }
  if (file.size > 5 * 1024 * 1024) {
    return 'Profile image must be 5 MB or smaller.';
  }
  return null;
}
