import { apiFetch } from '../../services/api.js';
import { bookingOverlaps } from './bookingService.js';

export const getVehicleStatus = (vehicle, bookings) => {
  if (vehicle.maintenance) return 'In Maintenance';
  const active = bookings.find((b) => b.status === 'Confirmed' && b.vehicleId === vehicle.id);
  return active ? 'In Use' : 'Available';
};

export const getCurrentBooking = (vehicle, bookings) =>
  bookings.find((b) => b.status === 'Confirmed' && b.vehicleId === vehicle.id) || null;

export const enrichVehicle = (vehicle, bookings) => {
  const current = getCurrentBooking(vehicle, bookings);
  return {
    ...vehicle,
    status: getVehicleStatus(vehicle, bookings),
    currentBooking: current ? current.id : null,
    currentClient: current ? current.client.name : null,
    currentDestination: current ? current.trip.destination : null,
    currentTripDate: current ? current.trip.pickupDate : null,
    driver: current && current.driver ? current.driver : null,
  };
};

export const enrichVehicles = (vehicles, bookings) => vehicles.map((v) => enrichVehicle(v, bookings));

export const fetchVehicles = async () => {
  const rows = await apiFetch('vehicles.php');
  return rows.map((v) => ({
    id: v.id,
    plateNumber: v.plate,
    type: v.type,
    model: v.model,
    year: v.year,
    seats: v.seats,
    rate: v.dailyRate,
    maintenance: v.status === 'Maintenance',
  }));
};

export const searchVehicles = (vehicles, query = '') => {
  const q = query.trim().toLowerCase();
  if (!q) return vehicles;
  return vehicles.filter((v) =>
    [v.plateNumber, v.type, v.model, v.id].some((s) => s && s.toLowerCase().includes(q)),
  );
};

export const vehiclesAvailableForRange = (vehicles, bookings, range) =>
  enrichVehicles(vehicles, bookings).filter(
    (v) =>
      v.status === 'Available' &&
      !bookings.some(
        (b) =>
          b.vehicleId === v.id &&
          b.status !== 'Denied' &&
          bookingOverlaps(b, range.pickupDate, range.returnDate),
      ),
  );

export const isSelectableForRange = (vehicle, bookings, range) => {
  const v = enrichVehicle(vehicle, bookings);
  if (v.status !== 'Available') return false;
  return !bookings.some(
    (b) =>
      b.vehicleId === vehicle.id &&
      b.status !== 'Denied' &&
      bookingOverlaps(b, range.pickupDate, range.returnDate),
  );
};

export const getVehicleById = (vehicles, bookings, id) =>
  enrichVehicle(vehicles.find((v) => v.id === id) || null, bookings);

export const suggestBestVehicle = (vehicles, bookings, { pickupDate, returnDate, passengers = 0 }) => {
  const candidates = vehiclesAvailableForRange(vehicles, bookings, { pickupDate, returnDate });
  if (!candidates.length) return null;
  const sorted = [...candidates].sort((a, b) => {
    const seatA = a.seats >= passengers;
    const seatB = b.seats >= passengers;
    if (seatA !== seatB) return seatA ? -1 : 1;
    return a.rate - b.rate;
  });
  return sorted[0];
};

export const summarizeFleet = (vehicles, bookings) => {
  const enriched = enrichVehicles(vehicles, bookings);
  return {
    total: enriched.length,
    available: enriched.filter((v) => v.status === 'Available').length,
    inUse: enriched.filter((v) => v.status === 'In Use').length,
    inMaintenance: enriched.filter((v) => v.status === 'In Maintenance').length,
  };
};