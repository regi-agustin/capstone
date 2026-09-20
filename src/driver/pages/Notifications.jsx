import { useEffect, useState } from 'react';
import { apiFetch } from '../../services/api.js';
import { CheckCircle2, DollarSign, XCircle, Truck, Bell, Calendar, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [marking, setMarking] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchNotifications = () => {
    setLoading(true);
    apiFetch('notifications.php')
      .then((data) => {
        setNotifications(data);
      })
      .catch((e) => {
        console.error('Error fetching notifications:', e);
        setError(e.message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchNotifications();
    // Set up auto-refresh every 30 seconds to catch new notifications
    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);
    
    // Also refresh when window regains focus (user returns to tab)
    const handleFocus = () => {
      fetchNotifications();
    };
    window.addEventListener('focus', handleFocus);
    
    // Also refresh when the page becomes visible (user switches back to this tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchNotifications();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const getNotificationIcon = (iconName) => {
    const icons = {
      CheckCircle: CheckCircle2,
      DollarSign: DollarSign,
      XCircle: XCircle,
      Truck: Truck,
      Bell: Bell,
      Calendar: Calendar,
      AlertCircle: AlertCircle
    };
    return icons[iconName] || Bell;
  };

  const getNotificationColor = (type) => {
    const colors = {
      attendance_verified: { bg: '#dcfce7', fg: '#16a34a' },
      payroll_released: { bg: '#dbeafe', fg: '#2563eb' },
      attendance_rejected: { bg: '#fee2e2', fg: '#dc2626' },
      vehicle_updated: { bg: '#fef3c7', fg: '#d97706' },
      reservation_confirmed: { bg: '#e0e7ff', fg: '#4f46e5' },
      system_alert: { bg: '#fee2e2', fg: '#dc2626' },
      system_announcement: { bg: '#f1f5f9', fg: '#64748b' }
    };
    return colors[type] || { bg: '#f1f5f9', fg: '#64748b' };
  };

  const markAllRead = async () => {
    setMarking(true);
    try {
      await apiFetch('notifications.php', {
        method: 'POST',
        body: JSON.stringify({ action: 'mark_read' })
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      // Keep local state; next refresh will reconcile
    } finally {
      setMarking(false);
    }
  };

  const clearReadNotifications = async () => {
    if (!window.confirm('Are you sure you want to clear all read notifications?')) {
      return;
    }
    setMarking(true);
    try {
      await apiFetch('notifications.php', {
        method: 'POST',
        body: JSON.stringify({ action: 'clear_read' })
      });
      setSuccessMsg('Read notifications cleared successfully.');
      await fetchNotifications();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Failed to clear read notifications:', err);
    } finally {
      setMarking(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const readCount = notifications.filter((n) => n.isRead).length;

  return (
    <div>
      <div className="panel" style={{ minHeight: '400px' }}>
        <div className="panel-head">
          <h3>Notifications <span className="badge count" style={{ marginLeft: 8 }}>{unreadCount}</span></h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="meta">Stay updated with your fleet operations.</span>
            <button
              className="btn btn--ghost btn--sm"
              onClick={markAllRead}
              disabled={marking || unreadCount === 0}
              style={{ padding: '6px 12px' }}
              title="Mark all as read"
            >
              <CheckCircle2 size={14} style={{ marginRight: 4 }} />
              {marking ? 'Updating...' : 'Mark All Read'}
            </button>
            <button
              className="btn btn--ghost btn--sm"
              onClick={clearReadNotifications}
              disabled={marking || readCount === 0}
              style={{ padding: '6px 12px' }}
              title="Clear all read notifications"
            >
              <Trash2 size={14} style={{ marginRight: 4 }} />
              {marking ? 'Clearing...' : 'Clear All'}
            </button>
            <button
              className="btn btn--ghost btn--sm"
              onClick={fetchNotifications}
              disabled={loading}
              style={{ padding: '6px 12px' }}
              title="Refresh notifications"
            >
              <RefreshCw size={14} style={{ marginRight: 4 }} />
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
        {successMsg && (
          <div style={{ padding: '12px 18px', backgroundColor: '#dcfce7', color: '#16a34a', fontSize: '14px', borderBottom: '1px solid #e2e8f0' }}>
            {successMsg}
          </div>
        )}
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
          <div className="feed" style={{ padding: '12px 18px', backgroundColor: '#ffffff' }}>
            {notifications.map((notification) => {
              const Icon = getNotificationIcon(notification.icon);
              const color = getNotificationColor(notification.type);
              return (
                <div 
                  key={notification.id} 
                  className={`feed-item${!notification.isRead ? ' feed-item--unread' : ''}`}
                  style={{
                    background: !notification.isRead ? 'rgba(59, 130, 246, 0.08)' : '#ffffff',
                    borderLeft: !notification.isRead ? '4px solid #3b82f6' : '4px solid #e2e8f0',
                    borderBottom: '1px solid #e2e8f0',
                    padding: '16px',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                    minHeight: '70px',
                    margin: '0',
                    width: '100%'
                  }}
                >
                  <span
                    style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: color.bg, color: color.fg,
                      display: 'grid', placeItems: 'center',
                      border: '1px solid rgba(0,0,0,0.1)'
                    }}
                  >
                    <Icon width={20} height={20} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="t" style={{ fontWeight: !notification.isRead ? 700 : 500, fontSize: '15px', marginBottom: '6px', color: '#0f172a' }}>
                      {notification.title}
                    </div>
                    <div className="s" style={{ color: '#475569', fontSize: '13px', marginBottom: '6px', lineHeight: '1.4' }}>{notification.description}</div>
                    <div className="cell-sub" style={{ fontSize: '11px', marginTop: '4px', color: '#64748b', fontWeight: '500' }}>
                      {notification.type.replace('_', ' ').toUpperCase()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', marginLeft: 'auto', minWidth: '130px' }}>
                    <span className="cell-sub nowrap" style={{ display: 'block', whiteSpace: 'nowrap', fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                      {notification.timestamp}
                    </span>
                    {!notification.isRead && (
                      <span className="badge" style={{ 
                        background: '#3b82f6', 
                        color: 'white', 
                        fontSize: 11, 
                        padding: '4px 8px',
                        borderRadius: 12,
                        marginTop: 6,
                        display: 'inline-block',
                        fontWeight: '600'
                      }}>
                        NEW
                      </span>
                    )}
                  </div>
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