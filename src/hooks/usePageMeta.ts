import { useEffect } from 'react';

/** What index.html ships with; every page restores to this on unmount. */
const DEFAULT_TITLE = 'Invoicier — Your invoices, your tax return';
const DEFAULT_DESCRIPTION =
  'Invoicing built for Nigerian freelancers and small businesses. Send an invoice from your phone, get paid by card or transfer in naira, dollars, euros or pounds — and every payment lands with VAT and WHT worked out, so March finds your books ready.';
const ORIGIN = 'https://invoicier.app';
const DEFAULT_OG_IMAGE = `${ORIGIN}/og.png`;

interface PageMetaOptions {
  /** shown to search/AI crawlers; only public pages should set one */
  description?: string;
  /** point the canonical at this route instead of the homepage */
  canonicalPath?: string;
  /** social-card image; absolute URL or a path under the origin */
  ogImage?: string;
  /** 'website' (default) or 'article' for blog posts and guides */
  ogType?: 'website' | 'article';
  /** keep this page out of the index (thin, private or duplicate pages) */
  noindex?: boolean;
}

/** Set (or create) a meta/link tag's attribute, remembering nothing — the
 *  cleanup below restores the document to its shipped defaults instead. */
const setMeta = (selector: string, attr: string, value: string) => {
  const el = document.querySelector(selector);
  if (el) el.setAttribute(attr, value);
};

/**
 * Per-route head management for an SPA: title, description, canonical, and the
 * Open Graph / Twitter tags that decide how a shared link looks. Titles read
 * "Thing · Invoicier"; pass nothing to hold the homepage default. Every value
 * is restored on unmount so a stale tag never follows the user to the next page.
 */
export function usePageMeta(title?: string, opts?: PageMetaOptions) {
  const { description, canonicalPath, ogImage, ogType, noindex } = opts ?? {};

  useEffect(() => {
    const fullTitle = title ? `${title} · Invoicier` : DEFAULT_TITLE;
    const desc = description ?? DEFAULT_DESCRIPTION;
    const url = canonicalPath ? `${ORIGIN}${canonicalPath}` : `${ORIGIN}/`;
    const image = ogImage
      ? ogImage.startsWith('http')
        ? ogImage
        : `${ORIGIN}${ogImage}`
      : DEFAULT_OG_IMAGE;

    document.title = fullTitle;
    setMeta('meta[name="description"]', 'content', desc);
    setMeta('link[rel="canonical"]', 'href', url);

    setMeta('meta[property="og:title"]', 'content', fullTitle);
    setMeta('meta[property="og:description"]', 'content', desc);
    setMeta('meta[property="og:url"]', 'content', url);
    setMeta('meta[property="og:image"]', 'content', image);
    setMeta('meta[property="og:type"]', 'content', ogType ?? 'website');
    setMeta('meta[name="twitter:title"]', 'content', fullTitle);
    setMeta('meta[name="twitter:description"]', 'content', desc);
    setMeta('meta[name="twitter:image"]', 'content', image);

    // robots: a noindex tag is added only when asked, and removed on cleanup
    let robots = document.querySelector('meta[name="robots"]');
    if (noindex) {
      if (!robots) {
        robots = document.createElement('meta');
        robots.setAttribute('name', 'robots');
        document.head.appendChild(robots);
      }
      robots.setAttribute('content', 'noindex, nofollow');
    }

    return () => {
      document.title = DEFAULT_TITLE;
      setMeta('meta[name="description"]', 'content', DEFAULT_DESCRIPTION);
      setMeta('link[rel="canonical"]', 'href', `${ORIGIN}/`);
      setMeta('meta[property="og:title"]', 'content', DEFAULT_TITLE);
      setMeta('meta[property="og:description"]', 'content', DEFAULT_DESCRIPTION);
      setMeta('meta[property="og:url"]', 'content', `${ORIGIN}/`);
      setMeta('meta[property="og:image"]', 'content', DEFAULT_OG_IMAGE);
      setMeta('meta[property="og:type"]', 'content', 'website');
      setMeta('meta[name="twitter:title"]', 'content', DEFAULT_TITLE);
      setMeta('meta[name="twitter:description"]', 'content', DEFAULT_DESCRIPTION);
      setMeta('meta[name="twitter:image"]', 'content', DEFAULT_OG_IMAGE);
      if (noindex) document.querySelector('meta[name="robots"]')?.remove();
    };
  }, [title, description, canonicalPath, ogImage, ogType, noindex]);
}
