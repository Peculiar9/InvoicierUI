import { createFileRoute } from '@tanstack/react-router';
import { ComingSoon } from '@/pages/ComingSoon';

export const Route = createFileRoute('/legal')({
  component: () => (
    <ComingSoon
      eyebrow="Terms & privacy"
      title="The fine print is being written properly."
      blurb="We would rather publish terms a lawyer has read than paste a template. Until then, the short version: your data is yours, we do not sell it, and you can export everything at any time."
      bullets={[
        'Terms of service',
        'Privacy policy and what we store',
        'How exports and deletion work',
        'Who we share data with, which is nobody',
      ]}
    />
  ),
});
