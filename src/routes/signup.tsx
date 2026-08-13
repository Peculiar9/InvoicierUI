import { createFileRoute, redirect } from '@tanstack/react-router';

/**
 * There is no separate signup any more. Onboarding collects the same details
 * with room to explain why, so old links and bookmarks land there instead.
 */
export const Route = createFileRoute('/signup')({
  beforeLoad: () => {
    throw redirect({ to: '/welcome' });
  },
});
