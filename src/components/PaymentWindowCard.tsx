import { useCallback, useEffect, useRef, useState } from 'react';
import { invoicesApi } from '@/api/invoices';
import { formatCurrency } from '@/utils/format';
import type { Invoice, PaymentWindow } from '@/types';

interface PaymentWindowCardProps {
  invoice: Invoice;
  payerEmail: string;
  /** the payer pressed "I've sent it" and the sender has been asked */
  onReported: () => void;
  /** the parent validates the email; this card just refuses without one */
  requireEmail: () => boolean;
}

const mmss = (totalSeconds: number): string => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

/**
 * The generated account, on the clock.
 *
 * The countdown is the contract, not decoration: the backend refuses a
 * "payment sent" outside the window, so the card counts honestly from the
 * server's expiry timestamp, warns as it runs low, and offers a fresh
 * window, never a stale confirmation, once time is up.
 */
export const PaymentWindowCard = ({
  invoice,
  payerEmail,
  onReported,
  requireEmail,
}: PaymentWindowCardProps) => {
  const [window_, setWindow] = useState<PaymentWindow | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [state, setState] = useState<'opening' | 'open' | 'expired' | 'sending' | 'failed'>('opening');
  const [copied, setCopied] = useState('');
  const expiresAtRef = useRef<number>(0);

  const openWindow = useCallback(async () => {
    setState('opening');
    try {
      const window = await invoicesApi.openPaymentSession(invoice.id);
      setWindow(window);
      expiresAtRef.current = new Date(window.expires_at).getTime();
      setRemaining(window.seconds_remaining);
      setState('open');
    } catch {
      setState('failed');
    }
  }, [invoice.id]);

  useEffect(() => {
    void openWindow();
  }, [openWindow]);

  // one honest ticking clock, derived from the server's expiry every second
  useEffect(() => {
    if (state !== 'open') return;
    const timer = setInterval(() => {
      const left = Math.max(0, Math.floor((expiresAtRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) setState('expired');
    }, 1000);
    return () => clearInterval(timer);
  }, [state]);

  // walking away mid-window deserves a pause for thought
  useEffect(() => {
    if (state !== 'open') return;
    const guard = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    globalThis.addEventListener('beforeunload', guard);
    return () => globalThis.removeEventListener('beforeunload', guard);
  }, [state]);

  const copy = (label: string, value: string) => {
    navigator.clipboard?.writeText(value).then(
      () => {
        setCopied(label);
        setTimeout(() => setCopied(''), 1600);
      },
      () => {}
    );
  };

  const report = async () => {
    if (!window_ || !requireEmail()) return;
    setState('sending');
    try {
      await invoicesApi.paymentSent(invoice.id, {
        window_id: window_.id,
        payer_email: payerEmail.trim(),
      });
      onReported();
    } catch (error) {
      const gone =
        (error as { response?: { status?: number } })?.response?.status === 410;
      setState(gone ? 'expired' : 'open');
    }
  };

  if (state === 'failed') {
    return (
      <div className="pay-window pay-window--closed">
        <i className="bx bx-shield-x" aria-hidden="true" />
        <b>Could not open a payment window.</b>
        <p>The sender may not have an account for {invoice.currency} yet.</p>
      </div>
    );
  }

  if (state === 'opening' || !window_) {
    return (
      <div className="pay-window pay-window--loading">
        <span className="iw-spin iw-spin--dark" aria-hidden="true" />
        Generating your account…
      </div>
    );
  }

  if (state === 'expired') {
    return (
      <div className="pay-window pay-window--closed">
        <i className="bx bx-time-five" aria-hidden="true" />
        <b>This payment window has closed.</b>
        <p>
          For your safety the details above are no longer valid. Open a fresh
          window and pay within it.
        </p>
        <button type="button" className="pay-btn pay-btn--primary" onClick={() => void openWindow()}>
          Open a fresh window
        </button>
      </div>
    );
  }

  const low = remaining <= 5 * 60;
  const rows: [string, string][] = (
    [
      ['Account name', window_.account.account_name],
      ['Account number', window_.account.account_number],
      ['Bank', window_.account.bank_name],
      ['Reference', window_.reference],
    ] as [string, string | null | undefined][]
  ).filter((entry): entry is [string, string] => Boolean(entry[1]));

  return (
    <div className="pay-window">
      <div className={`pay-window-clock${low ? ' is-low' : ''}`} role="timer" aria-live="polite">
        <i className="bx bx-time-five" aria-hidden="true" />
        <b>{mmss(remaining)}</b>
        <span>{low ? 'window closing soon' : 'to pay within this window'}</span>
      </div>

      <p className="pay-window-lede">
        Send <b>{formatCurrency(invoice.total, invoice.currency)}</b> to this
        account and quote the reference <em>exactly</em>. It is how your
        payment finds this invoice.
      </p>

      <dl className="pay-transfer-rows">
        {rows.map(([label, value]) => (
          <div key={label} className={label === 'Reference' ? 'pay-window-ref' : undefined}>
            <dt>{label}</dt>
            <dd>
              <span>{value}</span>
              <button type="button" onClick={() => copy(label, value)} aria-label={`Copy ${label}`}>
                <i className={`bx ${copied === label ? 'bx-check' : 'bx-copy'}`} />
              </button>
            </dd>
          </div>
        ))}
      </dl>
      {window_.account.instructions && (
        <p className="pay-transfer-note">
          <i className="bx bx-info-circle" aria-hidden="true" />
          {window_.account.instructions}
        </p>
      )}

      <button
        type="button"
        className="pay-btn pay-btn--primary pay-btn--block"
        disabled={state === 'sending'}
        onClick={() => void report()}
      >
        {state === 'sending' ? 'Telling the sender…' : "I've sent this payment"}
      </button>
      <p className="pay-window-fine">
        Paid inside the window, your payment confirms automatically the moment
        it lands. Pressing the button also asks the sender to check.
      </p>
    </div>
  );
};
