import { bookingOverlaps } from './bookingService.js';
import { suggestBestVehicle } from './vehicleService.js';

const delay = (ms = 700) => new Promise((r) => setTimeout(r, ms));

const normalize = (s = '') => s.trim().toLowerCase().replace(/\s+/g, ' ');

const overlapsInRange = (b, trip) =>
  Boolean(trip.pickupDate && trip.returnDate) && bookingOverlaps(b, trip.pickupDate, trip.returnDate);

const hasRequired = (client, trip) =>
  Boolean(
    client.name &&
      client.contact &&
      client.email &&
      trip.destination &&
      trip.pickupDate &&
      trip.pickupTime &&
      trip.returnDate,
  );

const conflictsForVehicle = (bookings, vehicleId, trip) =>
  bookings.filter((b) => b.vehicleId === vehicleId && b.status !== 'Denied' && overlapsInRange(b, trip));

const isDuplicateBooking = (b, client, trip) =>
  (normalize(b.client.name) === normalize(client.name) || normalize(b.client.email) === normalize(client.email)) &&
  b.status !== 'Denied' &&
  overlapsInRange(b, trip);

export const analyzeTrip = ({ client, bookings, vehicles, passengers = 0, selectedVehicleId = null, trip }) => {
  const missing = [];
  if (!client.name) missing.push({ field: 'Client Name', message: 'Client name is required.' });
  if (!client.contact) missing.push({ field: 'Contact Number', message: 'Contact number is required.' });
  if (!client.email) missing.push({ field: 'Email Address', message: 'Email address is required.' });
  if (!trip.destination) missing.push({ field: 'Destination', message: 'Destination is required.' });
  if (!trip.pickupDate) missing.push({ field: 'Pickup Date', message: 'Pickup date is required.' });
  if (!trip.pickupTime) missing.push({ field: 'Pickup Time', message: 'Pickup time is required.' });
  if (!trip.returnDate) missing.push({ field: 'Return Date', message: 'Return date is required.' });
  if (trip.pickupDate && trip.returnDate && trip.pickupDate > trip.returnDate)
    missing.push({ field: 'Trip Dates', message: 'Return date cannot be earlier than pickup date.' });

  const warnings = [];
  if (selectedVehicleId) {
    const conflicts = conflictsForVehicle(bookings, selectedVehicleId, trip);
    conflicts.forEach((b) =>
      warnings.push(
        `Selected vehicle has an overlapping booking (${b.id}) for ${b.trip.pickupDate} → ${b.trip.returnDate} (${b.status}).`,
      ),
    );
  }

  const duplicates = bookings.filter((b) => isDuplicateBooking(b, client, trip));
  const datesComplete = trip.pickupDate && trip.returnDate && trip.pickupDate <= trip.returnDate;
  const best = datesComplete ? suggestBestVehicle(vehicles, bookings, { ...trip, passengers }) : null;

  const recommendation = best
    ? `Recommended vehicle: ${best.type} (${best.plateNumber}) because it is currently available${
        passengers >= 1 ? ' and provides sufficient passenger capacity for this booking' : ''
      }.`
    : datesComplete
      ? 'No vehicles are currently available for the selected trip dates.'
      : 'Complete the trip dates to receive a vehicle recommendation.';

  return {
    missing,
    warnings,
    duplicates: duplicates.map((d) => ({ id: d.id, clientName: d.client.name, status: d.status })),
    recommendedVehicle: best,
    recommendation,
    ready: hasRequired(client, trip),
  };
};

export const fetchRecommendation = async (payload) => {
  await delay();
  return analyzeTrip(payload);
};