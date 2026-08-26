import { AxiosError } from 'axios';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { InvoiceDocument } from '@/components/InvoiceDocument';
import { useMarkInvoicePaid } from '@/hooks';
import { usePageMeta } from '@/hooks/usePageMeta';
import { usePublicInvoice } from '@/hooks/useInvoices';
import { invoicesApi } from '@/api/invoices';
import { resolveRoutes, PROVIDER_LABELS, accountDisplayRows } from '@/utils/paymentRoutes';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency, formatDate } from '@/utils/format';
import { todayLocal } from '@/utils/day';
import { isPaid } from '@/utils/invoiceStatus';
import type { Invoice, PublicPaymentAccount } from '@/types';
import { PayRailReveal } from '@/components/PayRailReveal';


type Stage = 'review' | 'method' | 'processing' | 'done' | 'reported';

/** A rail in the bank-transfer list, normalised into one shape to render. */
type RailKind = 'account' | 'crypto';
type RailGroup = 'local' | 'foreign' | 'crypto';
interface RailItem {
  kind: RailKind;
  provider: string;
  label: string;
  sub: string;
  currency: string;
  rail: PublicPaymentAccount;
  group: RailGroup;
}

const CURRENCY_NAMES: Record<string, string> = {
  NGN: 'Naira',
  USD: 'US Dollar',
  EUR: 'Euro',
  GBP: 'Pound',
};

/** The little heading each cluster of rails sits under. */
const groupName = (group: RailGroup, invoiceCurrency: string): string =>
  group === 'local'
    ? `${CURRENCY_NAMES[invoiceCurrency] ?? invoiceCurrency} accounts`
    : group === 'foreign'
      ? 'Other currencies'
      : 'Crypto';

/** The badge each provider wears in the rail list. */
const railMeta = (provider: string): { label: string; icon: string; tint: string } => {
  switch (provider) {
    case 'crypto':
      return { label: 'Crypto', icon: 'bxl-bitcoin', tint: 'is-crypto' };
    case 'generated':
      return { label: 'Instant', icon: 'bx-timer', tint: 'is-instant' };
    case 'grey':
      return { label: 'Grey', icon: 'bx-transfer-alt', tint: 'is-grey' };
    case 'fincra':
      return { label: 'Fincra', icon: 'bx-transfer-alt', tint: 'is-grey' };
    case 'wise':
      return { label: 'Wise', icon: 'bx-globe', tint: 'is-wise' };
    case 'dom':
    case 'domiciliary':
      return { label: 'Domiciliary account', icon: 'bx-globe', tint: 'is-dom' };
    case 'paypal':
      return { label: 'PayPal', icon: 'bxl-paypal', tint: '' };
    default:
      return { label: PROVIDER_LABELS[provider] ?? 'Bank account', icon: 'bx-building-house', tint: '' };
  }
};

/** The payment_accounts payload uses swift_code / domiciliary; the display
    spec speaks swift / dom. One place to reconcile the two. */
