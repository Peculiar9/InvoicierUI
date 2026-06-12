import { createFileRoute, redirect } from '@tanstack/react-router';
import { Invoices } from '@/pages';
import { useAuthStore } from '@/stores/authStore';

export const Route = createFileRoute('/invoices')({
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      throw redirect({ to: '/login' });
    }
  },
  component: Invoices,
});
