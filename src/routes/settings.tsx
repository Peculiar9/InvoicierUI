import { createFileRoute } from '@tanstack/react-router';
import { Settings } from '@/pages';
import { requireAuth } from '@/lib/guards';

export const Route = createFileRoute('/settings')({
  beforeLoad: requireAuth,
  component: Settings,
});
