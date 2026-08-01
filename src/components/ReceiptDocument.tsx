import type { CSSProperties } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { formatCurrency, formatDate } from '@/utils/format';
import type { Invoice } from '@/types';

/**
 * The receipt is its own document, not the invoice with a different word on
 * it: it leads with what was received, when, and how, because that is what
 * both sides need to file.
 */
export const ReceiptDocument = ({ invoice }: { invoice: Invoice }) => {
  const profile = useSettingsStore((s) => s.profile);
  const received = invoice.amountReceived ?? invoice.total;
  const short = received < invoice.total;

  return (
    <article
      className="rcpt"
      style={{ '--acc': profile.brandColor ?? '#924ee9' } as CSSProperties}
    >
      <header className="rcpt-top">
        <div className="rcpt-brand">
          {profile.logo ? (
            <img src={profile.logo} alt="" className="rcpt-logo" />
          ) : (
            <span className="rcpt-monogram">
              {(profile.name || 'I').charAt(0).toUpperCase()}
            </span>
          )}
          <div>
            <b>{profile.name}</b>
            <small>{profile.email}</small>
          </div>
        </div>
        <div className="rcpt-id">
          <span>Receipt</span>
          <b>{invoice.receiptNumber ?? invoice.invoiceNumber}</b>
        </div>
      </header>

      <div className="rcpt-hero">
        <span>Received</span>
        <strong>{formatCurrency(received, invoice.currency)}</strong>
        <small>
          from {invoice.client?.name}
          {invoice.dateReceived ? ` on ${formatDate(invoice.dateReceived)}` : ''}
        </small>
        <span className="rcpt-stamp" aria-hidden="true">
          Paid
        </span>
      </div>

      <dl className="rcpt-rows">
        <div>
          <dt>For invoice</dt>
          <dd>{invoice.invoiceNumber}</dd>
        </div>
        <div>
          <dt>Invoice total</dt>
          <dd>{formatCurrency(invoice.total, invoice.currency)}</dd>
        </div>
        {short && (
          <div>
            <dt>Balance still owed</dt>
            <dd className="rcpt-owed">
              {formatCurrency(invoice.total - received, invoice.currency)}
            </dd>
          </div>
        )}
        {invoice.paymentMethod && (
          <div>
            <dt>Paid by</dt>
            <dd>{invoice.paymentMethod}</dd>
          </div>
        )}
        {invoice.whtWithheld ? (
          <div>
            <dt>Tax withheld</dt>
            <dd>{formatCurrency(invoice.whtWithheld, invoice.currency)}</dd>
          </div>
        ) : null}
        {invoice.claimReference && (
          <div>
            <dt>Their reference</dt>
            <dd>{invoice.claimReference}</dd>
          </div>
        )}
      </dl>

      <footer className="rcpt-foot">
        <span>
          Issued by {profile.name}
          {invoice.receiptedAt ? ` · ${formatDate(invoice.receiptedAt)}` : ''}
        </span>
        <span className="rcpt-mark">
          invoicier<b>.</b>
        </span>
      </footer>
    </article>
  );
};
