import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { formatCurrency, formatDate } from '@/utils/format';
import { todayLocal } from '@/utils/day';
import type { Invoice } from '@/types';
import '@/styles/receipt-printer.css';

/**
 * The receipt printer, folded into the pay page.
 *
 * The surreal machine from the /receipt experiment, stripped of its marketing
 * chrome and controls: it exists here only to make the completion land. On
 * mount it feeds a single receipt for THIS invoice out of the mouth once, then
 * rests showing it. No sound, no buttons, and it collapses to a still receipt
 * under reduced motion. The chassis and paper CSS are reused wholesale from
 * receipt-printer.css; only a compact `.rp-embed` frame is new.
 */
type Phase = 'idle' | 'printing' | 'done';

interface RcLine {
  label: string;
  amount: number;
}
interface ReceiptShape {
  business: string;
  client: string;
  receiptNo: string;
  paidOn: string;
  invoiceNo: string;
  method: string;
  reference: string;
  currency: string;
  lines: RcLine[];
  taxLabel: string;
  taxAmount: number;
  total: number;
}

/** How long the transport runs. */
const FEED_MS = 3000;

/** What the little display says, and when. */
const SCRIPT: { at: number; text: string }[] = [
  { at: 0, text: 'RECEIVED' },
  { at: 0.1, text: 'PAYMENT OK' },
  { at: 0.2, text: 'FEEDING' },
  { at: 0.36, text: 'PRINTING' },
  { at: 0.52, text: 'PRINTING.' },
  { at: 0.66, text: 'PRINTING..' },
  { at: 0.8, text: 'PRINTING...' },
  { at: 0.92, text: 'CUTTING' },
];

export const ReceiptPrintout = ({
  invoice,
  senderName,
  onPrinted,
}: {
  invoice: Invoice;
  senderName: string;
  /** fires once the paper has fed out and settled */
  onPrinted?: () => void;
}) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  /** The roll, newest first. Here it only ever holds the one receipt. */
  const [strip, setStrip] = useState<ReceiptShape[]>([]);
  const clipRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const outLength = useRef(0);
  const feeding = useRef(false);
  // held in a ref so the feed effect never restarts when the caller re-renders
  const onPrintedRef = useRef(onPrinted);
  onPrintedRef.current = onPrinted;

  const reduced = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );

  const receipt = useMemo<ReceiptShape>(() => {
    const received = invoice.amount_received ?? invoice.total;
    return {
      business: senderName,
      client:
        invoice.client?.name ?? invoice.bill_to_name ?? 'the payer',
      receiptNo: invoice.receipt_number ?? invoice.invoice_number,
      paidOn: formatDate(invoice.date_received ?? todayLocal()),
      invoiceNo: invoice.invoice_number,
      method: invoice.payment_method ?? 'Bank transfer',
      reference: invoice.claim_reference ?? invoice.invoice_number,
      currency: invoice.currency,
      lines: (invoice.items ?? []).map((it) => ({
        label: it.description || 'Item',
        amount: it.total,
      })),
      taxLabel:
        invoice.tax_rate === 0.075
          ? 'VAT (7.5%)'
          : `Tax (${+((invoice.tax_rate ?? 0) * 100).toFixed(2)}%)`,
      taxAmount: invoice.tax ?? 0,
      total: received,
    };
  }, [invoice, senderName]);

  const money = (n: number) => formatCurrency(n, receipt.currency);

  const display = useMemo(() => {
    if (phase === 'idle') return 'READY';
    if (phase === 'done') return 'DONE';
    return ([...SCRIPT].reverse().find((s) => progress >= s.at) ?? SCRIPT[0]).text;
  }, [phase, progress]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    []
  );

  /** The blank stub sits at the mouth before anything prints. */
  useLayoutEffect(() => {
    const clip = clipRef.current;
    const sheet = paperRef.current;
    if (!clip || !sheet || strip.length > 0) return;
    outLength.current = sheet.offsetHeight;
    clip.style.height = `${outLength.current}px`;
  }, [strip.length]);

  /** The receipt has entered the DOM: run the transport from the old paper end
      to the new one, so the sheet ratchets out and settles. */
  useLayoutEffect(() => {
    if (!feeding.current) return;
    feeding.current = false;

    const clip = clipRef.current;
    const sheet = paperRef.current;
    if (!clip || !sheet) return;

    const from = outLength.current;
    const to = sheet.offsetHeight;
    const total = reduced ? 420 : FEED_MS;

    clip.style.setProperty('--rp-feed-ms', `${total}ms`);
    clip.style.height = `${from}px`;
    void clip.offsetHeight;
    clip.style.height = `${to}px`;
    outLength.current = to;

    for (let i = 1; i <= 24; i++) {
      timers.current.push(
        window.setTimeout(() => setProgress(i / 24), (total / 24) * i)
      );
    }
    timers.current.push(
      window.setTimeout(() => {
        setPhase('done');
        onPrintedRef.current?.();
      }, total + 90)
    );
  }, [strip.length, reduced]);

  /** Feed once, shortly after mount, so the moment is seen rather than missed.
      Self-cleaning (no persistent guard) so React 18's StrictMode double-mount
      re-arms the timer instead of clearing it and never firing again. */
  useEffect(() => {
    const t = window.setTimeout(
      () => {
        setPhase('printing');
        setProgress(0);
        feeding.current = true;
        setStrip([receipt]);
      },
      reduced ? 120 : 620
    );
    return () => window.clearTimeout(t);
  }, [receipt, reduced]);

  return (
    <div className="rp-embed" role="img" aria-label={`Receipt ${receipt.receiptNo} printed`}>
      <div className="rp-embed-head">
        <span className={`rp-embed-dot${phase === 'done' ? ' is-done' : ''}`} aria-hidden="true" />
        {phase === 'done' ? 'Receipt printed' : 'Printing your receipt'}
      </div>

      <div className="rp-stage rp-stage--embed">
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
          }`}
        >
          <div className="rp-clip" ref={clipRef}>
            <span className="rp-slot-shade" aria-hidden="true" />
            <span className="rp-head-glow" aria-hidden="true" />
            <div className="rp-sheet" ref={paperRef}>
              {strip.map((r) => (
                <div className="rp-receipt" key={r.receiptNo}>
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
                    Against invoice {r.invoiceNo}
                    <br />
                    Keep this. It is your record.
                  </p>
                </div>
              ))}

              <div className="rp-stub" aria-hidden="true" />
              <span className="rp-curl" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>

      <span className="rp-embed-floor" aria-hidden="true" />
    </div>
  );
};

export default ReceiptPrintout;
