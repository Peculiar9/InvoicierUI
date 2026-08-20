import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { usePageMeta } from '@/hooks/usePageMeta';
import { Link } from '@tanstack/react-router';
import { playCut, playTear, startTransport, type RunningSound } from '@/lib/printerAudio';
import { DEMO_RECEIPT, type ReceiptData } from '@/lib/receiptData';
import { formatCurrency } from '@/utils/format';
import '@/styles/receipt-printer.css';

export { DEMO_RECEIPT };
export type { ReceiptData };

type Phase = 'ready' | 'printing' | 'done' | 'torn';

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

const plural = (n: number) => (n === 1 ? 'copy' : 'copies');

/**
 * One receipt's worth of paper.
 *
 * Shared by the roll on screen and the sheets that go to the printer, so what
 * comes out of the machine and what comes out of the printer are the same
 * document.
 */
const Slip = ({ r, money }: { r: ReceiptData; money: (n: number) => string }) => (
  <>
    <div className="rp-rc-head">
      <b>
        invoicier<i>.</i>
      </b>
      <span>
        RECEIPT {r.receiptNo}
        <br />
        {r.paidOn}
      </span>
    </div>

    <p className="rp-rc-title">PAYMENT RECEIVED</p>

    <div className="rp-rc-party">
      <span>
        <small>Paid to</small>
        <b>{r.business}</b>
      </span>
      <span style={{ textAlign: 'right' }}>
        <small>Paid by</small>
        <b>{r.client}</b>
      </span>
    </div>

    <div className="rp-rc-rows">
      {r.lines.map((l, i) => (
        <div className="rp-rc-row" key={`${l.label}-${i}`}>
          <i>{l.label}</i>
          <b>{money(l.amount)}</b>
        </div>
      ))}
      {r.taxAmount > 0 && (
        <div className="rp-rc-row">
          <i>{r.taxLabel}</i>
          <b>{money(r.taxAmount)}</b>
        </div>
      )}
      <div className="rp-rc-row total">
        <i>Paid in full</i>
        <b>{money(r.total)}</b>
      </div>
    </div>

    <div className="rp-rc-stamp">SETTLED</div>

    <p className="rp-rc-foot">
      Paid via {r.method}, ref <code>{r.reference}</code>
      <br />
      Against invoice {r.invoiceNo}, issued {r.invoiceIssuedOn}
      <br />
      Keep this. It is your record.
    </p>
  </>
);

/**
 * The dark stage with nothing on it yet.
 *
 * Arriving from "Download receipt" the invoice has to be fetched first; this
 * holds the room rather than flashing an empty machine at the payer.
 */
export const ReceiptPrinterStandby = ({
  title = 'Loading your receipt',
  note,
  failed = false,
}: {
  title?: string;
  note?: string;
  failed?: boolean;
}) => (
  <main className="rp rp--standby">
    <span className="rp-beam" aria-hidden="true" />
    <header className="rp-top">
      <Link to="/" className="rp-back">
        <i className="bx bx-left-arrow-alt" aria-hidden="true" /> Back
      </Link>
      <span className="rp-wordmark">
        invoicier<b>.</b>
      </span>
    </header>

    <div className="rp-standby" role="status" aria-live="polite">
      {failed ? (
        <i className="bx bx-error-circle rp-standby-icon" aria-hidden="true" />
      ) : (
        <span className="rp-standby-spin" aria-hidden="true" />
      )}
      <b>{title}</b>
      {note && <small>{note}</small>}
    </div>
  </main>
);

/**
 * The receipt printer.
 *
 * An experiment in the moment the record is made: an invoice settles, and the
 * proof is physically pushed into the world. The machine is drawn in CSS,
 * layered gradients standing in for a photograph; the receipt is vector-crisp.
 *
 * The feed runs on `steps()` and the sheet jerks with each one, because paper
 * does not glide out of a printer. It ratchets.
 *
 * It is also a real tool: every press of Print puts another copy on the roll,
 * and Download hands exactly what is on the roll to the device's printer, one
 * copy per page. The paper then leaves the machine and the roll starts clean.
 */
export const ReceiptPrinter = (props: Parameters<typeof ReceiptPrinterInner>[0]) => {
  usePageMeta('Receipt');
  return <ReceiptPrinterInner {...props} />;
};

