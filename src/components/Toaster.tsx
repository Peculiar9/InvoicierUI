import { useEffect } from 'react';
import { useUIStore } from '@/stores/uiStore';

type ToastType = 'success' | 'error' | 'warning' | 'info';

const icons: Record<ToastType, string> = {
  success: 'bx-check-circle',
  error: 'bx-error-circle',
  warning: 'bx-error',
  info: 'bx-info-circle',
};

interface ToastItemProps {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  onDone: () => void;
}

const ToastItem = ({ type, message, duration, onDone }: ToastItemProps) => {
  useEffect(() => {
    const timer = setTimeout(onDone, duration ?? 3200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`toast toast--${type}`} role="status">
      <i className={`bx ${icons[type]}`} aria-hidden="true" />
      <span>{message}</span>
      <button type="button" onClick={onDone} aria-label="Dismiss">
        <i className="bx bx-x" />
      </button>
    </div>
  );
};

export const Toaster = () => {
  const notifications = useUIStore((s) => s.notifications);
  const removeNotification = useUIStore((s) => s.removeNotification);

  return (
    <div className="toaster" aria-live="polite">
      {notifications.map((n) => (
        <ToastItem
          key={n.id}
          id={n.id}
          type={n.type}
          message={n.message}
          duration={n.duration}
          onDone={() => removeNotification(n.id)}
        />
      ))}
    </div>
  );
};
