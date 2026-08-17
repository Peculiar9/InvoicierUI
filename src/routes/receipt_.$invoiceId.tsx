import { createFileRoute } from '@tanstack/react-router';
import { ReceiptPrinter, ReceiptPrinterStandby } from '@/pages/ReceiptPrinter';
import { usePublicInvoice } from '@/hooks/useInvoices';
import { receiptFromInvoice } from '@/lib/receiptData';
import { isPaid } from '@/utils/invoiceStatus';

/**
 * The receipt for one invoice, on the printer.
 *
 * "Download receipt" lands here: the invoice is fetched, the machine loads it,
 * and the paper feeds out for real rather than in a modal. Public on purpose,
 * a payer holding the link may take their own copy.
 */
const InvoiceReceipt = () => {
  const { invoiceId } = Route.useParams();
  const { data: invoice, isLoading, isError } = usePublicInvoice(invoiceId, false);

  if (isLoading) return <ReceiptPrinterStandby />;

  if (isError || !invoice) {
    return (
      <ReceiptPrinterStandby
        failed
        title="We could not load that receipt"
        note="The link may have expired, or the invoice was removed. Try opening it again from your email."
      />
    );
  }

  if (!isPaid(invoice.status)) {
    return (
      <ReceiptPrinterStandby
        failed
        title="No receipt yet"
        note="A receipt prints once the payment has been confirmed. Nothing has been recorded against this invoice."
      />
    );
  }

  const senderName = invoice.sender_business?.business_name ?? 'the sender';
  return <ReceiptPrinter receipt={receiptFromInvoice(invoice, senderName)} autoPrint />;
};

export const Route = createFileRoute('/receipt_/$invoiceId')({
  component: InvoiceReceipt,
});