const ReceiptPrinterInner = ({
  receipt = DEMO_RECEIPT,
  autoPrint = false,
  eyebrow = 'The moment of record',
  title = 'An invoice was paid. Watch the proof come out.',
  note = 'Every settled invoice grows a receipt on its own. Both parties get it, nobody clicks anything. This is that instant, slowed down enough to see.',
  onBack,
}: {
  receipt?: ReceiptData;
  /** run the first copy on arrival, for anyone who came here to get one */
  autoPrint?: boolean;
  eyebrow?: string;
  title?: string;
  note?: string;
  /** where "Back" goes, when it is not the marketing home */
  onBack?: () => void;
}) => {
  const [phase, setPhase] = useState<Phase>('ready');
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(false);
  /** What is on the roll, newest first: one entry per completed copy. */
  const [strip, setStrip] = useState<ReceiptData[]>([]);
  const clipRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const transport = useRef<RunningSound | null>(null);
  /** How much paper is already out, so a new receipt feeds on from there. */
  const outLength = useRef(0);
  const feeding = useRef(false);

  const copies = strip.length;

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
    () => (n: number) => formatCurrency(n, receipt.currency),
    [receipt.currency]
  );

  const display = useMemo(() => {
    if (phase === 'ready') return 'READY';
    if (phase === 'done') return 'COMPLETE';
    if (phase === 'torn') return 'CUT';
    return ([...SCRIPT].reverse().find((s) => progress >= s.at) ?? SCRIPT[0]).text;
  }, [phase, progress]);

  /** The blank stub is out before anything prints, and after every cut. */
  useLayoutEffect(() => {
    const clip = clipRef.current;
    const sheet = paperRef.current;
    if (!clip || !sheet || strip.length > 0) return;
    outLength.current = sheet.offsetHeight;
    clip.style.height = `${outLength.current}px`;
  }, [strip.length]);

  /**
   * A new segment has entered the DOM: run the transport from where the paper
   * already was to where it now ends. The roll never rewinds, so the strip
   * simply gets longer and walks off the bottom of the room.
   */
  useLayoutEffect(() => {
    if (!feeding.current) return;
    feeding.current = false;

    const clip = clipRef.current;
    const sheet = paperRef.current;
    if (!clip || !sheet) return;

    const from = outLength.current;
    const to = sheet.offsetHeight;
    const total = reduced ? 400 : FEED_MS;

    clip.style.setProperty('--rp-feed-ms', `${total}ms`);
    clip.style.height = `${from}px`;
    void clip.offsetHeight; // let the browser accept the start before it grows
    clip.style.height = `${to}px`;
    outLength.current = to;

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
  }, [strip.length, muted, reduced]);

  /** One press, one full animation, one more copy on the roll. */
  const print = () => {
    if (phase === 'printing') return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPhase('printing');
    setProgress(0);
    feeding.current = true;
    setStrip((roll) => [receipt, ...roll]);
  };

  // held in a ref so the auto-run below never re-arms on an unrelated render
  const printRef = useRef(print);
  printRef.current = print;

  /** Arriving with a receipt to collect, the first copy runs itself. Self
      cleaning, so StrictMode's double mount re-arms rather than cancels. */
  useEffect(() => {
    if (!autoPrint) return;
    const t = window.setTimeout(() => printRef.current(), reduced ? 120 : 560);
    return () => window.clearTimeout(t);
  }, [autoPrint, reduced]);

  /** The strip leaves the machine and the roll pushes a fresh stub out. */
  const tearOff = () => {
    setPhase('torn');
    timers.current.push(
      window.setTimeout(
        () => {
          outLength.current = 0;
          setStrip([]);
          setPhase('ready');
          setProgress(0);
        },
        reduced ? 100 : 1500
      )
    );
  };

  /**
   * Hand the roll to the device. Every copy on the strip is already rendered
   * into `.rp-print`, one per page, so what prints is exactly what the counter
   * says. The paper is gone afterwards, which is why the roll resets.
   */
  const download = () => {
    if (copies === 0 || phase === 'printing') return;
    if (!muted) playTear();
    window.print();
    timers.current.push(window.setTimeout(tearOff, 80));
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
        {onBack ? (
          <button type="button" className="rp-back" onClick={onBack}>
            <i className="bx bx-left-arrow-alt" aria-hidden="true" /> Back
          </button>
        ) : (
          <Link to="/" className="rp-back">
            <i className="bx bx-left-arrow-alt" aria-hidden="true" /> Back
          </Link>
        )}
        <span className="rp-wordmark">
          invoicier<b>.</b>
        </span>
      </header>

      <div className="rp-lede">
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{note}</p>
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
              {strip.map((r, i) => (
                <div className="rp-receipt" key={`${r.receiptNo}-${strip.length - i}`}>
                  <Slip r={r} money={money} />
                </div>
              ))}

              {/* blank stock at the leading edge, cut teeth and all */}
              <div className="rp-stub" aria-hidden="true" />
              <span className="rp-curl" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>

      <span className="rp-floor" aria-hidden="true" />

      <div className="rp-controls">
        <div className="rp-meter">
          <span
            className={`rp-count${copies > 0 ? ' is-live' : ''}`}
            role="status"
            aria-live="polite"
            data-testid="rp-count"
          >
            <i className="bx bx-receipt" aria-hidden="true" />
            {copies === 0 ? 'No copies yet' : `${copies} ${plural(copies)} ready`}
          </span>
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
        </div>

        <div className="rp-actions">
          <button type="button" className="rp-btn" onClick={print} disabled={phase === 'printing'}>
            <i className="bx bx-printer" aria-hidden="true" />
            {copies === 0 ? 'Print a copy' : 'Print another copy'}
          </button>
          <button
            type="button"
            className="rp-btn rp-btn--ghost"
            onClick={download}
            disabled={copies === 0 || phase === 'printing' || phase === 'torn'}
            title={copies === 0 ? 'Print a copy first' : undefined}
          >
            <i className="bx bx-download" aria-hidden="true" />
            {copies === 0 ? 'Download' : `Download ${copies} ${plural(copies)}`}
          </button>
        </div>

        <p className="rp-hint">
          {phase === 'ready' &&
            (copies === 0
              ? 'A fresh roll is loaded. Print as many copies as you need, then download the lot.'
              : 'Cut clean. The roll is ready for the next one.')}
          {phase === 'printing' && 'Paper transport engaged. Watch the lamp.'}
          {phase === 'done' &&
            `${copies} ${plural(copies)} on the roll. Print another, or download all ${copies} — one per page.`}
          {phase === 'torn' && 'Off the roll and on its way to your printer.'}
        </p>
      </div>

      {/* What the printer actually gets: one page per copy, nothing else. */}
      <div className="rp-print" aria-hidden="true">
        {strip.map((r, i) => (
          <div className="rp-print-copy" key={`print-${r.receiptNo}-${strip.length - i}`}>
            <div className="rp-receipt">
              <Slip r={r} money={money} />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
};
