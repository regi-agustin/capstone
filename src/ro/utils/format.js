export const formatMoney = (value) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value ?? 0);

export const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const formatDateLong = (iso) => {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('en-PH', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

export const formatTime = (t) => {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
};

export const toISODate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const daysBetween = (fromISO, toISO) => {
  if (!fromISO || !toISO) return 0;
  const a = new Date(`${fromISO}T00:00:00`);
  const b = new Date(`${toISO}T00:00:00`);
  return Math.max(0, Math.round((b - a) / 86400000));
};

export const hoursBetween = (fromISO, fromTime, toISO, toTime) => {
  if (!fromISO || !toISO || !fromTime || !toTime) return 0;
  const a = new Date(`${fromISO}T${fromTime}`);
  const b = new Date(`${toISO}T${toTime}`);
  return Math.max(0, (b - a) / 3600000);
};

export const describeDuration = ({ pickupDate, pickupTime, returnDate, returnTime }) => {
  const days = daysBetween(pickupDate, returnDate);
  if (days >= 1) return { days, hours: 0, durationLabel: `${days} ${days === 1 ? 'Day' : 'Days'}` };
  const hours = Math.max(1, Math.ceil(hoursBetween(pickupDate, pickupTime, returnDate, returnTime)));
  return { days: hours > 0 ? 1 : days, hours, durationLabel: `${hours} ${hours === 1 ? 'Hour' : 'Hours'}` };
};

export const initialsOf = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?';