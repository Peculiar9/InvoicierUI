import { createFileRoute } from '@tanstack/react-router';
import { requireAuth } from '@/lib/guards';
import { VerifyEmail } from '@/pages/VerifyEmail';

export const Route = createFileRoute('/verify-email')({
  beforeLoad: requireAuth,
  component: VerifyEmail,
});
