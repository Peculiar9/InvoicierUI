import { useRef } from 'react';
import { Link } from '@tanstack/react-router';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useReveal } from '@/hooks/useReveal';
import { useJsonLd, faqSchema, articleSchema, breadcrumbSchema } from '@/hooks/useJsonLd';
import { MarketingFooter, MarketingNav } from '@/pages/Landing';
import { KineticBand } from '@/components/static/MarketingFx';
import { useTiltRipple } from '@/hooks/useTiltRipple';
import { WAITLIST_MODE, primaryCtaHref } from '@/lib/waitlistMode';
import '@/styles/landing-v2.css';

const FAQ = [
  {
    q: 'What is e-invoicing in Nigeria?',
    a: 'E-invoicing means issuing invoices in a structured digital format that the tax authority can read and validate, rather than a paper or PDF document. In Nigeria the Federal Inland Revenue Service (FIRS) is rolling out a national e-invoicing system so that qualifying invoices are reported to, and cleared by, FIRS around the time they are issued.',
  },
  {
    q: 'Is e-invoicing mandatory in Nigeria?',
    a: 'FIRS is introducing e-invoicing in phases, starting with large taxpayers and widening over time. Whether it applies to you today depends on your turnover band and the phase FIRS has reached, so confirm your obligation and go-live date directly with FIRS. The direction of travel is clear: structured, reported invoices are becoming the norm for VAT-registered businesses.',
  },
  {
    q: 'Who does FIRS e-invoicing affect?',
    a: 'It targets large and VAT-registered businesses first, then progressively smaller companies and, in time, everyday freelancers and SMBs who issue invoices. Even before it reaches you, keeping clean, structured invoice records now means you are ready the day it does.',
  },
  {
    q: 'How do I prepare for e-invoicing as a small business or freelancer?',
    a: 'Stop issuing invoices as loose Word or PDF files. Use invoicing software that stores every invoice as structured data with the fields FIRS cares about (VAT, buyer and seller details, dates and amounts), so that when reporting is required, exporting or transmitting is a step, not a scramble. Invoicier records every invoice this way from the first keystroke.',
  },
  {
    q: 'What is the difference between an e-invoice and a PDF invoice?',
    a: 'A PDF is a picture of an invoice, and a machine cannot reliably read its numbers. An e-invoice is the data itself in a standard format, which is what lets a tax authority validate it automatically. Invoicier gives your client a clean branded page and PDF to look at, while keeping the underlying structured record that e-invoicing needs.',
  },
];

