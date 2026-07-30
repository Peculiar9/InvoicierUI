import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { InvoiceDocument } from '@/components/InvoiceDocument';
import { useInvoice, useMarkInvoicePaid } from '@/hooks';
import { invoicesApi } from '@/api/invoices';
import { useSettingsStore } from '@/stores/settingsStore';
import { formatCurrency, formatDate } from '@/utils/format';
import { isPaid } from '@/utils/invoiceStatus';
import type { Invoice } from '@/types';

type Stage = 'review' | 'method' | 'processing' | 'done';

/** How the money can arrive, by currency. NGN is instant; the rest are transfers. */
const methodsFor = (currency: string) =>
  currency === 'NGN'
    ? [
        { key: 'card', icon: 'bx-credit-card-front', name: 'Card', line: 'Visa, Mastercard, Verve' },
        { key: 'transfer', icon: 'bx-transfer', name: 'Bank transfer', line: 'Instant, via Paystack' },
        { key: 'ussd', icon: 'bx-mobile-alt', name: 'USSD', line: 'Dial and confirm' },
      ]
    : [
        { key: 'wire', icon: 'bx-globe', name: 'Bank transfer', line: `Pay in ${currency}` },
        { key: 'card', icon: 'bx-credit-card-front', name: 'Card', line: 'Visa, Mastercard' },
      ];

/**
 * What the client sees when they open a payment link. They never signed up
 * for anything, so the page has one job: make the invoice legible and the
 * payment obvious, then show them exactly where their receipt went.
 */
