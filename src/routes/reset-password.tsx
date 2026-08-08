import { createFileRoute } from '@tanstack/react-router';
import { ResetPassword } from '@/pages/ResetPassword';

// Public: the emailed link lands here carrying ?token=
export const Route = createFileRoute('/reset-password')({
  component: ResetPassword,
});
