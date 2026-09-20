import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCircle2, DollarSign, XCircle, Truck, Calendar, AlertCircle } from 'lucide-react';
import { apiFetch } from '../services/api.js';

const ICONS = {
  CheckCircle: CheckCircle2,
  DollarSign: DollarSign,
  XCircle: XCircle,
  Truck: Truck,
  Calendar: Calendar,
  AlertCircle: AlertCircle,
};

function useClickOutside(onClose) {
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);
  return ref;
}

// Topbar notification bell with dropdown. Loads the user's notifications from
// the notifications table; "Mark all read" clears the unread flag via the API.
export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [marking, setMarking] = useState(false);
  const ref = useClickOutside(() => setOpen(false));

  const unread = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    let mounted = true;
    apiFetch('notifications.php')
      .then((rows) => { if (mounted) setNotifications(rows); })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const markAllRead = async () => {
    setMarking(true);
    try {
      await apiFetch('notifications.php', { method: 'POST', body: JSON.stringify({ action: 'mark_read' }) });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // keep local state; next refresh will reconcile
    } finally {
      setMarking(false);
    }
  };

  return (
    <div ref={ref} className={`dropdown ${open ? 'dropdown--open' : ''}`}>
      <button
        type="button"
        className={`topbar__icon-btn${unread ? ' has-dot' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
      >
        <Bell size={20} />
      </button>
      {open && (
        <div className="dropdown__menu">
          <div
            className="dropdown__head"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <strong>Notifications</strong>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={markAllRead}
              disabled={marking || unread === 0}
            >
              <CheckCircle2 size={14} /> {marking ? 'Updating…' : 'Mark all read'}
            </button>
          </div>
          <div className="dropdown__body">
            {notifications.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px' }}>
                <CheckCircle2 size={22} />
                <div className="empty-state__sub">You&rsquo;re all caught up.</div>
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = ICONS[n.icon] || Bell;
                return (
                  <div key={n.id} className={`notif-item${n.isRead ? '' : ' notif-item--unread'}`}>
                    <Icon size={16} style={{ color: 'var(--text-faint)', marginTop: 2 }} />
                    <div>
                      <div className="notif-item__text">{n.title}</div>
                      <div className="notif-item__time">{n.description}</div>
                      <div className="notif-item__time">{n.timestamp}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}