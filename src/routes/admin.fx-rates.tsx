import { createFileRoute } from '@tanstack/react-router';
import { AdminFxRates } from '@/pages';
import { requireAuth } from '@/lib/guards';

export const Route = createFileRoute('/admin/fx-rates')({
  beforeLoad: requireAuth,
  component: AdminFxRates,
});
