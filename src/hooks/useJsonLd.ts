import { useEffect } from 'react';

/**
 * Inject one or more JSON-LD structured-data blocks for the current page and
 * remove them on unmount. This is how a page tells Google it is an Article, a
 * FAQ, a HowTo or a breadcrumb trail — the rich-result eligibility that plain
 * prose cannot express. Pass null to inject nothing.
 *
 * The dependency is the serialised payload, so a page whose schema is built
 * from props re-runs only when the schema actually changes.
 */
export function useJsonLd(data: object | object[] | null | undefined) {
  const serialised = data ? JSON.stringify(data) : '';

  useEffect(() => {
    if (!serialised) return;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-page-ld', 'true');
    script.textContent = serialised;
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [serialised]);
}

const ORIGIN = 'https://invoicier.app';

/** A FAQPage block from a list of Q&As — the pairs that win the "People also
 *  ask" boxes and the AI answer snippets. */
export const faqSchema = (items: { q: string; a: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: items.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
});

/** An Article block for a guide or blog post. */
export const articleSchema = (opts: {
  headline: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified?: string;
  image?: string;
}) => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: opts.headline,
  description: opts.description,
  image: opts.image ?? `${ORIGIN}/og.png`,
  datePublished: opts.datePublished,
  dateModified: opts.dateModified ?? opts.datePublished,
  mainEntityOfPage: { '@type': 'WebPage', '@id': `${ORIGIN}${opts.path}` },
  author: { '@type': 'Organization', name: 'Invoicier', url: ORIGIN },
  publisher: {
    '@type': 'Organization',
    name: 'Invoicier',
    logo: { '@type': 'ImageObject', url: `${ORIGIN}/favicon.png` },
  },
});

/** A breadcrumb trail: Home › Resources › This page. */
export const breadcrumbSchema = (trail: { name: string; path: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: trail.map((item, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: item.name,
    item: `${ORIGIN}${item.path}`,
  })),
});
