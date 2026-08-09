import { createFileRoute } from '@tanstack/react-router';
import { VerifyEmail } from '@/pages/VerifyEmail';

// Public on purpose: the emailed deep link must work on a device with no
// session, and a correct code IS the proof of identity; the verify endpoint
// answers with a fresh session, so success signs the visitor in.
export const Route = createFileRoute('/verify-email')({
  // the emailed button lands here with the handle in the URL, so verifying
  // works on a device that never saw the signup
  validateSearch: (search: Record<string, unknown>) => {
    const out: { email?: string; ref?: string } = {};
    if (typeof search.email === 'string') out.email = search.email;
    if (typeof search.ref === 'string') out.ref = search.ref;
    return out;
  },
  component: VerifyEmail,
});
