const COLORS = {
  Pending: 'badge--pending',
  Confirmed: 'badge--confirmed',
  Denied: 'badge--denied',
  Available: 'badge--available',
  'In Use': 'badge--in-use',
  'In Maintenance': 'badge--in-maintenance',
  Paid: 'badge--available',
  Partial: 'badge--in-use',
  Draft: 'badge--neutral',
  Sent: 'badge--confirmed',
  Cancelled: 'badge--denied',
};

export default function StatusBadge({ status, dot }) {
  const color = COLORS[status] || 'badge--neutral';
  if (dot) return <span className={`badge ${color} badge--dot`} aria-label={status} title={status} />;
  return <span className={`badge ${color}`}>{status}</span>;
}