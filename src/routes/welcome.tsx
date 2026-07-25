import { createFileRoute } from '@tanstack/react-router';
import { requireAuth } from '@/lib/guards';
import { Welcome } from '@/pages/Welcome';

export const Route = createFileRoute('/welcome')({
  beforeLoad: requireAuth,
  component: Welcome,
});
