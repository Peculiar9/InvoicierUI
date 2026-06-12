import { createFileRoute, redirect } from '@tanstack/react-router';
import { Dashboard } from '@/pages';
import { useAuthStore } from '@/stores/authStore';

export const Route = createFileRoute('/dashboard')({
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      throw redirect({ to: '/login' });
    }
  },
  component: Dashboard,
});
