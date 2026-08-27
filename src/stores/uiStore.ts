import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * The theme leaves the store through the DOM: everything CSS needs is one
 * attribute on <html>, flipped here and only here.
 *
 * Three states. 'system' (the default for a fresh visitor) follows the
 * browser/OS `prefers-color-scheme`, so login, onboarding and the landing page
 * respect a visitor's dark OS with no toggle of their own. 'light'/'dark' are an
 * explicit choice the toggle sets, which then wins over the OS. Whatever the
 * mode, the resolved light-or-dark lands on data-theme, so every [data-theme]
 * rule works for both the app toggle and the browser setting.
 */
type Theme = 'system' | 'light' | 'dark';

const prefersDark = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-color-scheme: dark)').matches;

const resolveTheme = (theme: Theme): 'light' | 'dark' =>
  theme === 'system' ? (prefersDark() ? 'dark' : 'light') : theme;

const applyTheme = (theme: Theme) => {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', resolveTheme(theme));
  }
};

interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  theme: Theme;
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
  setTheme: (theme: Theme) => void;
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
  theme: 'system',
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
      // an explicit choice, opposite of whatever is showing now (incl. system)
      const theme: Theme = resolveTheme(state.theme) === 'dark' ? 'light' : 'dark';
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

// Initial paint: a fresh visitor has no persisted state, so merge never runs
// and data-theme would be unset. Resolve whatever the store settled on (a
// persisted choice, or 'system' → the OS) onto the attribute right away.
applyTheme(useUIStore.getState().theme);

// While the visitor is on 'system', a live OS theme change re-resolves onto
// data-theme so the app follows along without a reload.
if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (useUIStore.getState().theme === 'system') applyTheme('system');
  });
}
