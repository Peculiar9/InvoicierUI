import { redirect } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/authStore';

/**
 * Route guard for authenticated-only routes. Use in a route's `beforeLoad`.
 * Reads the persisted auth store synchronously (localStorage is sync), so it
 * is safe to evaluate before React mounts.
 */
export const requireAuth = () => {
  if (!useAuthStore.getState().isAuthenticated) {
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
