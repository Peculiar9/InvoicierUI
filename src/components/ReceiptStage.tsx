import { Suspense, lazy, useEffect, useState } from 'react';
import { ReceiptDocument } from '@/components/ReceiptDocument';
import type { Invoice } from '@/types';

const ReceiptPrintout = lazy(() => import('@/components/ReceiptPrintout'));

/**
 * "Download receipt", the full moment rather than a bare OS dialog.
 *
 * It takes the whole screen: a beat of "Loading your receipt", then the
 * machine feeds the paper out, and only once the receipt is sitting there
 * does the device's own print sheet open, with the crisp vector receipt as
 * what actually prints. The paper is the thing on screen, at any size, so a
 * phone gets the receipt itself rather than a card with a button on it.
 */
export const ReceiptStage = ({
  invoice,
  senderName,
  onClose,
}: {
  invoice: Invoice;
  senderName: string;
  onClose: () => void;
}) => {
  const [stage, setStage] = useState<'loading' | 'printing' | 'ready'>('loading');

  useEffect(() => {
    const t = window.setTimeout(() => setStage('printing'), 900);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    // the page behind must not scroll while the stage owns the screen
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  /** the paper has settled: hand over to the device's own print sheet */
  const handOver = () => {
    setStage('ready');
    window.setTimeout(() => window.print(), 700);
  };

  return (
    <div className="rcs" role="dialog" aria-modal="true" aria-label="Your receipt">
      <header className="rcs-top">
        <span className="rcs-brand">
          invoicier<b>.</b>
        </span>
        <button type="button" className="rcs-close" onClick={onClose} aria-label="Close">
          <i className="bx bx-x" />
        </button>
      </header>

      <div className="rcs-body">
        {stage === 'loading' ? (
          <div className="rcs-loading" role="status">
            <span className="iw-spin" aria-hidden="true" />
            <b>Loading your receipt</b>
            <small>Receipt {invoice.receipt_number ?? invoice.invoice_number}</small>
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="rcs-loading" role="status">
                <span className="iw-spin" aria-hidden="true" />
                <b>Warming up the printer</b>
              </div>
            }
          >
            <ReceiptPrintout
              invoice={invoice}
              senderName={senderName}
              onPrinted={handOver}
            />
          </Suspense>
        )}
      </div>

      <footer className="rcs-foot">
        <p className="rcs-note">
          {stage === 'ready' ? (
            <>
              <i className="bx bx-printer" aria-hidden="true" />
              Opening your device&rsquo;s print sheet. Choose &ldquo;Save as PDF&rdquo; to keep it.
            </>
          ) : (
            <>
              <i className="bx bx-check-shield" aria-hidden="true" />
              Receipt {invoice.receipt_number ?? invoice.invoice_number} &middot; keep this for
              your records
            </>
          )}
        </p>
        <div className="rcs-actions">
          <button
            type="button"
            className="pay-btn pay-btn--primary"
            onClick={() => window.print()}
            disabled={stage === 'loading'}
          >
            <i className="bx bx-download" /> Save as PDF
          </button>
          <button type="button" className="rcs-done" onClick={onClose}>
            Done
          </button>
        </div>
      </footer>

      {/* what the print sheet actually captures: the crisp vector receipt */}
      <div className="rcs-print">
        <ReceiptDocument invoice={invoice} />
      </div>
    </div>
  );
};

export default ReceiptStage;
