import { useEffect, useState } from 'react';
import { apiFetch } from '../../services/api.js';
import { CheckCircle2, DollarSign, XCircle, Truck, Bell } from 'lucide-react';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('notifications.php')
      .then(setNotifications)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const getNotificationIcon = (iconName) => {
    const icons = {
      CheckCircle: CheckCircle2,
      DollarSign: DollarSign,
      XCircle: XCircle,
      Truck: Truck,
      Bell: Bell
    };
    return icons[iconName] || Bell;
  };

  const getNotificationColor = (type) => {
    const colors = {
      attendance_verified: { bg: '#dcfce7', fg: '#16a34a' },
      payroll_released: { bg: '#dbeafe', fg: '#2563eb' },
      attendance_rejected: { bg: '#fee2e2', fg: '#dc2626' },
      vehicle_updated: { bg: '#fef3c7', fg: '#d97706' }
    };
    return colors[type] || { bg: '#f1f5f9', fg: '#64748b' };
  };

  return (
    <div>
      <div className="panel">
        <div className="panel-head">
          <h3>Notifications <span className="badge count" style={{ marginLeft: 8 }}>{notifications.length}</span></h3>
          <span className="meta">Stay updated with your fleet operations.</span>
        </div>
        {loading ? (
          <div className="empty"><div className="help">Loading notifications...</div></div>
        ) : error ? (
          <div className="empty"><div className="error-msg" style={{ display: 'inline-block' }}>{error}</div></div>
        ) : notifications.length === 0 ? (
          <div className="empty">
            <Bell width={40} height={40} />
            <div className="help" style={{ marginTop: 6 }}>No notifications yet.</div>
          </div>
        ) : (
          <div className="feed">
            {notifications.map((notification) => {
              const Icon = getNotificationIcon(notification.icon);
              const color = getNotificationColor(notification.type);
              return (
                <div key={notification.id} className="feed-item">
                  <span
                    style={{
                      width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                      background: color.bg, color: color.fg,
                      display: 'grid', placeItems: 'center'
                    }}
                  >
                    <Icon width={18} height={18} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="t">{notification.title}</div>
                    <div className="s">{notification.description}</div>
                  </div>
                  <span className="cell-sub nowrap" style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                    {notification.timestamp}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;