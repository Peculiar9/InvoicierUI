import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import '@/styles/receipt-printer.css';

type Phase = 'ready' | 'printing' | 'done' | 'torn';

/** How long the transport takes, and how tall the sheet ends up. */
const FEED_MS = 3200;

/** What the little green display says, in the order it says it. */
const SCRIPT: { at: number; text: string; warn?: boolean }[] = [
  { at: 0, text: 'RECEIVING…' },
  { at: 0.1, text: 'IV2047 · OK' },
  { at: 0.22, text: 'FEEDING PAPER' },
  { at: 0.38, text: 'PRINTING▁' },
  { at: 0.52, text: 'PRINTING▄' },
  { at: 0.66, text: 'PRINTING█' },
  { at: 0.82, text: 'FIXING INK' },
  { at: 0.95, text: 'CUTTING' },
];

/**
 * The receipt printer.
 *
 * An experiment in the moment the record is made: an invoice settles and the
 * proof physically emerges. The machine is drawn in CSS (layered gradients
 * standing in for a photograph) and the receipt is vector-crisp — the two
 * textures meeting is the whole idea.
 *
 * The feed uses `steps()` rather than a smooth curve, because paper does not
 * glide out of a printer; it ratchets.
 */
export const ReceiptPrinter = () => {
  const [phase, setPhase] = useState<Phase>('ready');
  const [progress, setProgress] = useState(0);
  const wellRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  const reduced = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const line = useMemo(() => {
    if (phase === 'ready') return { text: 'READY', warn: false };
    if (phase === 'done') return { text: 'COMPLETE', warn: false };
    if (phase === 'torn') return { text: 'READY', warn: false };
    const step = [...SCRIPT].reverse().find((s) => progress >= s.at) ?? SCRIPT[0];
    return { text: step.text, warn: Boolean(step.warn) };
  }, [phase, progress]);

  const print = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPhase('printing');
    setProgress(0);

    // the sheet's real height, measured rather than guessed, so the well
    // stops exactly where the paper ends
    const height = paperRef.current?.offsetHeight ?? 460;
    const well = wellRef.current;
    if (well) {
      well.style.setProperty('--rp-feed-ms', `${reduced ? 400 : FEED_MS}ms`);
      well.style.height = '0px';
      // force the browser to accept 0 before animating to full
      void well.offsetHeight;
      well.style.height = `${height}px`;
    }

    const total = reduced ? 400 : FEED_MS;
    for (let i = 1; i <= 20; i++) {
      timers.current.push(
        window.setTimeout(() => setProgress(i / 20), (total / 20) * i)
      );
    }
    timers.current.push(window.setTimeout(() => setPhase('done'), total + 120));
  };

  const tear = () => {
    setPhase('torn');
    timers.current.push(
      window.setTimeout(() => {
        const well = wellRef.current;
        if (well) well.style.height = '0px';
        setPhase('ready');
        setProgress(0);
      }, reduced ? 100 : 900)
    );
  };

  return (
    <main className="rp">
      <span className="rp-beam" aria-hidden="true" />
      <span className="rp-motes" aria-hidden="true">
        {[
          { l: '38%', t: '22%', d: '0s' },
          { l: '46%', t: '40%', d: '1.4s' },
          { l: '57%', t: '28%', d: '2.9s' },
          { l: '62%', t: '48%', d: '4.1s' },
          { l: '43%', t: '58%', d: '5.6s' },
          { l: '53%', t: '15%', d: '7s' },
        ].map((m, i) => (
          <i key={i} style={{ left: m.l, top: m.t, animationDelay: m.d }} />
        ))}
      </span>

      <header className="rp-top">
        <Link to="/" className="rp-back">
          <i className="bx bx-left-arrow-alt" aria-hidden="true" /> Back
        </Link>
        <span className="rp-wordmark">
          invoicier<b>.</b>
        </span>
      </header>

      <div className="rp-lede">
        <span>The moment of record</span>
        <h1>An invoice was paid. Watch the proof come out.</h1>
        <p>
          Every settled invoice grows a receipt on its own — both parties, zero
          clicks. This is that instant, slowed down enough to see.
        </p>
      </div>

      <div className="rp-stage">
        <div className={`rp-machine${phase === 'printing' ? ' is-printing' : ''}`}>
          <div className="rp-body">
            <span className="rp-badge">INVOICIER</span>
            <span className="rp-vent" aria-hidden="true">
              {Array.from({ length: 7 }, (_, i) => <i key={i} />)}
            </span>
            <span className="rp-lid" aria-hidden="true" />

            <div className="rp-console">
              <div
                className={`rp-display${line.warn ? ' is-warn' : ''}`}
                role="status"
                aria-live="polite"
              >
                <span>{line.text}</span>
                <span className="rp-display-bar" aria-hidden="true">
                  <i style={{ width: `${Math.round(progress * 100)}%` }} />
                </span>
              </div>
              <div className="rp-keys" aria-hidden="true">
                {Array.from({ length: 12 }, (_, i) => <i key={i} />)}
              </div>
            </div>

            <span
              className={`rp-lamp${
                phase === 'printing' ? ' is-live' : phase === 'done' ? ' is-done' : ''
              }`}
              aria-hidden="true"
            />
            <span className="rp-slot" aria-hidden="true" />
          </div>
        </div>

        <div
          className={`rp-well${phase === 'printing' ? ' is-feeding' : ''}${
            phase === 'torn' ? ' is-torn' : ''
          }`}
          ref={wellRef}
        >
          <span className="rp-slot-shade" aria-hidden="true" />
          <div className="rp-receipt" ref={paperRef}>
            <div className="rp-rc-head">
              <b>
                invoicier<i>.</i>
              </b>
              <span>
                RECEIPT · RC-0009
                <br />
                3 MAR 2027
              </span>
            </div>

            <p className="rp-rc-title">PAYMENT RECEIVED</p>

            <div className="rp-rc-party">
              <span>
                <small>From</small>
                <b>Ada Studio</b>
              </span>
              <span style={{ textAlign: 'right' }}>
                <small>To</small>
                <b>Otto Holdings</b>
              </span>
            </div>

            <div className="rp-rc-rows">
              <div className="rp-rc-row">
                <i>Brand identity</i>
                <b>₦2,400,000</b>
              </div>
              <div className="rp-rc-row">
                <i>Motion design</i>
                <b>₦1,150,000</b>
              </div>
              <div className="rp-rc-row">
                <i>VAT 7.5%</i>
                <b>₦266,250</b>
              </div>
              <div className="rp-rc-row total">
                <i>Paid in full</i>
                <b>₦3,816,250</b>
              </div>
            </div>

            <div className="rp-rc-stamp">SETTLED</div>

            <p className="rp-rc-foot">
              Paid via Paystack · ref <code>IV2047-OTT-3M</code>
              <br />
              Against invoice IV2047, issued 21 Feb 2027
              <br />
              Keep this. It is your record.
            </p>

            <p className="rp-perf">— — — tear here — — —</p>
          </div>
        </div>
      </div>

      <div className="rp-controls">
        <button
          type="button"
          className="rp-btn"
          onClick={print}
          disabled={phase === 'printing'}
        >
          <i className="bx bx-printer" aria-hidden="true" />
          {phase === 'done' ? 'Print another' : 'Print the receipt'}
        </button>
        <button
          type="button"
          className="rp-btn rp-btn--ghost"
          onClick={tear}
          disabled={phase !== 'done'}
        >
          <i className="bx bx-cut" aria-hidden="true" /> Tear off
        </button>
        <p className="rp-hint">
          {phase === 'ready' && 'The machine is warm. Give it something to say.'}
          {phase === 'printing' && 'Paper transport engaged — watch the lamp.'}
          {phase === 'done' && 'Both parties have this by email already. Tear it off anyway.'}
          {phase === 'torn' && 'Filed.'}
        </p>
      </div>
    </main>
  );
};
