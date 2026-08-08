import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * The theme leaves the store through the DOM: everything CSS needs is one
 * attribute on <html>, flipped here and only here.
 */
const applyTheme = (theme: 'light' | 'dark') => {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
  }
};

interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark';
  notifications: Notification[];
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  /** one button on the toast, used for undo */
  action?: { label: string; onClick: () => void };
}

interface UIActions {
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapse: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

type UIStore = UIState & UIActions;

const generateId = () => Math.random().toString(36).substring(2, 9);

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
  sidebarOpen: true,
  sidebarCollapsed: false,
  theme: 'light',
  notifications: [],

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  toggleSidebarCollapse: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
  toggleTheme: () =>
    set((state) => {
      const theme = state.theme === 'dark' ? 'light' : 'dark';
      applyTheme(theme);
      return { theme };
    }),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        { ...notification, id: generateId() },
      ],
    })),

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  clearNotifications: () => set({ notifications: [] }),
    }),
    {
      name: 'invoicier-ui',
      storage: createJSONStorage(() => localStorage),
      // notifications are moments, not preferences
      partialize: (state) => ({ theme: state.theme }),
      merge: (persisted, current) => {
        const next = { ...current, ...(persisted as object) } as UIStore;
        applyTheme(next.theme);
        return next;
      },
    }
  )
);
