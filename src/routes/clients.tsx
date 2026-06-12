import { createFileRoute, redirect } from '@tanstack/react-router';
import { Clients } from '@/pages';
import { useAuthStore } from '@/stores/authStore';

export const Route = createFileRoute('/clients')({
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      throw redirect({ to: '/login' });
    }
  },
  component: Clients,
});
