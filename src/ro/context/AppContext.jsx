import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchBookings,
  createBookingRequest,
  confirmBooking,
  denyBooking,
} from '../services/bookingService.js';
import { fetchVehicles } from '../services/vehicleService.js';

const AppContext = createContext(null);

export const AppProvider = ({ children, initialUser = null, onLogout = null, onSwitchToAdmin = null }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(initialUser));
  const [currentUser, setCurrentUser] = useState(initialUser);

  const [bookings, setBookings] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [hydrating, setHydrating] = useState(true);

  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingStatus, setBookingStatus] = useState('All');
  const [bookingSort, setBookingSort] = useState('newest');

  const [notifications, setNotifications] = useState([]);
  const toastId = useRef(0);

  const notify = (type, message) => {
    const id = ++toastId.current;
    setNotifications((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
    return id;
  };

  const dismissNotification = (id) =>
    setNotifications((prev) => prev.filter((n) => n.id !== id));

  useEffect(() => {
    let mounted = true;
    Promise.all([fetchBookings(), fetchVehicles()])
      .then(([b, v]) => {
        if (mounted) {
          setBookings(b);
          setVehicles(v);
        }
      })
      .catch((error) => {
        if (mounted) notify('error', error.message || 'Unable to load data.');
      })
      .finally(() => {
        if (mounted) setHydrating(false);
      });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    if (onLogout) onLogout();
  };

  const switchToAdmin = onSwitchToAdmin;

  const createBooking = async ({ client, trip, vehicle, additionalCharges }) => {
    const { id, record } = await createBookingRequest({
      client,
      trip,
      vehicle,
      additionalCharges,
    });
    setBookings((prev) => [record, ...prev]);
    return id;
  };

  const confirmBookingAction = async (booking) => {
    const updated = await confirmBooking({ bookingId: booking.id });
    setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    return updated;
  };

  const denyBookingAction = async (booking, reason) => {
    const updated = await denyBooking({ booking, reason });
    setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    return updated;
  };

  const value = useMemo(
    () => ({
      auth: { isAuthenticated, currentUser, authLoading: false },
      logout,
      switchToAdmin,
      bookings,
      vehicles,
      hydrating,
      bookingSearch,
      setBookingSearch,
      bookingStatus,
      setBookingStatus,
      bookingSort,
      setBookingSort,
      notifications,
      notify,
      dismissNotification,
      createBooking,
      confirmBookingAction,
      denyBookingAction,
    }),
    [
      isAuthenticated,
      currentUser,
      bookings,
      vehicles,
      hydrating,
      bookingSearch,
      bookingStatus,
      bookingSort,
      notifications,
      onSwitchToAdmin,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
