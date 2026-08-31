import { useRef } from 'react';
import { Link } from '@tanstack/react-router';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useReveal } from '@/hooks/useReveal';
import { useJsonLd, breadcrumbSchema } from '@/hooks/useJsonLd';
import { MarketingFooter, MarketingNav } from '@/pages/Landing';
import { useTiltRipple } from '@/hooks/useTiltRipple';
import { WAITLIST_MODE, primaryCtaHref } from '@/lib/waitlistMode';
import '@/styles/landing-v2.css';

export const Resources = () => {
  usePageMeta('Invoicing & tax resources for Nigerian businesses', {
    description:
      'Plain-English guides to invoicing and tax in Nigeria: FIRS e-invoicing, getting paid in naira or dollars, VAT, WHT and staying ready for filing season.',
    canonicalPath: '/resources',
  });
  const rootRef = useRef<HTMLElement>(null);
  useReveal(rootRef);
  useTiltRipple(rootRef);

  useJsonLd(
    breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Resources', path: '/resources' },
    ])
  );

  return (
    <main className="lp" ref={rootRef}>
      <MarketingNav />

      {/* ------------------------------------------------------------ HERO */}
      <section className="lp-hero lp-hiw-hero">
        <div className="lp-hero-bg" aria-hidden="true">
          <span className="grid" />
          <span className="blob blob--brand" />
          <span className="blob blob--coral" />
        </div>
        <div className="lp-shell lp-hiw-intro">
          <span className="lp-kicker" data-reveal>
            Resources
          </span>
          <h1 data-reveal data-delay="1">
            Invoicing and tax, in plain Nigerian English.
          </h1>
          <p className="lp-hero-sub" data-reveal data-delay="2">
            No jargon, no scare tactics, no consultant's day rate. Just clear
            guides on getting paid, handling VAT and withholding, and staying
            ready for FIRS. Start with the one that matches your next headache.
          </p>
        </div>
      </section>

      {/* --------------------------------------------------------- THE GUIDES */}
      <section className="lp-section lp-flow">
        <div className="lp-shell">
          <div className="lp-section-head" data-reveal>
            <span className="lp-kicker">Start here</span>
            <h2>Guides that answer the question you actually have.</h2>
            <p>
              Short reads, written by people who file in naira too. Pick a card
              and go.
            </p>
          </div>
          <div className="lp-res-grid" data-reveal>
            <Link to="/e-invoicing-nigeria" className="lp-res-card lp-card" data-tilt>
              <span className="lp-card-icon">
                <i className="bx bx-receipt" />
              </span>
              <h3>E-invoicing in Nigeria</h3>
              <p>
                What FIRS e-invoicing actually means, who it touches first, and
                how to get ready without losing a quarter to it.
              </p>
            </Link>
            <Link to="/invoicing-nigeria" className="lp-res-card lp-card" data-tilt>
              <span className="lp-card-icon">
                <i className="bx bx-file" />
              </span>
              <h3>Invoicing in Nigeria</h3>
              <p>
                How to invoice properly, get paid in naira or dollars, and keep
                every record tax-ready from the first keystroke.
              </p>
            </Link>
            <Link to="/how-it-works" className="lp-res-card lp-card" data-tilt>
              <span className="lp-card-icon">
                <i className="bx bx-been-here" />
              </span>
              <h3>How Invoicier works</h3>
              <p>
                The whole journey, stop by stop: draft, send, get paid, get
                receipted, and arrive at filing season already prepared.
              </p>
            </Link>
            <Link to="/docs" className="lp-res-card lp-card" data-tilt>
              <span className="lp-card-icon">
                <i className="bx bx-book-open" />
              </span>
              <h3>Docs and help</h3>
              <p>
                Set-up steps, how-tos, and the small answers you want at 11pm on
                a deadline. Everything, in one place.
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- COMING SOON */}
      <section className="lp-section lp-flow">
        <div className="lp-shell">
          <div className="lp-section-head" data-reveal>
            <span className="lp-kicker lp-kicker--warm">On the way</span>
            <h2>Tax guides we are writing next.</h2>
            <p>
              The questions that flood our inbox every March, turned into calm,
              step-by-step reads. Coming soon, and worth the wait.
            </p>
          </div>
          <div className="lp-res-grid" data-reveal>
            <article className="lp-card" data-tilt>
              <span className="lp-chip">Coming soon</span>
              <h3>How to file your taxes as a freelancer in Nigeria</h3>
              <p>
                The whole filing, demystified: what you owe, where it goes, and
                how to do it without a consultant holding your records hostage.
              </p>
            </article>
            <article className="lp-card" data-tilt>
              <span className="lp-chip">Coming soon</span>
              <h3>How to pay your tax in Nigeria</h3>
              <p>
                From assessment to payment reference, the actual steps to settle
                what you owe, and the deadlines that carry the ₦100k+ penalty.
              </p>
            </article>
            <article className="lp-card" data-tilt>
              <span className="lp-chip">Coming soon</span>
              <h3>VAT and WHT, explained</h3>
              <p>
                VAT at 7.5% and withholding tax, in plain terms: who charges
                what, who deducts what, and how each becomes a record you can
                point to.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- FINAL CTA */}
      <section className="lp-section">
        <div className="lp-shell lp-hiw-cta" data-reveal>
          <h2>Reading is good. Ready records are better.</h2>
          <p>Start issuing tax-grade invoices today. Free while in beta.</p>
          <a href={primaryCtaHref} className="lp-btn lp-btn--lg">
            {WAITLIST_MODE ? 'Join the waitlist' : 'Send your first invoice'}{' '}
            <i className="bx bx-right-arrow-alt" />
          </a>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
};
