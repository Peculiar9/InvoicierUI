import { redirect } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/authStore';

/**
 * Route guard for authenticated-only routes. Use in a route's `beforeLoad`.
 * Reads the persisted auth store synchronously (localStorage is sync), so it
 * is safe to evaluate before React mounts.
 */
/** Where a guarded route sent someone before asking them to sign in. */
export const RETURN_TO_KEY = 'invoicier-return-to';

export const requireAuth = () => {
  if (!useAuthStore.getState().isAuthenticated) {
    // Remember where they were headed. An emailed link ("confirm this
    // payment") must survive the detour through sign-in, or the person
    // lands on the dashboard wondering what they were doing.
    try {
      const here = window.location.pathname + window.location.search;
      if (here && !here.startsWith('/login')) sessionStorage.setItem(RETURN_TO_KEY, here);
    } catch {
      // private mode: they simply land on the dashboard
    }
    throw redirect({ to: '/login' });
  }
};

/**
 * Route guard for guest-only routes (login / signup / forgot-password).
 * Sends already-authenticated users to the dashboard.
 */
export const requireGuest = () => {
  if (useAuthStore.getState().isAuthenticated) {
    throw redirect({ to: '/dashboard' });
  }
};
