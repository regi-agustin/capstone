import { apiFetch } from '../../services/api.js'

export const fetchVehicles = () => apiFetch('vehicles.php')

export const fetchMyBookings = () => apiFetch('bookings.php')

export const createBooking = (payload) =>
  apiFetch('bookings.php', {
    method: 'POST',
    body: JSON.stringify({ action: 'create', ...payload }),
  })

export const fetchNotifications = () => apiFetch('notifications.php')

export const markAllNotificationsRead = () =>
  apiFetch('notifications.php', {
    method: 'POST',
    body: JSON.stringify({ action: 'mark_read' }),
  })

export const cancelBooking = (id) =>
  apiFetch('bookings.php', {
    method: 'POST',
    body: JSON.stringify({ action: 'cancel', id }),
  })

export const changePassword = (payload) =>
  apiFetch('profile.php', {
    method: 'POST',
    body: JSON.stringify({ action: 'change_password', ...payload }),
  })

export const fetchMyFeedback = () => apiFetch('feedback.php')

export const submitFeedback = (payload) =>
  apiFetch('feedback.php', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const fetchProfile = () => apiFetch('profile.php')

export const fetchSecurity = () => apiFetch('security.php')

export function formatDate(iso) {
  if (!iso) return ''
  const [y, m, d] = String(iso).slice(0, 10).split('-')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[Number(m) - 1]} ${Number(d)}, ${y}`
}

export function formatTime(t) {
  if (!t) return ''
  const [h, m] = String(t).slice(0, 5).split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

export function formatPeso(n) {
  return '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}