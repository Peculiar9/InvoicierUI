import { createFileRoute } from '@tanstack/react-router';
import { AdminBankLogos } from '@/pages';
import { requireAuth } from '@/lib/guards';

export const Route = createFileRoute('/admin/bank-logos')({
  beforeLoad: requireAuth,
  component: AdminBankLogos,
});
