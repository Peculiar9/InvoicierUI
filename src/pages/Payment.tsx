import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { InvoiceDocument } from '@/components/InvoiceDocument';
import { useInvoice, useMarkInvoicePaid } from '@/hooks';
import { formatCurrency } from '@/utils/format';

export const Payment = ({ invoiceId }: { invoiceId: string }) => {
  const { data: invoice, isLoading } = useInvoice(invoiceId);
  const markPaid = useMarkInvoicePaid();
  const [paid, setPaid] = useState(false);

  const isPaid = paid || invoice?.status === 'paid';

  return (
    <section className="pay-page">
      <header className="pay-top">
        <span className="pay-brand">Invoicier</span>
        <span className="pay-secure">
          <i className="bx bx-lock-alt" /> Secure payment
        </span>
      </header>

      <div className="pay-wrap">
        {isLoading ? (
          <div className="pay-card">
            <p className="pay-loading">Loading invoice…</p>
          </div>
        ) : !invoice ? (
          <div className="pay-card pay-state">
            <span className="pay-icon pay-icon--warn">
              <i className="bx bx-error-circle" />
            </span>
            <h2>Invoice not found</h2>
            <p>This payment link is invalid, or the invoice isn't available on this device.</p>
            <Link to="/" className="pay-btn pay-btn--primary">
              Go to Invoicier
            </Link>
          </div>
        ) : (
          <>
            {isPaid && (
              <div className="pay-banner">
                <i className="bx bx-check-circle" />
                Payment received — invoice #{invoice.invoiceNumber} is paid.
              </div>
            )}

            <div className="pay-doc">
              <InvoiceDocument data={invoice} />
            </div>

            <div className="pay-bar">
              {isPaid ? (
                <>
                  <div className="pay-bar-amount">
                    <span>Status</span>
                    <strong style={{ color: '#0c8d6f' }}>Paid</strong>
                  </div>
                  <button
                    type="button"
                    className="pay-btn pay-btn--ghost"
                    onClick={() => window.print()}
                  >
                    <i className="bx bx-printer" /> Download receipt
                  </button>
                </>
              ) : (
                <>
                  <div className="pay-bar-amount">
                    <span>Amount due</span>
                    <strong>{formatCurrency(invoice.total, invoice.currency)}</strong>
                  </div>
                  <button
                    type="button"
                    className="pay-btn pay-btn--primary"
                    disabled={markPaid.isPending}
                    onClick={() => markPaid.mutate(invoice.id, { onSuccess: () => setPaid(true) })}
                  >
                    {markPaid.isPending ? (
                      <span className="ws-spin" aria-hidden="true" />
                    ) : (
                      <>
                        <i className="bx bx-lock-alt" /> Pay{' '}
                        {formatCurrency(invoice.total, invoice.currency)}
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      <p className="pay-footnote">Demo checkout — no real payment is processed.</p>
    </section>
  );
};
