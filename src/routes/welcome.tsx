import { createFileRoute } from '@tanstack/react-router';
import { Welcome } from '@/pages/Welcome';

/**
 * Onboarding is the signup: it is where an account is created, so it must be
 * reachable by someone who does not have one yet.
 */
export const Route = createFileRoute('/welcome')({
  component: Welcome,
});
