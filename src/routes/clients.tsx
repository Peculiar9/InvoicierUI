import { createFileRoute } from '@tanstack/react-router';
import { Clients } from '@/pages';
import { requireAuth } from '@/lib/guards';

export const Route = createFileRoute('/clients')({
  beforeLoad: requireAuth,
  component: Clients,
});
