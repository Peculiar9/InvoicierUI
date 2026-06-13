import { createFileRoute } from '@tanstack/react-router';
import { Invoices } from '@/pages';
import { requireAuth } from '@/lib/guards';

export const Route = createFileRoute('/invoices')({
  beforeLoad: requireAuth,
  component: Invoices,
});
