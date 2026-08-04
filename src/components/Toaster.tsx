import { useEffect, useRef, useState } from 'react';
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
  action?: { label: string; onClick: () => void };
  onDone: () => void;
}

const ToastItem = ({ type, message, duration, action, onDone }: ToastItemProps) => {
  const [paused, setPaused] = useState(false);
  const done = useRef(onDone);
  done.current = onDone;

  // reaching for Undo should not race the timer that is about to remove it
  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => done.current(), duration ?? 3200);
    return () => clearTimeout(timer);
  }, [paused, duration]);

  return (
    <div
      className={`toast toast--${type}${action ? ' toast--action' : ''}`}
      role="status"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <i className={`bx ${icons[type]}`} aria-hidden="true" />
      <span>{message}</span>
      {action && (
        <button
          type="button"
          className="toast-action"
          onClick={() => {
            action.onClick();
            onDone();
          }}
        >
          {action.label}
        </button>
      )}
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
          action={n.action}
          onDone={() => removeNotification(n.id)}
        />
      ))}
    </div>
  );
};
