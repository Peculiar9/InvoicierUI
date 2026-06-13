import { createFileRoute } from '@tanstack/react-router';
import { ForgotPassword } from '@/pages';
import { requireGuest } from '@/lib/guards';

export const Route = createFileRoute('/forgot-password')({
  beforeLoad: requireGuest,
  component: ForgotPassword,
});
