import { useEffect, useRef, useState } from 'react';

/** default payer window; the real PaymentWindow.expires_at can replace this later */
const WINDOW_SECONDS = 20 * 60;
/** the reveal never flickers: loading holds for at least this long */
const REVEAL_MIN_MS = 3000;

const mmss = (total: number): string => {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export interface PayRailRevealProps {
  /** the amount to send, already formatted in the rail's own currency */
  amountLabel: string;
  senderName: string;
  kind: 'account' | 'crypto';
  /** account rails: the copyable rows (bank details + Reference) */
  rows: [string, string][];
  /** crypto rails: what to send, where */
  crypto?: { asset?: string | null; network?: string | null; wallet_address?: string | null };
  instructions?: string | null;
  payerEmail: string;
  onPayerEmail: (v: string) => void;
  emailError: string;
  reference: string;
  onReference: (v: string) => void;
  onConfirm: () => void;
  processing: boolean;
  /** when a real PaymentWindow exists, its expiry drives the clock instead of the default */
  expiresAt?: string | null;
  /** the window closed: mint a fresh one for the same rail */
  onRetry: () => void;
  /** the window closed: go back and pick a different account */
  onBack: () => void;
  /** on a phone the confirm rides at the bottom of the screen */
  stickyConfirm?: boolean;
}

/**
 * The reveal card. Selecting a rail slides this in: it FIRST shows a calm,
 * professional "Loading payment options…" state for a guaranteed beat (so it
 * never flashes), THEN reveals that rail's details on a 20-minute clock.
 *
 * The parent remounts it (key=rail) when the payer switches rails, which
 * restarts the loading beat and the countdown cleanly.
 */
export const PayRailReveal = ({
  amountLabel,
  senderName,
  kind,
  rows,
  crypto,
  instructions,
  payerEmail,
  onPayerEmail,
  emailError,
  reference,
  onReference,
  onConfirm,
  processing,
  expiresAt,
  onRetry,
  onBack,
  stickyConfirm = false,
}: PayRailRevealProps) => {
  const [loading, setLoading] = useState(true);
  const [left, setLeft] = useState(WINDOW_SECONDS);
  const [copied, setCopied] = useState('');
  const expiryRef = useRef(0);

  // hold loading for at least REVEAL_MIN_MS. In dev there is nothing to fetch,
  // so `work` resolves at once and the 3s floor decides; a real details fetch
  // slots into `work` and, if it runs longer than 3s, the reveal waits for it.
  useEffect(() => {
    let cancelled = false;
    const work = Promise.resolve();
    void Promise.all([work, new Promise((r) => setTimeout(r, REVEAL_MIN_MS))]).then(() => {
      if (cancelled) return;
      // dev only: ?window=15 shortens the clock so expiry is testable
      const devOverride = import.meta.env.DEV
        ? Number(new URLSearchParams(globalThis.location?.search ?? '').get('window')) || null
        : null;
      const windowSeconds =
        expiresAt != null
          ? Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
          : devOverride ?? WINDOW_SECONDS;
      expiryRef.current = Date.now() + windowSeconds * 1000;
      setLeft(windowSeconds);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [expiresAt]);

  // one honest ticking clock, derived from the target expiry every second
  useEffect(() => {
    if (loading) return;
    const timer = setInterval(() => {
      const l = Math.max(0, Math.floor((expiryRef.current - Date.now()) / 1000));
      setLeft(l);
      if (l <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [loading]);

  const copy = (label: string, value: string) => {
    navigator.clipboard?.writeText(value).then(
      () => {
        setCopied(label);
        setTimeout(() => setCopied(''), 1600);
      },
      () => {}
    );
  };

  const copyAllText =
    kind === 'crypto'
      ? String(crypto?.wallet_address ?? '')
      : rows.map(([l, v]) => `${l}: ${v}`).join('\n');

  if (loading) {
    return (
      <div className="pay-reveal">
        <div className="pay-reveal-loading">
          <span className="iw-spin iw-spin--dark" aria-hidden="true" />
          <b>Loading payment options…</b>
          <small>Securing the account details for this transfer</small>
        </div>
      </div>
    );
  }

  // The clock ran out: the details leave the screen. An expired window is the
  // security feature working, so it is said plainly, with the way forward.
  if (left <= 0) {
    return (
      <div className="pay-reveal">
        <div className="pay-expired" role="status">
          <span className="pay-expired-icon" aria-hidden="true">
            <i className="bx bx-time-five" />
          </span>
          <b>This payment window has closed</b>
          <p>
            For your safety the account details are only shown for a limited
            time. Nothing was charged. Get fresh details to finish paying.
          </p>
          <button
            type="button"
            className="pay-btn pay-btn--primary pay-btn--block"
            onClick={onRetry}
          >
            <i className="bx bx-refresh" /> Get fresh details
          </button>
          <button type="button" className="pay-expired-back" onClick={onBack}>
            Choose a different account
          </button>
        </div>
      </div>
    );
  }

  const low = left <= 5 * 60;

  return (
    <div className="pay-reveal">
      <div className="pay-reveal-body">
        <div className="pay-reveal-head">
          <span className="pay-reveal-eyebrow">Pay</span>
          <div className="pay-reveal-amt">
            <strong>{amountLabel}</strong>
            <span>to {senderName}</span>
          </div>
        </div>

        <div
          className={`pay-window-clock${low ? ' is-low' : ''}`}
          role="timer"
          aria-live="polite"
        >
          <i className="bx bx-time-five" aria-hidden="true" />
          <b>{mmss(left)}</b>
          <span>{low ? 'window closing soon' : 'to complete this transfer'}</span>
        </div>

        {kind === 'crypto' ? (
          <div className="pay-crypto">
            <div className="pay-crypto-chips">
              {crypto?.asset && <span className="pay-chip">{crypto.asset}</span>}
              {crypto?.network && <span className="pay-chip pay-chip--net">{crypto.network}</span>}
            </div>
            <div className="pay-crypto-addr">
              <span className="pay-field-label">Wallet address</span>
              <div className="pay-crypto-addr-row">
                <code>{crypto?.wallet_address}</code>
                <button
                  type="button"
                  onClick={() => copy('wallet', String(crypto?.wallet_address ?? ''))}
                  aria-label="Copy wallet address"
                >
                  <i className={`bx ${copied === 'wallet' ? 'bx-check' : 'bx-copy'}`} />
                </button>
              </div>
            </div>
            <p className="pay-transfer-note pay-caution">
              <i className="bx bx-shield-quarter" />
              Send only {crypto?.asset ?? 'this asset'} on the {crypto?.network ?? 'stated'} network.
              Verify the address before you send — crypto transfers cannot be reversed.
            </p>
          </div>
        ) : (
          <div className="pay-transfer">
            <dl className="pay-transfer-rows">
              {rows.map(([label, value]) => (
                <div key={label} className={label === 'Reference' ? 'pay-window-ref' : undefined}>
                  <dt>{label}</dt>
                  <dd>
                    <span>{value}</span>
                    <button
                      type="button"
                      onClick={() => copy(label, value)}
                      aria-label={`Copy ${label}`}
                    >
                      <i className={`bx ${copied === label ? 'bx-check' : 'bx-copy'}`} />
                    </button>
                  </dd>
                </div>
              ))}
            </dl>
            {instructions && (
              <p className="pay-transfer-note">
                <i className="bx bx-info-circle" />
                {instructions}
              </p>
            )}
          </div>
        )}

        <button type="button" className="pay-copyall" onClick={() => copy('all', copyAllText)}>
          <i className={`bx ${copied === 'all' ? 'bx-check' : 'bx-copy'}`} />
          {copied === 'all' ? 'Copied every detail' : 'Copy all details'}
        </button>

        {kind !== 'crypto' && (
          <label className="pay-field">
            <span>Your transfer reference (optional)</span>
            <input
              value={reference}
              onChange={(e) => onReference(e.target.value)}
              placeholder="The reference your bank gave you"
            />
          </label>
        )}
        <label className="pay-field">
          <span>Send my receipt to</span>
          <input
            type="email"
            value={payerEmail}
            disabled={processing}
            onChange={(e) => onPayerEmail(e.target.value)}
            placeholder="you@company.com"
          />
          {emailError && <small className="pay-error">{emailError}</small>}
        </label>

        <button
          type="button"
          className={`pay-btn pay-btn--primary pay-btn--block${
            stickyConfirm ? ' pay-confirm-sticky' : ''
          }`}
          disabled={processing}
          onClick={onConfirm}
        >
          {processing ? (
            <>
              <span className="iw-spin" aria-hidden="true" />
              Letting them know
            </>
          ) : (
            <>
              <i className="bx bx-check" /> I&rsquo;ve sent the{' '}
              {kind === 'crypto' ? 'payment' : 'transfer'}
            </>
          )}
        </button>
      </div>
    </div>
  );
};
