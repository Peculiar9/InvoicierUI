import { createFileRoute } from '@tanstack/react-router';
import { VerifyEmail } from '@/pages/VerifyEmail';

// Public on purpose: the emailed deep link must work on a device with no
// session, and a correct code IS the proof of identity; the verify endpoint
// answers with a fresh session, so success signs the visitor in.
export const Route = createFileRoute('/verify-email')({
  // the emailed button lands here with the handle in the URL, so verifying
  // works on a device that never saw the signup
  validateSearch: (search: Record<string, unknown>) => {
    const out: { email?: string; ref?: string; code?: string } = {};
    if (typeof search.email === 'string') out.email = search.email;
    if (typeof search.ref === 'string') out.ref = search.ref;
    // the code rides the emailed button so it verifies in one click. the
    // router coerces a bare "4115" to the number 4115, so accept both and
    // normalise back to the four-character string the verify endpoint wants.
    if (search.code !== undefined && search.code !== null) {
      const asText = String(search.code);
      if (/^\d{4}$/.test(asText)) out.code = asText;
    }
    return out;
  },
  component: VerifyEmail,
});
