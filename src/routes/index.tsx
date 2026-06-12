import { createFileRoute } from '@tanstack/react-router';
import { Landing } from '@/pages';

export const Route = createFileRoute('/')({
  component: Landing,
});
