import { createFileRoute } from '@tanstack/react-router';
import { HowItWorks } from '@/pages/HowItWorks';

export const Route = createFileRoute('/how-it-works')({
  component: HowItWorks,
});
