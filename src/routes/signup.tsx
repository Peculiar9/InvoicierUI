import { createFileRoute } from '@tanstack/react-router';
import { Signup } from '@/pages';

export const Route = createFileRoute('/signup')({
  component: Signup,
});
