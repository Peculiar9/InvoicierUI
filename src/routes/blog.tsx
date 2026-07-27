import { createFileRoute } from '@tanstack/react-router';
import { ComingSoon } from '@/pages/ComingSoon';

export const Route = createFileRoute('/blog')({
  component: () => (
    <ComingSoon
      eyebrow="Blog"
      title="We are writing, not posting."
      blurb="When we publish, it will be the things nobody explains: how withholding tax actually works, what the CBN rate does to a dollar invoice, and how to price so March is boring."
      bullets={[
        'Plain-English guides to filing as a freelancer',
        'How foreign payments land, fees and all',
        'What we are building, and why',
        'Numbers from the beta, when we have them',
      ]}
    />
  ),
});
