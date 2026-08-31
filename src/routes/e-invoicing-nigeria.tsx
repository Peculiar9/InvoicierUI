import { createFileRoute } from '@tanstack/react-router';
import { EInvoicingNigeria } from '@/pages/EInvoicingNigeria';

export const Route = createFileRoute('/e-invoicing-nigeria')({
  component: EInvoicingNigeria,
});
