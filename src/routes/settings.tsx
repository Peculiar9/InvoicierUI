import { createFileRoute, redirect } from '@tanstack/react-router';
import { Settings } from '@/pages';
import { useAuthStore } from '@/stores/authStore';

export const Route = createFileRoute('/settings')({
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      throw redirect({ to: '/login' });
    }
  },
  component: Settings,
});
