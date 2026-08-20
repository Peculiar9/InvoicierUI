import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { MarketingFooter, MarketingNav } from '@/pages/Landing';
import { usePageMeta } from '@/hooks/usePageMeta';
import '@/styles/landing-v2.css';

interface ComingSoonProps {
  eyebrow?: string;
  title?: string;
  blurb?: string;
  /** what will live here, listed as a promise rather than a menu */
  bullets?: string[];
}

/**
 * The holding page for surfaces we have designed but not shipped. It keeps
 * the brand world rather than apologising in plain text, and it always gives
 * the visitor somewhere useful to go next.
 */
export const ComingSoon = ({
  eyebrow = 'Docs',
  title = 'The manual is still being written.',
  blurb = "We are heads down building the thing itself. When the docs land they will cover the API, the webhooks and every field the tax engine cares about.",
  bullets = [
    'REST endpoints for invoices, clients and payments',
    'Webhooks for paid, overdue and receipted',
    'The tax-grade field reference, in plain English',
    'Recipes: embed invoicing in your own product',
  ],
}: ComingSoonProps) => {
  // each holding page (Docs, Blog, Company, Legal) titles itself from its props
  usePageMeta(eyebrow, { description: blurb, canonicalPath: window.location.pathname });
  const rootRef = useRef<HTMLElement>(null);
  const [nudged, setNudged] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setNudged(true), 120);
    return () => clearTimeout(t);
  }, []);

  return (
    <main className="lp" ref={rootRef}>
      <MarketingNav />

      <section className="lp-hero lp-soon">
        <div className="lp-hero-bg" aria-hidden="true">
          <span className="grid" />
          <span className="blob blob--brand" />
          <span className="blob blob--coral" />
        </div>

        <div className={`lp-shell lp-soon-inner${nudged ? ' is-in' : ''}`}>
          <span className="lp-kicker lp-kicker--warm">{eyebrow}</span>
          <h1>{title}</h1>
          <p className="lp-hero-sub">{blurb}</p>

          <ul className="lp-soon-list">
            {bullets.map((line) => (
              <li key={line}>
                <i className="bx bx-check" />
                {line}
              </li>
            ))}
          </ul>

          <div className="lp-soon-actions">
            <a href="/#waitlist" className="lp-btn lp-btn--lg">
              Get told when it lands <i className="bx bx-right-arrow-alt" />
            </a>
            <Link to="/how-it-works" className="lp-btn lp-btn--ghost lp-btn--lg">
              See how it works <i className="bx bx-right-arrow-alt" />
            </Link>
          </div>

          {/* the brand's own progress language, borrowed from the loader */}
          <div className="lp-soon-progress" aria-hidden="true">
            <span className="lp-soon-bar">
              <span className="fill" />
            </span>
            <span className="lp-soon-note">Writing in progress</span>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
};
