import { createFileRoute } from '@tanstack/react-router';
import { Services } from '@/pages';
import { requireAuth } from '@/lib/guards';

export const Route = createFileRoute('/services')({
  beforeLoad: requireAuth,
  component: Services,
});
