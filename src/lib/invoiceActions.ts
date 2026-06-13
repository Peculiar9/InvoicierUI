import { appBaseUrl } from './email';
import { toast } from './toast';

/** Copy the invoice's public payment link (origin-aware) to the clipboard. */
export async function copyInvoiceLink(id: string) {
  try {
    const link = `${appBaseUrl()}/pay/${id}`;
    await navigator.clipboard.writeText(link);
    toast.success('Payment link copied to clipboard');
  } catch {
    toast.error('Could not copy the payment link');
  }
}

/** Open the browser print dialog (Save as PDF) — scoped to the invoice via @media print. */
export function printInvoice() {
  window.print();
  toast.info('Use “Save as PDF” in the print dialog to download');
}
