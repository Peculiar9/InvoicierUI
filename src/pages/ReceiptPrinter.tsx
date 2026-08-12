import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { playCut, playTear, startTransport, type RunningSound } from '@/lib/printerAudio';
import '@/styles/receipt-printer.css';

type Phase = 'ready' | 'printing' | 'done' | 'torn';

/**
 * Everything the printed receipt says. Nothing here is hardcoded in the
 * markup, so the day this runs on a settled invoice it takes real values:
 * `<ReceiptPrinter receipt={fromInvoice(invoice)} />`.
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

/** Stands in until a real invoice is handed over. */
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

/** How long the transport runs. */
const FEED_MS = 3400;

/** What the display says, and when. */
const SCRIPT: { at: number; text: string }[] = [
  { at: 0, text: 'RECEIVING' },
  { at: 0.08, text: 'INVOICE OK' },
  { at: 0.18, text: 'FEEDING' },
  { at: 0.34, text: 'PRINTING' },
  { at: 0.5, text: 'PRINTING.' },
  { at: 0.64, text: 'PRINTING..' },
  { at: 0.78, text: 'PRINTING...' },
  { at: 0.9, text: 'CUTTING' },
];

/**
 * The receipt printer.
 *
 * An experiment in the moment the record is made: an invoice settles, and the
 * proof is physically pushed into the world. The machine is drawn in CSS,
 * layered gradients standing in for a photograph; the receipt is vector-crisp.
 *
 * The feed runs on `steps()` and the sheet jerks with each one, because paper
 * does not glide out of a printer. It ratchets.
 */
