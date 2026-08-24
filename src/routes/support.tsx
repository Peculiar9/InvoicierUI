import { createFileRoute } from '@tanstack/react-router';
import { Support } from '@/pages/Support';
import { requireAuth } from '@/lib/guards';

export const Route = createFileRoute('/support')({
  beforeLoad: requireAuth,
  component: Support,
});
