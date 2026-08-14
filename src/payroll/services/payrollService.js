import { apiFetch } from '../../services/api.js'

export const fetchPayrollRecords = () => apiFetch('payroll.php')

export const fetchDrivers = () => apiFetch('drivers.php')

export const fetchAttendance = () => apiFetch('attendance.php')

export const fetchNotifications = () => apiFetch('notifications.php')

export const fetchProfile = () => apiFetch('profile.php')

export const fetchSecurity = () => apiFetch('security.php')

export const fetchTripLogs = () => apiFetch('trip_logs.php')

export const markAllNotificationsRead = () =>
  apiFetch('notifications.php', {
    method: 'POST',
    body: JSON.stringify({ action: 'mark_read' }),
  })

export const addDriver = (payload) =>
  apiFetch('drivers.php', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const addAttendance = (payload) =>
  apiFetch('attendance.php', {
    method: 'POST',
    body: JSON.stringify({ action: 'manual', ...payload }),
  })

export const updateProfile = (payload) =>
  apiFetch('profile.php', {
    method: 'POST',
    body: JSON.stringify({ action: 'update_profile', ...payload }),
  })

export const changePassword = (payload) =>
  apiFetch('profile.php', {
    method: 'POST',
    body: JSON.stringify({ action: 'change_password', ...payload }),
  })

export const securityAction = (action, payload = {}) =>
  apiFetch('security.php', {
    method: 'POST',
    body: JSON.stringify({ action, ...payload }),
  })

export const createPayrollRecord = (payload) =>
  apiFetch('payroll.php', {
    method: 'POST',
    body: JSON.stringify({ action: 'create', ...payload }),
  })

export const updatePayrollStatus = (id, status) =>
  apiFetch('payroll.php', {
    method: 'POST',
    body: JSON.stringify({ action: 'update_status', id, status }),
  })

export const deletePayrollRecord = (id) =>
  apiFetch('payroll.php', {
    method: 'POST',
    body: JSON.stringify({ action: 'delete', id }),
  })

export function formatDate(iso) {
  if (!iso) return ''
  const [y, m, d] = String(iso).slice(0, 10).split('-')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[Number(m) - 1]} ${Number(d)}, ${y}`
}

export function formatDateTime(value) {
  if (!value) return ''
  return String(value)
}

export function formatPeso(n) {
  return '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export const PAYROLL_STATUS_LABELS = {
  Pending: 'For Review',
  Paid: 'Completed',
  Unpaid: 'Unpaid',
}

export function statusLabel(status) {
  return PAYROLL_STATUS_LABELS[status] || status
}