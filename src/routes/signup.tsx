import { createFileRoute, redirect } from '@tanstack/react-router';
import { Signup } from '@/pages';
import { useAuthStore } from '@/stores/authStore';

export const Route = createFileRoute('/signup')({
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (isAuthenticated) {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: Signup,
});
