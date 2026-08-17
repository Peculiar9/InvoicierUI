import { formatDate } from '@/utils/format';
import { todayLocal } from '@/utils/day';
import type { Invoice } from '@/types';

/**
 * Everything a printed receipt says.
 *
 * One shape, shared by the full-screen printer (`/receipt`) and the embedded
 * printout on the pay page, so a receipt reads the same wherever the paper
 * comes out.
 */
export interface ReceiptData {
  /** who was paid */
  business: string;
  /** who paid */
  client: string;
  receiptNo: string;
  /** when the money landed */
  paidOn: string;
  invoiceNo: string;
  invoiceIssuedOn: string;
  /** how it was paid, as the payer would name it */
  method: string;
  reference: string;
  /** ISO 4217, so the figures format themselves */
  currency: string;
  lines: { label: string; amount: number }[];
  taxLabel: string;
  taxAmount: number;
  total: number;
}

/** Stands in on `/receipt` when no invoice is named. */
export const DEMO_RECEIPT: ReceiptData = {
  business: 'Ada Studio',
  client: 'Otto Holdings',
  receiptNo: 'RC-0009',
  paidOn: '3 Mar 2027',
  invoiceNo: 'IV2047',
  invoiceIssuedOn: '21 Feb 2027',
  method: 'Paystack',
  reference: 'IV2047-OTT-3M',
  currency: 'NGN',
  lines: [
    { label: 'Brand identity', amount: 2_400_000 },
    { label: 'Motion design', amount: 1_150_000 },
  ],
  taxLabel: 'VAT 7.5%',
  taxAmount: 266_250,
  total: 3_816_250,
};

/**
 * A settled invoice, read as a receipt: what was received, from whom, and
 * against which record.
 */
export const receiptFromInvoice = (
  invoice: Invoice,
  senderName: string
): ReceiptData => {
  const received = invoice.amount_received ?? invoice.total;
  return {
    business: senderName,
    client: invoice.client?.name ?? invoice.bill_to_name ?? 'the payer',
    receiptNo: invoice.receipt_number ?? invoice.invoice_number,
    paidOn: formatDate(invoice.date_received ?? todayLocal()),
    invoiceNo: invoice.invoice_number,
    invoiceIssuedOn: formatDate(invoice.issue_date ?? todayLocal()),
    method: invoice.payment_method ?? 'Bank transfer',
    reference: invoice.claim_reference ?? invoice.invoice_number,
    currency: invoice.currency,
    lines: (invoice.items ?? []).map((it) => ({
      label: it.description || 'Item',
      amount: it.total,
    })),
    taxLabel:
      invoice.tax_rate === 0.075
        ? 'VAT (7.5%)'
        : `Tax (${+((invoice.tax_rate ?? 0) * 100).toFixed(2)}%)`,
    taxAmount: invoice.tax ?? 0,
    total: received,
  };
};
