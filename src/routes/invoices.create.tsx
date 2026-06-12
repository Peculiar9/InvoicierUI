import { createFileRoute, redirect } from '@tanstack/react-router';
import { CreateInvoice } from '@/pages';
import { useAuthStore } from '@/stores/authStore';

export const Route = createFileRoute('/invoices/create')({
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      throw redirect({ to: '/login' });
    }
  },
  component: CreateInvoice,
});
