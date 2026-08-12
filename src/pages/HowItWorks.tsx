import { useEffect, useRef } from 'react';
import { MarketingFooter, MarketingNav } from '@/pages/Landing';
import { KineticBand } from '@/components/static/MarketingFx';
import { useTiltRipple } from '@/hooks/useTiltRipple';
import '@/styles/landing-v2.css';
import { WAITLIST_MODE, primaryCtaHref } from '@/lib/waitlistMode';

/** Same reveal behavior as the landing page, armed immediately (no loader). */
const useReveal = (rootRef: React.RefObject<HTMLElement>) => {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !('IntersectionObserver' in window)
    ) {
      els.forEach((el) => el.classList.add('in-view'));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [rootRef]);
};

export const HowItWorks = () => {
  const rootRef = useRef<HTMLElement>(null);
  useReveal(rootRef);
  useTiltRipple(rootRef);

  return (
    <main className="lp" ref={rootRef}>
      <MarketingNav />

      {/* ------------------------------------------------------------ INTRO */}
      <section className="lp-hero lp-hiw-hero">
        <div className="lp-hero-bg" aria-hidden="true">
          <span className="grid" />
          <span className="blob blob--brand" />
          <span className="blob blob--coral" />
        </div>
        <div className="lp-shell lp-hiw-intro">
          <span className="lp-kicker" data-reveal>
            How it works
          </span>
          <h1 data-reveal data-delay="1">
            Everything between the invoice and the filing, handled.
          </h1>
          <p className="lp-hero-sub" data-reveal data-delay="2">
            One tool that sends the invoice, collects the money, writes the
            record and gets you ready for filing season. Here is the whole
            journey, stop by stop.
          </p>
        </div>
      </section>

      {/* -------------------------------------------------------- LIFECYCLE */}
      <section className="lp-section lp-flow">
        <div className="lp-shell">
          <div className="lp-section-head" data-reveal>
            <span className="lp-kicker">The lifecycle</span>
            <h2>From draft to receipted, on rails.</h2>
            <p>
              Draft, send, get paid, get receipted. Overdue chases itself, and
              every state change is logged, because March will ask.
            </p>
          </div>
          <div className="lp-flow-rail" data-reveal>
            <div className="lp-flow-step">
              <span className="lp-flow-dot">
                <i className="bx bx-edit-alt" />
              </span>
              <span className="lp-flow-num">01</span>
              <h3>Draft</h3>
              <p>
                Thirty seconds, tops. Pick a client, add your items, and the
                currency, VAT and withholding flags are captured as you type.
                The record is tax-grade from the first keystroke.
              </p>
            </div>
            <div className="lp-flow-step">
              <span className="lp-flow-dot">
                <i className="bx bx-send" />
              </span>
              <span className="lp-flow-num">02</span>
              <h3>Send</h3>
              <p>
                One link, every channel: email, or straight into WhatsApp from
                your share sheet. Every send is logged with its timestamp, so
                the paper trail builds itself.
              </p>
            </div>
            <div className="lp-flow-step">
              <span className="lp-flow-dot">
                <i className="bx bx-check-circle" />
              </span>
              <span className="lp-flow-num">03</span>
              <h3>Paid &amp; receipted</h3>
              <p>
                Paystack confirms naira instantly. Foreign payments take three
                quick answers. Receipt PDFs go to both parties and the ledger
                writes itself on the date the money actually landed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* the whole journey, shouted quietly */}
      <KineticBand words={['DRAFT', 'SEND', 'PAID', 'RECEIPTED', 'FILED']} />

      {/* ------------------------------------------------------ SEND (image) */}
      <section className="lp-section">
        <div className="lp-shell lp-split">
          <div className="lp-split-media" data-reveal="left">
            <div className="lp-hero-art">
              <img
                src="/images/hero-courier.png"
                alt="A courier pigeon delivering an invoice that arrives stamped and thanked"
              />
            </div>
          </div>
          <div className="lp-split-copy" data-reveal="right">
            <span className="lp-kicker lp-kicker--warm">Sending</span>
            <h2>Your invoice travels well.</h2>
            <p>
              Every invoice becomes a beautiful page with its own link. Your
              client opens it on any device, no account, no friction, and pays
              right there. Prefer paper trails? The same invoice is a
              print-perfect PDF, and the receipt that follows carries your brand
              too. Two brand touchpoints per transaction, zero extra work.
            </p>
            <ul className="lp-split-list">
              <li>
                <i className="bx bx-check" />
                Payment link your client can open anywhere
              </li>
              <li>
                <i className="bx bx-check" />
                Email delivery plus WhatsApp share, logged per send
              </li>
              <li>
                <i className="bx bx-check" />
                PDF invoice and automatic receipt, both branded
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- PAYMENTS */}
      <section className="lp-section lp-flow">
        <div className="lp-shell">
          <div className="lp-section-head" data-reveal>
            <span className="lp-kicker">Getting paid</span>
            <h2>Naira or dollars, the ledger stays straight.</h2>
          </div>
          <div className="lp-hiw-pair">
            <article className="lp-card" data-tilt data-reveal data-delay="1">
              <span className="lp-card-icon">
                <i className="bx bx-bolt-circle" />
              </span>
              <h3>NGN, via Paystack</h3>
              <p>
                Your client taps the link and pays by card or transfer. The
                confirmation writes itself into your ledger: amount, date,
                reference. You find out from the good kind of notification.
              </p>
            </article>
            <article className="lp-card" data-tilt data-reveal data-delay="2">
              <span className="lp-card-icon">
                <i className="bx bx-globe" />
              </span>
              <h3>USD, EUR and GBP</h3>
              <p>
                Your foreign account details ride along with the invoice. When
                the money lands, three quick answers make it tax-grade: the date
                it arrived, the amount after fees, and any tax your client
                withheld. That date drives the official conversion rate, so
                filing season already has what it needs.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- TAX ENGINE */}
      <section className="lp-section">
        <div className="lp-shell lp-split lp-split--flip">
          <div className="lp-split-copy" data-reveal="left">
            <span className="lp-kicker">The quiet superpower</span>
            <h2>Your invoices become your tax return.</h2>
            <p>
              Most tools stop at paid. Invoicier keeps going: every payment
              lands in a ledger built on cash basis, the way individuals are
              actually taxed. VAT is tracked per invoice. Withholding tax
              becomes a credit record you can point to. When you are ready to
              file, the numbers are not a weekend project, they are already
              there.
            </p>
            <ul className="lp-split-list">
              <li>
                <i className="bx bx-check" />
                Ledger rows written on the date money arrived
              </li>
              <li>
                <i className="bx bx-check" />
                VAT at 7.5% handled per invoice
              </li>
              <li>
                <i className="bx bx-check" />
                WHT credits recorded the moment they happen
              </li>
              <li>
                <i className="bx bx-check" />
                Export everything, anytime, it is your data
              </li>
            </ul>
          </div>
          <div className="lp-split-media" data-reveal="right">
            <div className="lp-hiw-ledger" data-tilt aria-hidden="true">
              <div className="lp-hiw-ledger-row lp-hiw-ledger-row--head">
                <span>Received</span>
                <span>Client</span>
                <span>Amount</span>
              </div>
              <div className="lp-hiw-ledger-row">
                <span>Mar 3</span>
                <span>Otto Holdings</span>
                <b>₦3,816,250</b>
              </div>
              <div className="lp-hiw-ledger-row">
                <span>Mar 9</span>
                <span>Bird Studios</span>
                <b>$2,150.00</b>
              </div>
              <div className="lp-hiw-ledger-row">
                <span>Mar 14</span>
                <span>Thornton &amp; Co</span>
                <b>₦980,000</b>
              </div>
              <div className="lp-hiw-ledger-foot">
                <i className="bx bx-badge-check" />
                Tax-grade, ready for filing
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- ROADMAP */}
      <section className="lp-section lp-flow">
        <div className="lp-shell">
          <div className="lp-section-head" data-reveal>
            <span className="lp-kicker lp-kicker--warm">Where this boat is sailing</span>
            <h2>We ship weekly. Here is what docks next.</h2>
          </div>
          <div className="lp-hiw-roadmap">
            <article className="lp-card" data-tilt data-reveal data-delay="1">
              <span className="lp-chip">Now</span>
              <h3>Free invoicing</h3>
              <p>
                Unlimited invoices, clients, receipts and the tax-grade ledger.
                Free while in beta, and invoicing stays free after it.
              </p>
            </article>
            <article className="lp-card" data-tilt data-reveal data-delay="2">
              <span className="lp-chip">Next</span>
              <h3>The tax estimator</h3>
              <p>
                Answer a few questions, or let your ledger answer them, and see
                your estimated liability as an honest range, beside the ₦100k+
                penalty for not filing. Knowledge first, panic never.
              </p>
            </article>
            <article className="lp-card lp-card--voyage" data-tilt data-reveal data-delay="3">
              <span className="lp-chip">Before March</span>
              <h3>The filing pack</h3>
              <p>
                Official conversion rates per payment date, VAT and WHT
                reconciled, everything prepared for a clean filing. Waitlist
                members get the early-bird price.
              </p>
              <img src="/images/waitlist-voyage.png" alt="" />
            </article>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- FINAL CTA */}
      <section className="lp-section">
        <div className="lp-shell lp-hiw-cta" data-reveal>
          <h2>The best time to fix your records was January.</h2>
          <p>The second best time takes thirty seconds.</p>
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
