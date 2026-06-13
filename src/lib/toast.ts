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
};
