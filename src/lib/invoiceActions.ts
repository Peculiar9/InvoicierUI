import { appBaseUrl } from './email';
import { toast } from './toast';
import { formatCurrency, formatDate } from '@/utils/format';
import { useShareSheetStore } from '@/stores/shareSheetStore';

/** What the copy needs to write a line the client can actually read. */
interface CopyableInvoice {
  id: string;
  invoice_number?: string;
  total?: number;
  currency?: string;
  due_date?: string;
}

/**
 * Copy the payment link wrapped in a sentence, not bare. The link usually
 * lands in WhatsApp or a chat, so it should arrive saying who is asking,
 * for how much and by when, with the link as the way in.
 */
export async function copyInvoiceLink(inv: CopyableInvoice, senderName?: string) {
  try {
    const link = `${appBaseUrl()}/pay/${inv.id}`;
    const number = inv.invoice_number ? `invoice ${inv.invoice_number}` : 'an invoice';
    const opener = senderName?.trim()
      ? `Hello! ${senderName.trim()} sent you ${number}`
      : `Hello! You have received ${number}`;
    const amount =
      typeof inv.total === 'number' && inv.currency
        ? ` for ${formatCurrency(inv.total, inv.currency)}`
        : '';
    const due = inv.due_date
      ? `, due ${formatDate(inv.due_date, { month: 'long', day: 'numeric' })}`
      : '';
    const message = `${opener}${amount}${due}. View it and pay securely here: ${link}`;
    await navigator.clipboard.writeText(message);
    // the copy is half the job; the sheet offers the send
    useShareSheetStore.getState().open({ message, link, number: inv.invoice_number });
  } catch {
    toast.error('Could not copy the payment link');
  }
}

/** Open the browser print dialog (Save as PDF), scoped to the invoice via @media print. */
export function printInvoice() {
  window.print();
  toast.info('Use “Save as PDF” in the print dialog to download');
}
