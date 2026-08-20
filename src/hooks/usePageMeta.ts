import { useEffect } from 'react';

/** What index.html ships with; every page restores to this on unmount. */
const DEFAULT_TITLE = 'Invoicier — Your invoices, your tax return';
const DEFAULT_DESCRIPTION =
  'Invoicing built for Nigerian freelancers and small businesses. Send an invoice from your phone, get paid by card or transfer in naira, dollars, euros or pounds — and every payment lands with VAT and WHT worked out, so March finds your books ready.';
const ORIGIN = 'https://invoicier.app';

interface PageMetaOptions {
  /** shown to search/AI crawlers; only public pages should set one */
  description?: string;
  /** point the canonical at this route instead of the homepage */
  canonicalPath?: string;
}

/**
 * Per-route head management, the small way: title, description and canonical
 * on an SPA that otherwise wears the homepage's head everywhere. Titles read
 * "Thing · Invoicier"; pass nothing to hold the homepage default.
 */
export function usePageMeta(title?: string, opts?: PageMetaOptions) {
  const description = opts?.description;
  const canonicalPath = opts?.canonicalPath;

  useEffect(() => {
    document.title = title ? `${title} · Invoicier` : DEFAULT_TITLE;

    const meta = document.querySelector('meta[name="description"]');
    meta?.setAttribute('content', description ?? DEFAULT_DESCRIPTION);

    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonicalPath) canonical?.setAttribute('href', `${ORIGIN}${canonicalPath}`);

    return () => {
      document.title = DEFAULT_TITLE;
      meta?.setAttribute('content', DEFAULT_DESCRIPTION);
      canonical?.setAttribute('href', `${ORIGIN}/`);
    };
  }, [title, description, canonicalPath]);
}
