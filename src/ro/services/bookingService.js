import { apiFetch } from '../../services/api.js';
import { toISODate } from '../utils/format.js';

export const calculatePreBilling = (vehicle, durationDays, additionalCharges = 0) => {
  const baseRate = vehicle ? (vehicle.dailyRate || vehicle.rate || 0) : 0;
  const days = Math.max(1, durationDays);
  const rentalFee = baseRate * days;
  return {
    baseRate,
    tripDuration: days > 0 ? `${days} ${days === 1 ? 'Day' : 'Days'}` : '—',
    rentalFee,
    additionalCharges,
    estimatedTotal: rentalFee + additionalCharges,
  };
};

// Checks if a booking's trip overlaps with a given date range.
export const bookingOverlaps = (booking, fromISO, toISO) => {
  const bs = booking?.trip?.pickupDate;
  const be = booking?.trip?.returnDate;
  if (!bs || !be || !fromISO || !toISO) return false;
  const a = `${fromISO}T00:00:00` < `${be}T00:00:00` && `${bs}T00:00:00` < `${toISO}T00:00:00`;
  return a;
};

export const findVehicleConflicts = (bookings, vehicleId, range) =>
  bookings.filter((b) => b.vehicleId === vehicleId && b.status !== 'Denied' && bookingOverlaps(b, range.pickupDate, range.returnDate));

export const isRangeAvailable = (bookings, vehicleId, range) =>
  findVehicleConflicts(bookings, vehicleId, range).length === 0;

// ---- API-backed -----------------------------------------------------------

export const fetchBookings = async () => {
  const rows = await apiFetch('bookings.php');
  return rows.map((b) => ({
    ...b,
    createdAt: b.createdAt || toISODate(new Date()),
  }));
};

export const createBookingRequest = async ({ client, trip, vehicle, additionalCharges }) => {
  const booking = await apiFetch('bookings.php', {
    method: 'POST',
    body: JSON.stringify({
      action: 'create',
      client,
      trip: {
        destination: trip.destination,
        pickupDate: trip.pickupDate,
        pickupTime: trip.pickupTime,
        returnDate: trip.returnDate,
        returnTime: trip.returnTime,
        specialRequests: trip.specialRequests,
        passengers: Number(trip.passengers) || 0,
      },
      vehicleId: vehicle ? vehicle.id : null,
      additionalCharges: Number(additionalCharges) || 0,
      estimatedTotal: calculatePreBilling(vehicle, trip.days, additionalCharges).estimatedTotal,
    }),
  });
  return { id: booking.id, record: booking };
};

export const confirmBooking = async ({ bookingId }) => {
  const updated = await apiFetch('bookings.php', {
    method: 'POST',
    body: JSON.stringify({ action: 'confirm', id: bookingId }),
  });
  return updated;
};

export const denyBooking = async ({ booking, reason }) => {
  const updated = await apiFetch('bookings.php', {
    method: 'POST',
    body: JSON.stringify({ action: 'deny', id: booking.id, reason }),
  });
  return updated;
};

// Filters bookings by a search query across key fields.
// Uses optional chaining (?) to safely handle missing client/trip data.
export const searchBookings = (bookings, query = '') => {
  const q = query.trim().toLowerCase();
  if (!q) return bookings;
  return bookings.filter((b) => {
    const haystack = [
      b.id,
      b.client?.name,
      b.client?.contact,
      b.client?.email,
      b.trip?.destination,
      b.vehicleLabel?.plateNumber,
      b.vehicleLabel?.type,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
};

// Sorts bookings by the given criteria.
// Uses optional chaining and fallback values to handle missing data safely.
export const sortBookings = (bookings, sortBy) => {
  const arr = [...bookings];
  switch (sortBy) {
    case 'tripDate':
      arr.sort((a, b) => (a.trip?.pickupDate || '').localeCompare(b.trip?.pickupDate || ''));
      return arr;
    case 'client':
      arr.sort((a, b) => (a.client?.name || '').localeCompare(b.client?.name || ''));
      return arr;
    case 'status':
      const order = { Pending: 0, 'Pricing Approved': 1, Confirmed: 2, Denied: 3, Cancelled: 4 };
      arr.sort((a, b) => (order[a.status] ?? 99) - (order[b.status] ?? 99));
      return arr;
    case 'newest':
    default:
      arr.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      return arr;
  }
};
