import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

export default function Notification() {
  const { notifications, dismissNotification } = useApp();
  if (!notifications.length) return null;
  return (
    <div className="toast-stack" aria-live="polite">
      {notifications.map((n) => {
        const Icon = ICONS[n.type] || Info;
        return (
          <div key={n.id} className={`toast toast--${n.type}`}>
            <Icon size={18} className="toast__icon" />
            <div className="toast__msg">{n.message}</div>
            <button type="button" className="toast__close" onClick={() => dismissNotification(n.id)} aria-label="Dismiss">
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}