export const ReceiptPrinter = ({ receipt = DEMO_RECEIPT }: { receipt?: ReceiptData }) => {
  const [phase, setPhase] = useState<Phase>('ready');
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(false);
  const clipRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const transport = useRef<RunningSound | null>(null);

  const reduced = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      transport.current?.stop();
    },
    []
  );

  const money = useMemo(
    () =>
      new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: receipt.currency,
        maximumFractionDigits: 0,
      }),
    [receipt.currency]
  );

  const display = useMemo(() => {
    if (phase === 'ready') return 'READY';
    if (phase === 'done') return 'COMPLETE';
    if (phase === 'torn') return 'READY';
    return ([...SCRIPT].reverse().find((s) => progress >= s.at) ?? SCRIPT[0]).text;
  }, [phase, progress]);

  const print = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPhase('printing');
    setProgress(0);

    // measured, not guessed, so the transport stops where the paper ends
    const height = paperRef.current?.offsetHeight ?? 460;
    const clip = clipRef.current;
    const total = reduced ? 400 : FEED_MS;
    if (clip) {
      clip.style.setProperty('--rp-feed-ms', `${total}ms`);
      clip.style.height = '0px';
      void clip.offsetHeight; // let the browser accept 0 before it grows
      clip.style.height = `${height}px`;
    }

    transport.current?.stop();
    if (!muted && !reduced) transport.current = startTransport();

    for (let i = 1; i <= 24; i++) {
      timers.current.push(window.setTimeout(() => setProgress(i / 24), (total / 24) * i));
    }
    timers.current.push(
      window.setTimeout(() => {
        transport.current?.stop();
        transport.current = null;
        if (!muted) playCut();
        setPhase('done');
      }, total + 100)
    );
  };

  const tear = () => {
    if (!muted) playTear();
    setPhase('torn');
    timers.current.push(
      window.setTimeout(
        () => {
          const clip = clipRef.current;
          if (clip) clip.style.height = '0px';
          setPhase('ready');
          setProgress(0);
        },
        reduced ? 100 : 1500
      )
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
          Every settled invoice grows a receipt on its own. Both parties get it,
          nobody clicks anything. This is that instant, slowed down enough to see.
        </p>
      </div>

      <div className="rp-stage">
        <div className={`rp-machine${phase === 'printing' ? ' is-printing' : ''}`}>
          <div className="rp-deck" aria-hidden="true" />
          <div className="rp-body">
            <span className="rp-badge">INVOICIER</span>
            <span className="rp-vent" aria-hidden="true">
              {Array.from({ length: 7 }, (_, i) => (
                <i key={i} />
              ))}
            </span>

            <div className="rp-console">
              <div className="rp-display" role="status" aria-live="polite">
                <span>{display}</span>
                <span className="rp-display-bar" aria-hidden="true">
                  <i style={{ width: `${Math.round(progress * 100)}%` }} />
                </span>
              </div>
              <div className="rp-keys" aria-hidden="true">
                {Array.from({ length: 12 }, (_, i) => (
                  <i key={i} />
                ))}
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
          <div className="rp-feet" aria-hidden="true" />
        </div>

        <div
          className={`rp-well${phase === 'printing' ? ' is-feeding' : ''}${
            phase === 'done' ? ' is-done' : ''
          }${phase === 'torn' ? ' is-torn' : ''}`}
        >
          <div className="rp-clip" ref={clipRef}>
            <span className="rp-slot-shade" aria-hidden="true" />
            <span className="rp-head-glow" aria-hidden="true" />
            <span className="rp-cutline" aria-hidden="true" />
            <div className="rp-sheet" ref={paperRef}>
              <div className="rp-receipt">

                <div className="rp-rc-head">
                  <b>
                    invoicier<i>.</i>
                  </b>
                  <span>
                    RECEIPT {receipt.receiptNo}
                    <br />
                    {receipt.paidOn}
                  </span>
                </div>

                <p className="rp-rc-title">PAYMENT RECEIVED</p>

                <div className="rp-rc-party">
                  <span>
                    <small>Paid to</small>
                    <b>{receipt.business}</b>
                  </span>
                  <span style={{ textAlign: 'right' }}>
                    <small>Paid by</small>
                    <b>{receipt.client}</b>
                  </span>
                </div>

                <div className="rp-rc-rows">
                  {receipt.lines.map((l) => (
                    <div className="rp-rc-row" key={l.label}>
                      <i>{l.label}</i>
                      <b>{money.format(l.amount)}</b>
                    </div>
                  ))}
                  <div className="rp-rc-row">
                    <i>{receipt.taxLabel}</i>
                    <b>{money.format(receipt.taxAmount)}</b>
                  </div>
                  <div className="rp-rc-row total">
                    <i>Paid in full</i>
                    <b>{money.format(receipt.total)}</b>
                  </div>
                </div>

                <div className="rp-rc-stamp">SETTLED</div>

                <p className="rp-rc-foot">
                  Paid via {receipt.method}, ref <code>{receipt.reference}</code>
                  <br />
                  Against invoice {receipt.invoiceNo}, issued {receipt.invoiceIssuedOn}
                  <br />
                  Keep this. It is your record.
                </p>

                <span className="rp-curl" aria-hidden="true" />
              </div>
              <div className="rp-zig" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>

      <div className="rp-controls">
        <button type="button" className="rp-btn" onClick={print} disabled={phase === 'printing'}>
          <i className="bx bx-printer" aria-hidden="true" />
          {phase === 'done' ? 'Print another' : 'Print the receipt'}
        </button>
        <button
          type="button"
          className="rp-btn rp-btn--ghost"
          onClick={tear}
          disabled={phase !== 'done'}
        >
          <i className="bx bx-cut" aria-hidden="true" /> Tear it off
        </button>
        <button
          type="button"
          className="rp-btn rp-btn--ghost rp-btn--icon"
          onClick={() => {
            if (!muted) transport.current?.stop();
            setMuted((m) => !m);
          }}
          aria-pressed={muted}
          aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
          title={muted ? 'Sound off' : 'Sound on'}
        >
          <i className={`bx ${muted ? 'bx-volume-mute' : 'bx-volume-full'}`} aria-hidden="true" />
        </button>
        <p className="rp-hint">
          {phase === 'ready' && 'The machine is warm. Give it something to say.'}
          {phase === 'printing' && 'Paper transport engaged. Watch the lamp.'}
          {phase === 'done' && 'Both parties already have this by email. Tear it off anyway.'}
          {phase === 'torn' && 'Filed.'}
        </p>
      </div>
    </main>
  );
};
