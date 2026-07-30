import type { InvoiceStatus } from '@/types';

/**
 * The money has arrived. A paid invoice becomes 'receipted' the moment its
 * receipt is issued, so anything counting income has to accept both, or paid
 * work silently reads as still owed.
 */
export const isPaid = (status: InvoiceStatus): boolean =>
  status === 'paid' || status === 'receipted';

/** Finished, one way or another: nothing more is owed and nothing is chased. */
export const isSettled = (status: InvoiceStatus): boolean =>
  isPaid(status) || status === 'cancelled';

/** Still owed: sent, viewed, pending or overdue. */
export const isOutstanding = (status: InvoiceStatus): boolean =>
  !isSettled(status) && status !== 'draft';
