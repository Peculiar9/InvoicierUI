import { AxiosError } from 'axios';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { InvoiceDocument } from '@/components/InvoiceDocument';
import { ReceiptDocument } from '@/components/ReceiptDocument';
import { useInvoice, useMarkInvoicePaid } from '@/hooks';
import { invoicesApi } from '@/api/invoices';
import { resolveRoutes, PROVIDER_LABELS } from '@/utils/paymentRoutes';
import { useSettingsStore } from '@/stores/settingsStore';
import { formatCurrency, formatDate } from '@/utils/format';
import { todayLocal } from '@/utils/day';
import { isPaid } from '@/utils/invoiceStatus';
import type { Invoice } from '@/types';

type Stage = 'review' | 'method' | 'processing' | 'done' | 'reported';

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
export const Payment = ({
  invoiceId,
  preview = false,
}: {
  invoiceId: string;
  /** the sender looking over their client's shoulder: show, never record */
  preview?: boolean;
}) => {
  const { data: invoice, isLoading, isError, error, refetch, isFetching } =
    useInvoice(invoiceId);
  // a deleted invoice and an unreachable server are not the same news
  const isGone =
    error instanceof AxiosError && error.response?.status === 404;
  const markPaid = useMarkInvoicePaid();
  const queryClient = useQueryClient();
  const profile = useSettingsStore((s) => s.profile);

  const [stage, setStage] = useState<Stage>('review');
  const [method, setMethod] = useState('');
  const [payer_email, setPayerEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [reference, setReference] = useState('');
  const [copied, setCopied] = useState('');

  const copy = (label: string, value: string) => {
    navigator.clipboard?.writeText(value).then(
      () => {
        setCopied(label);
        setTimeout(() => setCopied(''), 1600);
      },
      () => {}
    );
  };

  // a settled invoice opens straight on the receipt
  const invoiceStatus = invoice?.status;
  useEffect(() => {
    if (invoiceStatus && isPaid(invoiceStatus)) setStage('done');
  }, [invoiceStatus]);

  // tell the sender their client opened the link. Fire and forget: a failure
  // here must never stop someone from paying.
  const pinged = useRef(false);
  useEffect(() => {
    if (!invoice || pinged.current || preview) return;
    if (isPaid(invoice.status)) return;
    pinged.current = true;
    invoicesApi.registerView(invoice.id).catch(() => {});
  }, [invoice, preview]);

  useEffect(() => {
    if (invoice && !payer_email) setPayerEmail(invoice.client?.email ?? '');
  }, [invoice, payer_email]);

  const pay = (inv: Invoice) => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payer_email.trim())) {
      setEmailError('We need an address to send your receipt to');
      return;
    }
    setStage('processing');
    markPaid.mutate(
      {
        id: inv.id,
        data: {
          date_received: todayLocal(),
          amount_received: inv.total,
          payment_method: method,
          payer_email: payer_email.trim(),
        },
      },
      {
        // a beat of processing so the confirmation feels earned
        onSuccess: () => setTimeout(() => setStage('done'), 1100),
        onError: () => setStage('method'),
      }
    );
  };

  const reportTransfer = (inv: Invoice) => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payer_email.trim())) {
      setEmailError('We need an address to send your receipt to');
      return;
    }
    setStage('processing');
    invoicesApi
      .claimPayment(inv.id, {
        reference: reference.trim(),
        payer_email: payer_email.trim(),
      })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['invoices', inv.id] });
        setTimeout(() => setStage('reported'), 900);
      })
      .catch(() => setStage('method'));
  };

  const senderName = profile.name || 'Your supplier';
  // what this invoice actually offers: its own choice, then the sender's
  // default for the currency
  const routes = invoice
    ? resolveRoutes(invoice, profile)
    : { instant: true, transfer: false, account: null };

  return (
    <section className={`pay-page${preview ? ' pay-page--preview' : ''}`}>
      {preview && (
        <div className="pay-preview-bar" role="note">
          <i className="bx bx-show" aria-hidden="true" />
          <span>
            This is your client&rsquo;s screen. Nothing here is recorded while you
            look.
          </span>
        </div>
      )}
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
        ) : isError && !isGone ? (
          /* A payer who is told the link is dead simply stops paying. Unless
             the invoice is genuinely gone, say it is us and offer a retry. */
          <div className="pay-card pay-state">
            <span className="pay-icon pay-icon--warn">
              <i className="bx bx-wifi-off" />
            </span>
            <h2>We cannot reach the invoice right now</h2>
            <p>
              This is a problem on our side, not with your payment. The invoice
              is still there. Try again in a moment, or come back to this same
              link later.
            </p>
            <button
              type="button"
              className="pay-btn pay-btn--primary"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              {isFetching ? 'Trying again…' : 'Try again'}
            </button>
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
                const order: Stage[] = ['review', 'method', 'processing', 'reported', 'done'];
                const at = order.indexOf(stage);
                const mine = order.indexOf(key === 'done' ? 'done' : key);
                const state =
                  at > mine
                    ? 'done'
                    : at === mine ||
                        (key === 'method' && stage === 'processing') ||
                        (key === 'done' && stage === 'reported')
                      ? 'now'
                      : '';
                return (
                  <li key={key} className={state}>
                    <span>{i + 1}</span>
                    {key === 'review'
                      ? 'Review'
                      : key === 'method'
                        ? 'Pay'
                        : routes.transfer
                          ? 'Confirm'
                          : 'Receipt'}
                  </li>
                );
              })}
            </ol>

            <div className="pay-grid">
              <div className="pay-doc">
                {/* once it is settled the receipt is the document that matters */}
                {isPaid(invoice.status) ? (
                  <ReceiptDocument invoice={invoice} />
                ) : (
                  <InvoiceDocument data={invoice} />
                )}
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
                      Due {formatDate(invoice.due_date, { month: 'long', day: 'numeric' })}
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

                    {!routes.transfer && (
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
                    )}

                    {routes.transfer && routes.account && (
                      <div className="pay-transfer">
                        <div className="pay-transfer-head">
                          <span className="pay-transfer-tag">
                            {PROVIDER_LABELS[routes.account.provider] ?? 'Transfer'}
                          </span>
                          <b>Send {formatCurrency(invoice.total, invoice.currency)} to</b>
                        </div>
                        <dl className="pay-transfer-rows">
                          {[
                            ['Account name', routes.account.account_name],
                            [
                              routes.account.provider === 'paypal' ? 'PayPal email' : 'Account number',
                              routes.account.account_number,
                            ],
                            ['Bank', routes.account.bank_name],
                            ['Routing / sort code', routes.account.routing_number],
                            ['SWIFT / BIC', routes.account.swift],
                            ['Reference', invoice.invoice_number],
                          ]
                            .filter(([, v]) => Boolean(v))
                            .map(([label, value]) => (
                              <div key={label as string}>
                                <dt>{label}</dt>
                                <dd>
                                  <span>{value}</span>
                                  <button
                                    type="button"
                                    onClick={() => copy(label as string, String(value))}
                                    aria-label={`Copy ${label}`}
                                  >
                                    <i
                                      className={`bx ${
                                        copied === label ? 'bx-check' : 'bx-copy'
                                      }`}
                                    />
                                  </button>
                                </dd>
                              </div>
                            ))}
                        </dl>
                        {routes.account.instructions && (
                          <p className="pay-transfer-note">
                            <i className="bx bx-info-circle" />
                            {routes.account.instructions}
                          </p>
                        )}
                        <label className="pay-field">
                          <span>Your transfer reference (optional)</span>
                          <input
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                            placeholder="The reference your bank gave you"
                          />
                        </label>
                      </div>
                    )}

                    <label className="pay-field">
                      <span>Send my receipt to</span>
                      <input
                        type="email"
                        value={payer_email}
                        disabled={stage === 'processing'}
                        onChange={(e) => {
                          setPayerEmail(e.target.value);
                          setEmailError('');
                        }}
                        placeholder="you@company.com"
                      />
                      {emailError && <small className="pay-error">{emailError}</small>}
                    </label>

                    {routes.transfer && routes.account ? (
                      <button
                        type="button"
                        className="pay-btn pay-btn--primary pay-btn--block"
                        disabled={stage === 'processing'}
                        onClick={() => reportTransfer(invoice)}
                      >
                        {stage === 'processing' ? (
                          <>
                            <span className="iw-spin" aria-hidden="true" />
                            Letting them know
                          </>
                        ) : (
                          <>
                            <i className="bx bx-check" /> I have sent the transfer
                          </>
                        )}
                      </button>
                    ) : (
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
                    )}
                  </div>
                )}

                {stage === 'method' && invoice.declined_at && (
                  <div className="pay-declined">
                    <span className="pay-declined-icon" aria-hidden="true">
                      <i className="bx bx-error-circle" />
                    </span>
                    <div>
                      <b>{senderName} could not find that payment</b>
                      <p>
                        {invoice.decline_reason ||
                          'Nothing had landed when they last checked. Worth confirming the reference and the account details below.'}
                      </p>
                    </div>
                  </div>
                )}

                {stage === 'reported' && (
                  <div className="pay-card pay-card--waiting">
                    <span className="pay-wait-icon" aria-hidden="true">
                      <i className="bx bx-time-five" />
                    </span>
                    <h2>Transfer reported</h2>
                    <p className="pay-done-amount">
                      You told {senderName} you sent{' '}
                      {formatCurrency(invoice.total, invoice.currency)}
                    </p>
                    <p className="pay-wait-copy">
                      Bank transfers take a moment to arrive. {senderName} will
                      confirm once the money lands, and your receipt goes out the
                      same minute.
                    </p>
                    <div className="pay-wait-steps" aria-hidden="true">
                      <span className="done">
                        <i className="bx bx-check" /> You sent it
                      </span>
                      <span className="now">
                        <i className="bx bx-loader-alt" /> Money in transit
                      </span>
                      <span>
                        <i className="bx bx-receipt" /> Receipt issued
                      </span>
                    </div>
                    <p className="pay-reassure">
                      <i className="bx bx-envelope" />
                      We will email {payer_email || 'you'} the moment it is confirmed
                    </p>
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
                      {formatCurrency(invoice.amount_received ?? invoice.total, invoice.currency)} to{' '}
                      {senderName}
                    </p>

                    <div className="pay-receipt-to">
                      <span className="pay-receipt-title">
                        <i className="bx bx-envelope" /> Receipt sent to
                      </span>
                      <span className="pay-receipt-row">
                        <b>{payer_email || invoice.client?.email || 'you'}</b>
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
                      Receipt {invoice.receipt_number ?? invoice.invoice_number} · keep this
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
