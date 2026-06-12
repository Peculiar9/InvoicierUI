import { createFileRoute, redirect } from '@tanstack/react-router';
import { Login } from '@/pages';
import { useAuthStore } from '@/stores/authStore';

export const Route = createFileRoute('/login')({
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (isAuthenticated) {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: Login,
});
