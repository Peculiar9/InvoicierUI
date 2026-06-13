import { createFileRoute } from '@tanstack/react-router';
import { Login } from '@/pages';
import { requireGuest } from '@/lib/guards';

export const Route = createFileRoute('/login')({
  beforeLoad: requireGuest,
  component: Login,
});
