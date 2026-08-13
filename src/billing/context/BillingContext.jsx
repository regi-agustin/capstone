import { createContext, useContext, useMemo, useRef, useState } from 'react';

const BillingContext = createContext(null);

export const BillingProvider = ({ children, initialUser = null, onLogout = null, onSwitchToAdmin = null }) => {
  const [currentUser] = useState(initialUser);
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

  const logout = () => {
    if (onLogout) onLogout();
  };

  const switchToAdmin = onSwitchToAdmin;

  const value = useMemo(
    () => ({
      auth: { isAuthenticated: Boolean(initialUser), currentUser, authLoading: false },
      logout,
      switchToAdmin,
      notifications,
      notify,
      dismissNotification,
    }),
    [currentUser, initialUser, notifications, onSwitchToAdmin],
  );

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
};

export const useBilling = () => {
  const ctx = useContext(BillingContext);
  if (!ctx) throw new Error('useBilling must be used within BillingProvider');
  return ctx;
};
