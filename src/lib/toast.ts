import { useUIStore } from '@/stores/uiStore';

/** Fire a toast from anywhere (inside or outside React). */
export const toast = {
  success: (message: string) =>
    useUIStore.getState().addNotification({ type: 'success', message }),
  error: (message: string) =>
    useUIStore.getState().addNotification({ type: 'error', message }),
  info: (message: string) =>
    useUIStore.getState().addNotification({ type: 'info', message }),
  warning: (message: string) =>
    useUIStore.getState().addNotification({ type: 'warning', message }),
  /**
   * The action already happened. This is the way back, and it stays on
   * screen longer than a normal toast because it is asking for a decision.
   */
  undo: (message: string, onUndo: () => void) =>
    useUIStore.getState().addNotification({
      type: 'info',
      message,
      duration: 7000,
      action: { label: 'Undo', onClick: onUndo },
    }),
};
