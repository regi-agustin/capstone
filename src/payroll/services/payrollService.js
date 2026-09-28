import { apiFetch } from '../../services/api.js'

// ------------------------- Payroll core -----------------------------------

export const fetchPayrollRecords = (params = {}) => {
  const qs = new URLSearchParams()
  if (params.status) qs.set('status', params.status)
  if (params.driverId) qs.set('driver_id', params.driverId)
  const q = qs.toString()
  return apiFetch(`payroll.php${q ? `?${q}` : ''}`)
}

export const fetchCutoffs = () => apiFetch('payroll.php?action=cutoffs')

export const fetchEligibleDrivers = (cutoffStart, cutoffEnd) =>
  apiFetch(`payroll.php?action=eligible&cutoff_start=${cutoffStart}&cutoff_end=${cutoffEnd}`)

export const fetchTripData = (driverId, cutoffStart, cutoffEnd) =>
  apiFetch(`payroll.php?action=tripdata&driver_id=${driverId}&cutoff_start=${cutoffStart}&cutoff_end=${cutoffEnd}`)

export const fetchPayrollPreview = (id) => apiFetch(`payroll.php?action=preview&id=${id}`)

export const createPayroll = (payload) =>
  apiFetch('payroll.php', { method: 'POST', body: JSON.stringify({ action: 'create', ...payload }) })

export const updatePayroll = (payload) =>
  apiFetch('payroll.php', { method: 'POST', body: JSON.stringify({ action: 'update', ...payload }) })

export const submitPayroll = (id) =>
  apiFetch('payroll.php', { method: 'POST', body: JSON.stringify({ action: 'submit', id }) })

export const approvePayroll = (id) =>
  apiFetch('payroll.php', { method: 'POST', body: JSON.stringify({ action: 'approve', id }) })

export const returnPayroll = (id, remarks) =>
  apiFetch('payroll.php', { method: 'POST', body: JSON.stringify({ action: 'return', id, remarks }) })

export const cancelPayroll = (id) =>
  apiFetch('payroll.php', { method: 'POST', body: JSON.stringify({ action: 'cancel', id }) })

export const recordPayrollPayment = (id, payload) =>
  apiFetch('payroll.php', {
    method: 'POST',
    body: JSON.stringify({ action: 'pay', id, ...payload }),
  })

export const deletePayrollRecord = (id) =>
  apiFetch('payroll.php', { method: 'POST', body: JSON.stringify({ action: 'delete', id }) })

export const fetchCompanySettings = () => apiFetch('payroll.php?action=settings')

export const saveCompanySettings = (companyName) =>
  apiFetch('payroll.php', { method: 'POST', body: JSON.stringify({ action: 'save_settings', companyName }) })

// ------------------------- Current Car Rates ------------------------------
// The screen that manages each car's daily rate, the driver currently
// assigned to it, and the effective-dated history behind both.

export const fetchCarRates = (q = '') =>
  apiFetch(`car_rates.php?action=list${q ? `&q=${encodeURIComponent(q)}` : ''}`)

export const fetchCarRateHistory = (vehicleId) =>
  apiFetch(`car_rates.php?action=history&vehicle_id=${vehicleId}`)

export const fetchCarAssignments = (vehicleId) =>
  apiFetch(`car_rates.php?action=assignments&vehicle_id=${vehicleId}`)

export const fetchAssignableDrivers = () => apiFetch('car_rates.php?action=drivers')

export const saveCarRate = (payload) =>
  apiFetch('car_rates.php', { method: 'POST', body: JSON.stringify({ action: 'save_rate', ...payload }) })

export const saveCarAssignment = (payload) =>
  apiFetch('car_rates.php', {
    method: 'POST',
    body: JSON.stringify({ action: 'save_assignment', ...payload }),
  })

// Car-rental quote for a payroll period: daily rate x unique use days per car.
export const fetchCarRentalQuote = (driverId, cutoffStart, cutoffEnd) =>
  apiFetch(
    `car_rates.php?action=quote&driver_id=${driverId}&cutoff_start=${cutoffStart}&cutoff_end=${cutoffEnd}`
  )

// ------------------------- Other module data ------------------------------
// (kept for the payroll desk's Drivers / Attendance / Notifications pages)

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

export const clearReadNotifications = () =>
  apiFetch('notifications.php', {
    method: 'POST',
    body: JSON.stringify({ action: 'clear_read' }),
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

// ------------------------- Formatting -------------------------------------

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

// ------------------------- Status labels ----------------------------------

export const PAYROLL_STATUS_LABELS = {
  draft: 'Draft',
  for_review: 'For Review',
  approved: 'Approved',
  paid: 'Paid',
  cancelled: 'Cancelled',
}

export const PAYROLL_STATUS_ORDER = ['draft', 'for_review', 'approved', 'paid', 'cancelled']

export function statusLabel(status) {
  return PAYROLL_STATUS_LABELS[status] || status || 'Draft'
}

export const EARNINGS_META = [
  { key: 'car_rental', label: 'Car Rental Payment', source: 'auto', hint: 'From the trips included in this cut-off' },
  { key: 'fuel_subsidy', label: 'Fuel Subsidy', source: 'manual', hint: 'Add approved fuel allowance' },
  { key: 'excess_gas', label: 'Excess Gas', source: 'manual', hint: 'Excess fuel consumed on duty' },
  { key: 'overnight_allowance', label: 'Overnight Allowance', source: 'manual', hint: 'Trips requiring overnight stay' },
  { key: 'overtime', label: 'Overtime', source: 'auto', hint: 'Sum of overtime in the trip breakdown' },
  { key: 'misc', label: 'Misc. / Toll / Parking', source: 'auto', hint: 'Sum of toll and parking in the trip breakdown' },
  { key: 'time_hazard', label: 'Time & Hazard Pay', source: 'manual', hint: 'Hazardous / extended duty pay' },
  { key: 'dispute', label: 'Dispute', source: 'manual', negative: true, hint: 'Deducted from earnings' },
]

export const DEDUCTIONS_META = [
  { key: 'advance', label: 'Cash Advance' },
  { key: 'penalty', label: 'Penalty' },
  { key: 'no_line_up', label: 'No Line Up' },
  { key: 'absent_leave', label: 'Absent / Leave' },
  { key: 'wtax', label: '2% Withholding Tax', auto: true },
  { key: 'membership', label: 'Membership' },
  { key: 'cash_bond', label: 'Cash Bond' },
  { key: 'coop_savings', label: 'Coop Savings' },
  { key: 'coop_loan', label: 'Coop Loan' },
  { key: 'others', label: 'Others' },
]