export const EInvoicingNigeria = () => {
  usePageMeta('E-Invoicing in Nigeria: the 2026 guide for SMBs and freelancers', {
    description:
      'What FIRS e-invoicing means for Nigerian businesses, who it affects, and how to get ready without the panic. A plain-English guide to electronic invoicing in Nigeria.',
    canonicalPath: '/e-invoicing-nigeria',
    ogType: 'article',
  });
  const rootRef = useRef<HTMLElement>(null);
  useReveal(rootRef);
  useTiltRipple(rootRef);

  useJsonLd([
    articleSchema({
      headline: 'E-Invoicing in Nigeria: a plain-English guide for SMBs and freelancers',
      description:
        'What FIRS e-invoicing means, who it affects, and how to prepare your invoicing so you are ready the day it reaches you.',
      path: '/e-invoicing-nigeria',
      datePublished: '2026-08-31',
    }),
    faqSchema(FAQ),
    breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Resources', path: '/resources' },
      { name: 'E-Invoicing in Nigeria', path: '/e-invoicing-nigeria' },
    ]),
  ]);

  return (
    <main className="lp lp-article" ref={rootRef}>
      <MarketingNav />

      <section className="lp-hero lp-hiw-hero">
        <div className="lp-hero-bg" aria-hidden="true">
          <span className="grid" />
          <span className="blob blob--brand" />
          <span className="blob blob--coral" />
        </div>
        <div className="lp-shell lp-hiw-intro">
          <nav className="lp-crumbs" data-reveal aria-label="Breadcrumb">
            <Link to="/">Home</Link> <span aria-hidden="true">›</span>{' '}
            <Link to="/resources">Resources</Link> <span aria-hidden="true">›</span>{' '}
            <span>E-Invoicing in Nigeria</span>
          </nav>
          <span className="lp-kicker" data-reveal>
            The e-invoicing guide
          </span>
          <h1 data-reveal data-delay="1">
            E-invoicing in Nigeria, explained without the jargon.
          </h1>
          <p className="lp-hero-sub" data-reveal data-delay="2">
            FIRS is moving the country to electronic invoicing. Here is what that
            actually means, who it touches first, and how to make sure the switch
            costs you an afternoon, not a quarter.
          </p>
        </div>
      </section>

      <section className="lp-section lp-prose">
        <div className="lp-shell lp-prose-shell">
          <div data-reveal>
            <h2>What is e-invoicing?</h2>
            <p>
              An e-invoice is not a PDF you email. It is the invoice as{' '}
              <strong>structured data</strong>: the amounts, the VAT, the buyer
              and seller, the dates, all in a standard format a computer can read.
              That is the whole point. When the invoice is data rather than a
              picture, a tax authority can receive and validate it automatically,
              often at the moment it is issued.
            </p>
            <p>
              Tax offices around the world moved this way to close the VAT gap,
              and Nigeria is now on that road. The Federal Inland Revenue Service
              (FIRS) is rolling out a national e-invoicing system so that
              qualifying invoices are reported to, and cleared by, FIRS in near
              real time.
            </p>
          </div>

          <div data-reveal>
            <h2>Is it mandatory yet?</h2>
            <p>
              E-invoicing in Nigeria is arriving in <strong>phases</strong>,
              starting with the largest taxpayers and widening from there. Whether
              it applies to you <em>today</em> depends on your turnover band and
              the phase FIRS has reached, so treat this guide as your map, not
              your legal notice, and confirm your own go-live date with FIRS.
            </p>
            <p>
              But the direction is not in doubt. If you are VAT-registered, or
              plan to grow into it, structured and reported invoices are becoming
              the default. The businesses that stay calm about it are simply the
              ones already keeping clean records.
            </p>
          </div>

          <div className="lp-callout" data-reveal>
            <i className="bx bx-bulb" aria-hidden="true" />
            <p>
              <strong>The one-line takeaway:</strong> you do not need to predict
              the FIRS timetable. You need your invoices stored as clean data now,
              so that on the day reporting is required, it is a button, not a
              rebuild.
            </p>
          </div>

          <div data-reveal>
            <h2>Who does FIRS e-invoicing affect?</h2>
            <ul className="lp-check">
              <li>
                <i className="bx bx-check" /> <strong>Large taxpayers</strong>,
                first in line and largely already engaged.
              </li>
              <li>
                <i className="bx bx-check" /> <strong>VAT-registered SMBs</strong>,
                the widening middle of the rollout.
              </li>
              <li>
                <i className="bx bx-check" />{' '}
                <strong>Freelancers and small businesses</strong>, not the first
                phase, but the same habits protect you: issue every invoice as a
                proper record, not a one-off file.
              </li>
            </ul>
          </div>

          <div data-reveal>
            <h2>How to get ready in four moves</h2>
            <ol className="lp-steps-num">
              <li>
                <b>Stop invoicing from Word and loose PDFs.</b> A document you
                retype each time has no structure and no history. Move to software
                that stores each invoice as data.
              </li>
              <li>
                <b>Capture the tax fields as you go.</b> VAT at 7.5%, withholding
                where it applies, the currency, the client's details, all captured
                at creation, not reconstructed at filing.
              </li>
              <li>
                <b>Keep the money trail attached.</b> When each payment records
                the date it actually landed and the amount after fees, your
                invoice data and your ledger already agree.
              </li>
              <li>
                <b>Keep it exportable.</b> Your records are yours. Whatever format
                FIRS asks for, you want to be one export away, never starting
                over.
              </li>
            </ol>
          </div>
        </div>
      </section>

      <KineticBand words={['STRUCTURED', 'REPORTED', 'VALIDATED', 'READY']} />

      <section className="lp-section">
        <div className="lp-shell lp-split lp-split--flip">
          <div className="lp-split-copy" data-reveal="left">
            <span className="lp-kicker">Where Invoicier fits</span>
            <h2>Every invoice is a clean record from the first keystroke.</h2>
            <p>
              Invoicier was built for exactly this shift. Your client still gets a
              beautiful branded page and a print-perfect PDF, but underneath,
              every invoice is stored as structured data with its VAT, its
              withholding, its currency and its dates. When e-invoicing reaches
              you, you are not migrating. You are already there.
            </p>
            <ul className="lp-split-list">
              <li>
                <i className="bx bx-check" /> Structured invoice records, not
                loose files
              </li>
              <li>
                <i className="bx bx-check" /> VAT and WHT captured per invoice
              </li>
              <li>
                <i className="bx bx-check" /> Payments logged on the date money
                arrived
              </li>
              <li>
                <i className="bx bx-check" /> Export everything, anytime, it is
                your data
              </li>
            </ul>
            <p className="lp-inline-links">
              Related: <Link to="/invoicing-nigeria">Invoicing in Nigeria</Link>,{' '}
              <Link to="/resources">the resource hub</Link>, and{' '}
              <Link to="/how-it-works">how Invoicier works</Link>.
            </p>
          </div>
          <div className="lp-split-media" data-reveal="right">
            <div className="lp-hiw-ledger" data-tilt aria-hidden="true">
              <div className="lp-hiw-ledger-row lp-hiw-ledger-row--head">
                <span>Field</span>
                <span>On the e-invoice</span>
              </div>
              <div className="lp-hiw-ledger-row">
                <span>Seller TIN</span>
                <b>Captured</b>
              </div>
              <div className="lp-hiw-ledger-row">
                <span>VAT (7.5%)</span>
                <b>Per line</b>
              </div>
              <div className="lp-hiw-ledger-row">
                <span>WHT credit</span>
                <b>Recorded</b>
              </div>
              <div className="lp-hiw-ledger-foot">
                <i className="bx bx-badge-check" />
                Structured, exportable, ready
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-section lp-flow">
        <div className="lp-shell lp-faq">
          <div className="lp-section-head" data-reveal>
            <span className="lp-kicker">People also ask</span>
            <h2>E-invoicing in Nigeria: your questions</h2>
          </div>
          <div className="lp-faq-list">
            {FAQ.map((item) => (
              <details className="lp-faq-item" key={item.q} data-reveal>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-section">
        <div className="lp-shell lp-hiw-cta" data-reveal>
          <h2>Get ready for e-invoicing the easy way.</h2>
          <p>Start issuing structured, tax-grade invoices today. Free while in beta.</p>
          <a href={primaryCtaHref} className="lp-btn lp-btn--lg">
            {WAITLIST_MODE ? 'Join the waitlist' : 'Send your first invoice'}{' '}
            <i className="bx bx-right-arrow-alt" />
          </a>
          <p className="lp-fineprint">
            This guide is general information, not tax advice. Confirm your own
            obligations and dates with FIRS.
          </p>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
};
