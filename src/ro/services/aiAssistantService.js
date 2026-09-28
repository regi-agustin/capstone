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
  if (trip.pickupDate && trip.returnDate && trip.pickupDate === trip.returnDate &&
      trip.pickupTime && trip.returnTime && trip.returnTime < trip.pickupTime)
    missing.push({ field: 'Trip Times', message: 'Drop-off time cannot be earlier than pickup time on the same day.' });

  // Recommendation still works without drop-off details by assuming a same-day return.
  const dropoffAssumed = !trip.returnDate && Boolean(trip.pickupDate);
  const effectiveTrip = { ...trip, returnDate: trip.returnDate || trip.pickupDate };

  const warnings = [];
  if (selectedVehicleId) {
    const conflicts = conflictsForVehicle(bookings, selectedVehicleId, effectiveTrip);
    conflicts.forEach((b) =>
      warnings.push(
        `Selected vehicle has an overlapping booking (${b.id}) for ${b.trip.pickupDate} → ${b.trip.returnDate} (${b.status}).`,
      ),
    );
  }

  const duplicates = bookings.filter((b) => isDuplicateBooking(b, client, effectiveTrip));
  const datesComplete = Boolean(effectiveTrip.pickupDate && effectiveTrip.returnDate) &&
    effectiveTrip.pickupDate <= effectiveTrip.returnDate;
  const ready = hasRequired(client, trip);
  const recommendable = hasRequired(client, effectiveTrip);
  const best = (datesComplete && recommendable) ? suggestBestVehicle(vehicles, bookings, { ...effectiveTrip, passengers }) : null;

  const recommendation = best
    ? `Recommended vehicle: ${best.type} (${best.plate}) because it is currently available${
        passengers >= 1 ? ' and provides sufficient passenger capacity for this booking' : ''
      }.${dropoffAssumed ? ' (Assuming a same-day return — add the drop-off date to refine this.)' : ''}`
    : !recommendable
      ? 'Complete the client details and trip dates above to receive a vehicle recommendation.'
      : datesComplete
        ? 'No vehicles are currently available for the selected trip dates.'
        : 'Complete the trip dates to receive a vehicle recommendation.';

  return {
    missing,
    warnings,
    duplicates: duplicates.map((d) => ({ id: d.id, clientName: d.client.name, status: d.status })),
    recommendedVehicle: best,
    recommendation,
    ready,
  };
};

export const fetchRecommendation = async (payload) => {
  await delay();
  return analyzeTrip(payload);
};