export const Payment = ({ invoiceId }: { invoiceId: string }) => {
  const { data: invoice, isLoading } = useInvoice(invoiceId);
  const markPaid = useMarkInvoicePaid();
  const profile = useSettingsStore((s) => s.profile);

  const [stage, setStage] = useState<Stage>('review');
  const [method, setMethod] = useState('');
  const [payerEmail, setPayerEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  // a settled invoice opens straight on the receipt
  useEffect(() => {
    if (invoice && isPaid(invoice.status)) setStage('done');
  }, [invoice?.status]);

  // tell the sender their client opened the link. Fire and forget: a failure
  // here must never stop someone from paying.
  const pinged = useRef(false);
  useEffect(() => {
    if (!invoice || pinged.current) return;
    if (isPaid(invoice.status)) return;
    pinged.current = true;
    invoicesApi.registerView(invoice.id).catch(() => {});
  }, [invoice]);

  useEffect(() => {
    if (invoice && !payerEmail) setPayerEmail(invoice.client?.email ?? '');
  }, [invoice, payerEmail]);

  const pay = (inv: Invoice) => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payerEmail.trim())) {
      setEmailError('We need an address to send your receipt to');
      return;
    }
    setStage('processing');
    markPaid.mutate(
      {
        id: inv.id,
        data: {
          dateReceived: new Date().toISOString().slice(0, 10),
          amountReceived: inv.total,
          paymentMethod: method,
          payerEmail: payerEmail.trim(),
        },
      },
      {
        // a beat of processing so the confirmation feels earned
        onSuccess: () => setTimeout(() => setStage('done'), 1100),
        onError: () => setStage('method'),
      }
    );
  };

  const senderName = profile.name || 'Your supplier';

  return (
    <section className="pay-page">
      <header className="pay-top">
        <span className="pay-brand">
          invoicier<b>.</b>
        </span>
        <span className="pay-secure">
          <i className="bx bx-lock-alt" /> Secure payment
        </span>
      </header>

      <div className="pay-wrap">
        {isLoading ? (
          <div className="pay-card pay-state">
            <span className="iw-spin iw-spin--dark" aria-hidden="true" />
            <p className="pay-loading">Fetching the invoice…</p>
          </div>
        ) : !invoice ? (
          <div className="pay-card pay-state">
            <span className="pay-icon pay-icon--warn">
              <i className="bx bx-error-circle" />
            </span>
            <h2>This link has nothing behind it</h2>
            <p>
              The invoice may have been deleted, or this demo link was created
              in a different browser.
            </p>
            <Link to="/" className="pay-btn pay-btn--primary">
              Go to Invoicier
            </Link>
          </div>
        ) : (
          <>
            {/* where the payer is in the flow */}
            <ol className="pay-steps" aria-label="Payment steps">
              {(['review', 'method', 'done'] as const).map((key, i) => {
                const order: Stage[] = ['review', 'method', 'processing', 'done'];
                const at = order.indexOf(stage);
                const mine = order.indexOf(key === 'done' ? 'done' : key);
                const state = at > mine ? 'done' : at === mine || (key === 'method' && stage === 'processing') ? 'now' : '';
                return (
                  <li key={key} className={state}>
                    <span>{i + 1}</span>
                    {key === 'review' ? 'Review' : key === 'method' ? 'Pay' : 'Receipt'}
                  </li>
                );
              })}
            </ol>

            <div className="pay-grid">
              <div className="pay-doc">
                <InvoiceDocument data={invoice} />
              </div>

              <aside className="pay-side">
                {stage === 'review' && (
                  <div className="pay-card">
                    <span className="pay-from">
                      <i className="bx bx-buildings" />
                      From {senderName}
                    </span>
                    <span className="pay-amount-label">Amount due</span>
                    <strong className="pay-amount">
                      {formatCurrency(invoice.total, invoice.currency)}
                    </strong>
                    <p className="pay-due">
                      Due {formatDate(invoice.dueDate, { month: 'long', day: 'numeric' })}
                      {invoice.currency !== 'NGN' && ` · paid in ${invoice.currency}`}
                    </p>
                    <button
                      type="button"
                      className="pay-btn pay-btn--primary pay-btn--block"
                      onClick={() => setStage('method')}
                    >
                      Pay this invoice <i className="bx bx-right-arrow-alt" />
                    </button>
                    <p className="pay-reassure">
                      <i className="bx bx-shield-quarter" />
                      No account needed. Your receipt arrives by email.
                    </p>
                  </div>
                )}

                {(stage === 'method' || stage === 'processing') && (
                  <div className="pay-card">
                    <button
                      type="button"
                      className="pay-back"
                      onClick={() => setStage('review')}
                      disabled={stage === 'processing'}
                    >
                      <i className="bx bx-left-arrow-alt" /> Back
                    </button>
                    <span className="pay-amount-label">Paying</span>
                    <strong className="pay-amount">
                      {formatCurrency(invoice.total, invoice.currency)}
                    </strong>

                    <div className="pay-methods">
                      {methodsFor(invoice.currency).map((m) => (
                        <button
                          key={m.key}
                          type="button"
                          className={`pay-method${method === m.key ? ' active' : ''}`}
                          onClick={() => setMethod(m.key)}
                          disabled={stage === 'processing'}
                        >
                          <i className={`bx ${m.icon}`} />
                          <span>
                            <b>{m.name}</b>
                            <small>{m.line}</small>
                          </span>
                          <i className="bx bx-check pay-method-tick" />
                        </button>
                      ))}
                    </div>

                    <label className="pay-field">
                      <span>Send my receipt to</span>
                      <input
                        type="email"
                        value={payerEmail}
                        disabled={stage === 'processing'}
                        onChange={(e) => {
                          setPayerEmail(e.target.value);
                          setEmailError('');
                        }}
                        placeholder="you@company.com"
                      />
                      {emailError && <small className="pay-error">{emailError}</small>}
                    </label>

                    <button
                      type="button"
                      className="pay-btn pay-btn--primary pay-btn--block"
                      disabled={!method || stage === 'processing'}
                      onClick={() => pay(invoice)}
                    >
                      {stage === 'processing' ? (
                        <>
                          <span className="iw-spin" aria-hidden="true" />
                          Confirming payment
                        </>
                      ) : (
                        <>
                          <i className="bx bx-lock-alt" /> Pay{' '}
                          {formatCurrency(invoice.total, invoice.currency)}
                        </>
                      )}
                    </button>
                  </div>
                )}

                {stage === 'done' && (
                  <div className="pay-card pay-card--done">
                    <svg className="pay-check" viewBox="0 0 72 72" aria-hidden="true">
                      <circle cx="36" cy="36" r="32" fill="none" strokeWidth="4" />
                      <path
                        d="M22 37 L32 47 L51 27"
                        fill="none"
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <h2>Payment successful</h2>
                    <p className="pay-done-amount">
                      {formatCurrency(invoice.amountReceived ?? invoice.total, invoice.currency)} to{' '}
                      {senderName}
                    </p>

                    <div className="pay-receipt-to">
                      <span className="pay-receipt-title">
                        <i className="bx bx-envelope" /> Receipt sent to
                      </span>
                      <span className="pay-receipt-row">
                        <b>{payerEmail || invoice.client?.email || 'you'}</b>
                        <small>your copy</small>
                      </span>
                      <span className="pay-receipt-row">
                        <b>{profile.email || 'the sender'}</b>
                        <small>{senderName}</small>
                      </span>
                    </div>

                    <div className="pay-done-actions">
                      <button
                        type="button"
                        className="pay-btn pay-btn--ghost pay-btn--block"
                        onClick={() => window.print()}
                      >
                        <i className="bx bx-download" /> Download receipt
                      </button>
                    </div>

                    <p className="pay-reassure">
                      <i className="bx bx-check-shield" />
                      Receipt {invoice.receiptNumber ?? invoice.invoiceNumber} · keep this
                      for your records
                    </p>
                  </div>
                )}
              </aside>
            </div>
          </>
        )}
      </div>

      <footer className="pay-footnote">
        <span>
          Demo checkout, no real payment is processed.
        </span>
        <Link to="/">
          Invoicing by invoicier<b>.</b>
        </Link>
      </footer>
    </section>
  );
};