const normaliseRail = (r: PublicPaymentAccount): Record<string, string | null | undefined> => ({
  provider: r.provider === 'domiciliary' ? 'dom' : r.provider,
  currency: r.currency,
  account_name: r.account_name,
  account_number: r.account_number,
  bank_name: r.bank_name,
  routing_number: r.routing_number,
  swift: r.swift_code,
  iban: r.iban,
  instructions: r.instructions,
});

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
  usePageMeta(preview ? 'Invoice preview' : 'Pay invoice');
  // the preview is the owner looking at their own record; a payer is a
  // stranger with a link and gets the public shape
  const { data: invoice, isLoading, isError, error, refetch, isFetching } =
    usePublicInvoice(invoiceId, preview);
  // a deleted invoice and an unreachable server are not the same news
  const isGone =
    error instanceof AxiosError && error.response?.status === 404;
  const markPaid = useMarkInvoicePaid();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const profile = useSettingsStore((s) => s.profile);

  const [stage, setStage] = useState<Stage>('review');
  const [method, setMethod] = useState('');
  const [payer_email, setPayerEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [reference, setReference] = useState('');

  // where the payer is inside the "Pay" step
  const [payView, setPayView] = useState<'choose' | 'paystack' | 'rails'>('choose');
  const [selectedRail, setSelectedRail] = useState<number | null>(null);
  // bumping this remounts the reveal: a fresh loading beat, a fresh window
  const [railNonce, setRailNonce] = useState(0);
  // in checkout the invoice folds into a summary strip; this reopens it
  const [docOpen, setDocOpen] = useState(false);

  // The link is a bookmark to where the payer left off, never a fresh start.
  // A settled invoice opens on the receipt; one the payer has already claimed
  // opens on the "awaiting confirmation" view, so re-opening the email link
  // resumes the flow instead of restarting it.
  const invoiceStatus = invoice?.status;
  useEffect(() => {
    if (!invoiceStatus) return;
    if (isPaid(invoiceStatus)) setStage('done');
    else if (invoiceStatus === 'awaiting') setStage('reported');
  }, [invoiceStatus]);

  // leaving review on a phone, the action card jumps to the top of the grid;
  // bring the viewport with it so the payer is not left staring at the document
  useEffect(() => {
    if (stage !== 'review' && typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    // each stage starts with the invoice folded away again
    setDocOpen(false);
  }, [stage]);

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

  const requireEmail = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payer_email.trim())) {
      setEmailError('We need an address to send your receipt to');
      return false;
    }
    return true;
  };

  const [payNotice, setPayNotice] = useState('');

  const pay = (inv: Invoice) => {
    if (!requireEmail()) return;
    // The demo settle behind this button is an owner's shortcut, an
    // authenticated call. A real payer has no session and must never be
    // handed a 401: they get the honest state of the card rail instead.
    if (!useAuthStore.getState().token) {
      setPayNotice(
        'Card payments are almost here. For now, pay by bank transfer — it takes under a minute.'
      );
      return;
    }
    setStage('processing');
    markPaid.mutate(
      {
        id: inv.id,
        data: {
          date_received: todayLocal(),
          amount_received: inv.total,
          payment_method: method || 'Paystack',
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
    if (!requireEmail()) return;
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

  // On the payer's machine the sender's identity and account come from the
  // PUBLIC PAYLOAD, their localStorage knows nothing. The store only feeds
  // the sender's own preview.
  const payloadAccount = useMemo(
    () =>
      invoice?.payment_account
        ? {
            id: 'public',
            label: invoice.payment_account.label ?? 'Account',
            provider: (invoice.payment_account.provider ?? 'bank') as never,
            currency: invoice.payment_account.currency ?? invoice.currency,
            account_name: invoice.payment_account.account_name ?? '',
            account_number: invoice.payment_account.account_number ?? undefined,
            bank_name: invoice.payment_account.bank_name ?? undefined,
            routing_number: invoice.payment_account.routing_number ?? undefined,
            swift: invoice.payment_account.swift_code ?? undefined,
            iban: invoice.payment_account.iban ?? undefined,
            instructions: invoice.payment_account.instructions ?? undefined,
          }
        : null,
    [invoice]
  );
  const effectiveProfile = useMemo(
    () =>
      preview
        ? profile
        : {
            ...profile,
            name: invoice?.sender_business?.business_name ?? profile.name,
            email: invoice?.sender_business?.email ?? profile.email,
            phone: invoice?.sender_business?.phone ?? profile.phone,
            address: invoice?.sender_business?.address ?? profile.address,
            receivingAccounts: payloadAccount ? [payloadAccount] : [],
            defaultAccountByCurrency: {},
          },
    [preview, profile, invoice, payloadAccount]
  );
  const senderName = effectiveProfile.name || 'Your supplier';
  // what this invoice actually offers: its own choice, then the sender's
  // default for the currency
  const routes = useMemo(
    () =>
      invoice
        ? resolveRoutes(invoice, effectiveProfile)
        : { instant: true, transfer: false, account: null },
    [invoice, effectiveProfile]
  );

  // Paystack is the marquee NGN rail; everything else is a transfer.
  // Paystack is not connected yet. The rail stays visible so a payer knows
  // card is coming, but it cannot be chosen, and the flow opens on the
  // transfer rails that actually move money today.
  const PAYSTACK_LIVE = import.meta.env.VITE_PAYSTACK_LIVE === 'true';
  const paystackShown = Boolean(invoice) && invoice?.currency === 'NGN' && routes.instant;
  const paystackAvailable = paystackShown && PAYSTACK_LIVE;

  // Every rail the sender has added is on offer — a Naira payer may still
  // settle from a dom account, through Wise, or in USDT. Grouped so the
  // invoice's own currency leads, other currencies follow, crypto closes.
  const railItems = useMemo<RailItem[]>(() => {
    if (!invoice) return [];
    const items: RailItem[] = [];
    for (const r of invoice.payment_accounts ?? []) {
      const provider = r.provider ?? 'bank';
      const cur = r.currency ?? '';
      if (provider === 'crypto') {
        items.push({
          kind: 'crypto',
          provider,
          label: r.label ?? `${r.asset ?? 'Crypto'} wallet`,
          sub: [r.asset, r.network].filter(Boolean).join(' · '),
          currency: cur,
          rail: r,
          group: 'crypto',
        });
      } else {
        items.push({
          kind: 'account',
          provider,
          label: r.label ?? railMeta(provider).label,
          sub: r.bank_name ?? r.account_name ?? railMeta(provider).label,
          currency: cur,
          rail: r,
          group: cur === invoice.currency ? 'local' : 'foreign',
        });
      }
    }
    const order: Record<RailGroup, number> = { local: 0, foreign: 1, crypto: 2 };
    return items.sort((a, b) => order[a.group] - order[b.group]);
  }, [invoice]);

  // entering the Pay step: NGN leads with Paystack, everything else with rails
  useEffect(() => {
    if (stage !== 'method') return;
    setPayView(paystackShown ? 'choose' : 'rails');
  }, [stage, paystackAvailable]);

  const openRails = () => {
    setPayView('rails');
    setSelectedRail(null);
  };

  const chooseRail = (i: number) => {
    // toggling to the same rail keeps it; the reveal owns its own load beat
    setSelectedRail(i);
    setEmailError('');
  };

  const showPrinter =
    Boolean(invoice) && (stage === 'done' || (invoice ? isPaid(invoice.status) : false));

  const active = selectedRail != null ? railItems[selectedRail] : null;

  // Entering checkout is entering a secured room: the invoice folds into a
  // summary strip and the payment card takes the whole stage, instead of
  // hanging off the side of the document like a popover.
  const checkoutMode = (stage === 'method' || stage === 'processing') && !showPrinter;

  const renderDoc = () =>
    invoice ? (
      <InvoiceDocument
        data={{
          ...invoice,
          business: preview
            ? null
            : {
                name: invoice.sender_business?.business_name,
                email: invoice.sender_business?.email,
                phone: invoice.sender_business?.phone,
                address: invoice.sender_business?.address,
              },
          // Payment details never sit on the document itself: the payer only
          // sees an account after choosing a rail in the checkout. Keeps bank
          // details out of a link anyone holds.
          payment_account: null,
        }}
      />
    ) : null;

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
          /* Never a blank wait: a shimmering ghost of the page it becomes, so
             nothing shifts when the real content lands. */
          <div className="pay-skel" aria-hidden="true">
            <div className="pay-skel-steps">
              <span /> <span /> <span />
            </div>
            <div className="pay-grid">
              <div className="pay-doc pay-skel-doc">
                <div className="pay-skel-row pay-skel-row--head">
                  <span className="sk sk-badge" />
                  <span className="sk sk-title" />
                </div>
                <div className="pay-skel-parties">
                  <span className="sk sk-line" />
                  <span className="sk sk-line" />
                  <span className="sk sk-line" />
                </div>
                <div className="pay-skel-lines">
                  {[0, 1, 2, 3].map((i) => (
                    <div className="pay-skel-line" key={i}>
                      <span className="sk" />
                      <span className="sk" />
                    </div>
                  ))}
                </div>
                <div className="pay-skel-total">
                  <span className="sk" />
                </div>
              </div>
              <div className="pay-card pay-skel-side">
                <span className="sk sk-eyebrow" />
                <span className="sk sk-amount" />
                <span className="sk sk-sub" />
                <span className="sk sk-btn" />
              </div>
            </div>
            <p className="pay-loading">
              <span className="iw-spin iw-spin--dark" /> Fetching the invoice&hellip;
            </p>
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
              The invoice may have been deleted, or the link is incomplete.
              Check with whoever sent it to you.
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

            {checkoutMode && (
              <div className="pay-shellhead">
                <div className="pay-summary">
                  <span className="pay-summary-mark" aria-hidden="true">
                    {senderName.charAt(0).toUpperCase()}
                  </span>
                  <span className="pay-summary-txt">
                    <b>#{invoice.invoice_number}</b>
                    <small>
                      From {senderName} · due{' '}
                      {formatDate(invoice.due_date, { month: 'short', day: 'numeric' })}
                    </small>
                  </span>
                  <span className="pay-summary-amount">
                    <small>Amount due</small>
                    <b>{formatCurrency(invoice.total, invoice.currency)}</b>
                  </span>
                  <button
                    type="button"
                    className="pay-summary-view"
                    onClick={() => setDocOpen((v) => !v)}
                    aria-expanded={docOpen}
                  >
                    {docOpen ? 'Hide invoice' : 'View invoice'}
                    <i className={`bx bx-chevron-${docOpen ? 'up' : 'down'}`} aria-hidden="true" />
                  </button>
                </div>
                {docOpen && <div className="pay-summary-doc">{renderDoc()}</div>}
              </div>
            )}

            <div className={`pay-grid pay-grid--${stage}`}>
              {/* the done stage is the success card alone; the full receipt
                  (printer, print, download) lives one tap away on /receipt, so
                  nothing renders under the Download button and the page stays
                  clean on every screen */}
              {!checkoutMode && stage !== 'done' && (
                <div className="pay-doc">
                  {renderDoc()}
                </div>
              )}

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
                  <div className="pay-card pay-card--checkout">
                    <div className="pay-checkout-head">
                      <button
                        type="button"
                        className="pay-back"
                        onClick={() => setStage('review')}
                        disabled={stage === 'processing'}
                      >
                        <i className="bx bx-left-arrow-alt" /> Back to invoice
                      </button>
                      <span className="pay-checkout-title">
                        <i className="bx bx-lock-alt" aria-hidden="true" /> Secure checkout
                      </span>
                    </div>

                    {/* ---- the fork: Paystack, or a transfer ---- */}
                    {payView === 'choose' && (
                      <div className="pay-pick">
                        <button
                          type="button"
                          className={`pay-paystack${paystackAvailable ? '' : ' is-soon'}`}
                          onClick={() => paystackAvailable && setPayView('paystack')}
                          disabled={stage === 'processing' || !paystackAvailable}
                          aria-disabled={!paystackAvailable}
                        >
                          <span className="pay-paystack-badge" aria-hidden="true">
                            <i className="bx bx-credit-card-front" />
                          </span>
                          <span className="pay-paystack-txt">
                            <b>Pay by card</b>
                            <small>
                              {paystackAvailable
                                ? 'Card, transfer or USSD · powered by Paystack'
                                : 'Coming soon · powered by Paystack'}
                            </small>
                          </span>
                          {!paystackAvailable && <span className="pay-soon-tag">Soon</span>}
                          <i className="bx bx-right-arrow-alt pay-paystack-go" />
                        </button>

                        <div className="pay-or">
                          <span>or</span>
                        </div>

                        <button
                          type="button"
                          className="pay-alt"
                          onClick={openRails}
                          disabled={stage === 'processing'}
                        >
                          <i className="bx bx-transfer" aria-hidden="true" />
                          <span>
                            <b>{paystackAvailable ? "Can't pay by card?" : 'Pay by bank transfer'}</b>
                            <small>
                              {paystackAvailable
                                ? 'See other ways to pay, like a bank transfer'
                                : 'Send from your banking app, it takes under a minute'}
                            </small>
                          </span>
                          <i className="bx bx-chevron-right" />
                        </button>
                      </div>
                    )}

                    {/* ---- Paystack, stubbed but obviously the default ---- */}
                    {payView === 'paystack' && (
                      <div className="pay-checkout">
                        <button
                          type="button"
                          className="pay-back pay-back--inline"
                          onClick={() => setPayView('choose')}
                        >
                          <i className="bx bx-left-arrow-alt" /> Payment options
                        </button>
                        <div className="pay-checkout-frame">
                          <span className="pay-checkout-brand">
                            <i className="bx bx-credit-card-front" /> Paystack
                          </span>
                          <p className="pay-checkout-lede">Card payments are coming soon.</p>
                          <p className="pay-checkout-note">
                            Card, bank transfer and USSD through Paystack are on the way.
                            For now, use the bank transfer option to pay this invoice.
                          </p>
                        </div>
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
                        {payNotice && (
                          <div className="pay-notice" role="status">
                            <i className="bx bx-info-circle" aria-hidden="true" />
                            <span>{payNotice}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setPayNotice('');
                                openRails();
                              }}
                            >
                              Pay by transfer
                            </button>
                          </div>
                        )}
                        <button
                          type="button"
                          className="pay-btn pay-btn--primary pay-btn--block"
                          disabled={stage === 'processing'}
                          onClick={() => {
                            setMethod('Paystack');
                            pay(invoice);
                          }}
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

                    {/* ---- the transfer rails ---- */}
                    {payView === 'rails' && (
                      <div className="pay-rails-wrap">
                        {paystackAvailable && (
                          <button
                            type="button"
                            className="pay-back pay-back--inline"
                            onClick={() => setPayView('choose')}
                            disabled={stage === 'processing'}
                          >
                            <i className="bx bx-left-arrow-alt" /> Payment options
                          </button>
                        )}

                        {railItems.length === 0 ? (
                          <p className="pay-transfer-note">
                            <i className="bx bx-info-circle" /> The sender has not added a
                            transfer account for {invoice.currency} yet.
                          </p>
                        ) : (
                          <>
                            <span className="pay-rails-title">Choose an account to pay into</span>
                            <div
                              className={`pay-rails${selectedRail != null ? ' has-choice' : ''}`}
                              role="list"
                            >
                              {railItems.map((item, i) => {
                                const meta = railMeta(item.provider);
                                const heading =
                                  i === 0 || railItems[i - 1].group !== item.group
                                    ? groupName(item.group, invoice.currency)
                                    : null;
                                return (
                                  <Fragment key={`${item.provider}-${i}`}>
                                    {heading && (
                                      <span className="pay-rails-group">{heading}</span>
                                    )}
                                    <button
                                      type="button"
                                      role="listitem"
                                      className={`pay-rail${selectedRail === i ? ' active' : ''}`}
                                      onClick={() => chooseRail(i)}
                                      disabled={stage === 'processing'}
                                    >
                                      <span className={`pay-rail-badge ${meta.tint}`} aria-hidden="true">
                                        <i className={`bx ${meta.icon}`} />
                                      </span>
                                      <span className="pay-rail-txt">
                                        <b>{item.label}</b>
                                        {item.sub && <small>{item.sub}</small>}
                                      </span>
                                      {item.currency && (
                                        <span className="pay-rail-cur">{item.currency}</span>
                                      )}
                                      <i
                                        className="bx bx-chevron-right pay-rail-go"
                                        aria-hidden="true"
                                      />
                                    </button>
                                  </Fragment>
                                );
                              })}
                            </div>
                          </>
                        )}

                        {active && (
                          <button
                            type="button"
                            className="pay-change-rail"
                            onClick={() => setSelectedRail(null)}
                          >
                            <i className="bx bx-transfer-alt" aria-hidden="true" /> Change account
                          </button>
                        )}
                        {active ? (
                          <PayRailReveal
                            stickyConfirm
                            key={`${selectedRail}-${railNonce}`}
                            onRetry={() => setRailNonce((n) => n + 1)}
                            onBack={() => setSelectedRail(null)}
                            amountLabel={formatCurrency(
                              invoice.total,
                              active.currency || invoice.currency
                            )}
                            senderName={senderName}
                            kind={active.kind}
                            rows={
                              active.kind === 'account'
                                ? [
                                    ...accountDisplayRows(normaliseRail(active.rail)),
                                    ['Reference', invoice.invoice_number] as [string, string],
                                  ].filter(([, v]) => Boolean(v))
                                : []
                            }
                            crypto={
                              active.kind === 'crypto'
                                ? {
                                    asset: active.rail.asset,
                                    network: active.rail.network,
                                    wallet_address: active.rail.wallet_address,
                                  }
                                : undefined
                            }
                            instructions={active.rail.instructions}
                            payerEmail={payer_email}
                            onPayerEmail={(v) => {
                              setPayerEmail(v);
                              setEmailError('');
                            }}
                            emailError={emailError}
                            reference={reference}
                            onReference={setReference}
                            onConfirm={() => reportTransfer(invoice)}
                            processing={stage === 'processing'}
                          />
                        ) : (
                          railItems.length > 0 && (
                            <p className="pay-choose-hint">
                              <i className="bx bx-up-arrow-alt" aria-hidden="true" /> Pick an
                              account to see where to send it.
                            </p>
                          )
                        )}
                      </div>
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
                        onClick={() =>
                          navigate({
                            to: '/receipt/$invoiceId',
                            params: { invoiceId: invoice.id },
                          })
                        }
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

            {checkoutMode && (
              <p className="pay-secure-note">
                <i className="bx bx-shield-quarter" aria-hidden="true" />
                This checkout is secured. Account details appear only here, never in
                the email.
              </p>
            )}

          </>
        )}
      </div>

      <footer className="pay-footnote">
        <span>
          Pay only into the account shown above.
        </span>
        <Link to="/">
          Invoicing by invoicier<b>.</b>
        </Link>
      </footer>
    </section>
  );
};
