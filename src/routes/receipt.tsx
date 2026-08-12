import { createFileRoute } from '@tanstack/react-router';
import { ReceiptPrinter } from '@/pages/ReceiptPrinter';

export const Route = createFileRoute('/receipt')({
  component: ReceiptPrinter,
});
