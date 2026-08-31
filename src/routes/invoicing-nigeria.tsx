import { createFileRoute } from '@tanstack/react-router';
import { InvoicingNigeria } from '@/pages/InvoicingNigeria';

export const Route = createFileRoute('/invoicing-nigeria')({
  component: InvoicingNigeria,
});
