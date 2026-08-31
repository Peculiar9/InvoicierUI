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
    q: 'How do I invoice a client in Nigeria?',
    a: 'Create the invoice with your business details, the client, the line items, and the tax that applies (VAT at 7.5%, and withholding tax where relevant), then send it as a link the client can open on any device. With online invoicing software the client pays naira by card or transfer through the link, you get a receipt, and the payment is recorded on the date it actually landed. No retyping, no chasing a signature on a printout.',
  },
  {
    q: 'Can I invoice in dollars from Nigeria?',
    a: 'Yes. Plenty of Nigerian freelancers and agencies bill international clients in USD, EUR or GBP. You issue the invoice in the foreign currency, attach your domiciliary or foreign account details, and when the money lands you record the date, the amount after fees, and any tax withheld. The date matters for filing because it drives the conversion rate applied to that income, so capturing it at the point of payment saves you a headache later.',
  },
  {
    q: 'Do I need to add VAT to my invoice?',
    a: 'If your business is VAT-registered and the goods or services are not exempt or zero-rated, you charge VAT at 7.5% and show it as a separate line. Whether you must register depends on your turnover and activity, so confirm your position with FIRS. Good invoicing software lets you flag VAT per invoice so the amount, and your running total, are correct without manual sums.',
  },
  {
    q: 'What is withholding tax on my invoice?',
    a: 'Withholding tax (WHT) is an advance tax your client deducts from your payment and remits to the tax authority on your behalf. When a client withholds, you receive less cash but you get a WHT credit note you can set against your own tax bill. The rate depends on the transaction and the parties, so treat WHT as a credit to track rather than money lost, and keep the record attached to the invoice it came from.',
  },
  {
    q: 'Is there free invoicing software in Nigeria?',
    a: 'Yes. Invoicier is free while in beta, and core invoicing stays free after: unlimited invoices, clients, receipts, and a tax-grade ledger, with naira payments via Paystack and foreign currency invoicing built in. You can send a branded invoice and get paid without paying a subscription to do it.',
  },
];

export const InvoicingNigeria = () => {
  usePageMeta('Invoicing in Nigeria: a practical guide for freelancers and SMBs', {
    description:
      'How to invoice in Nigeria without the friction: naira and foreign currency, VAT and withholding tax, getting paid across banks, and what to look for in invoicing software Nigeria businesses can trust.',
    canonicalPath: '/invoicing-nigeria',
    ogType: 'article',
  });
  const rootRef = useRef<HTMLElement>(null);
  useReveal(rootRef);
  useTiltRipple(rootRef);

  useJsonLd([
    articleSchema({
      headline: 'Invoicing in Nigeria: a practical guide for freelancers and SMBs',
      description:
        'How to invoice in Nigeria: naira and foreign currency, VAT and withholding tax, getting paid across banks, and what good online invoicing software should do for you.',
      path: '/invoicing-nigeria',
      datePublished: '2026-08-31',
    }),
    faqSchema(FAQ),
    breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Resources', path: '/resources' },
      { name: 'Invoicing in Nigeria', path: '/invoicing-nigeria' },
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
            <span>Invoicing in Nigeria</span>
          </nav>
          <span className="lp-kicker" data-reveal>
            The invoicing guide
          </span>
          <h1 data-reveal data-delay="1">
            Invoicing in Nigeria, done properly and paid faster.
          </h1>
          <p className="lp-hero-sub" data-reveal data-delay="2">
            Naira from a Lagos client, dollars from a client abroad, VAT and
            withholding on both. Here is how invoicing in Nigeria actually works,
            and how to make getting paid the easy part.
          </p>
        </div>
      </section>

      <section className="lp-section lp-prose">
        <div className="lp-shell lp-prose-shell">
          <div data-reveal>
            <h2>What makes invoicing in Nigeria its own sport</h2>
            <p>
              Invoicing anywhere is simple until you add money, tax and a bank.
              Invoicing in Nigeria adds all three at once. You might bill a client
              down the road in <strong>naira</strong> and a client three time
              zones away in <strong>USD, EUR or GBP</strong>, and both of those
              invoices have to survive filing season intact.
            </p>
            <p>
              Then there is how the money actually reaches you. A local client
              might pay by card, or by bank transfer from any one of dozens of
              banks, and the confirmation you get is a text message, not a tidy
              record. On top of that sits tax: <strong>VAT at 7.5%</strong> when
              you are registered and the supply is not exempt, and{' '}
              <strong>withholding tax (WHT)</strong> that a client can deduct
              before they pay you. Come March, none of this is optional to
              remember. It is the difference between numbers that reconcile and
              numbers that do not.
            </p>
          </div>

          <div data-reveal>
            <h2>The old ways, and why they hurt</h2>
            <p>
              Most people start with a Word or Excel template, and it works right
              up until it does not. You retype the same invoice every month,
              nudge a total by hand, and hope you did not fat-finger the VAT. The
              document is a picture of a bill, not a record of one.
            </p>
            <ul className="lp-check">
              <li>
                <i className="bx bx-check" /> <strong>No memory.</strong> A file
                on your laptop cannot tell you who paid, when, or how much of it
                was WHT.
              </li>
              <li>
                <i className="bx bx-check" /> <strong>No proof of payment.</strong>{' '}
                The bank alert is gone by the time you need it, and matching
                transfers to invoices becomes detective work.
              </li>
              <li>
                <i className="bx bx-check" /> <strong>Numbers that drift.</strong>{' '}
                By filing time your invoices say one thing and your account says
                another, and reconciling them eats a weekend.
              </li>
            </ul>
          </div>

          <div className="lp-callout" data-reveal>
            <i className="bx bx-bulb" aria-hidden="true" />
            <p>
              <strong>The one-line takeaway:</strong> the invoice is easy. The
              part that hurts is everything after you hit send, so pick a tool
              that handles the money and the tax, not just the layout.
            </p>
          </div>

          <div data-reveal>
            <h2>What to look for in invoicing software in Nigeria</h2>
            <p>
              Not all invoicing software Nigeria businesses can install is built
              for how you actually get paid. When you compare options, hold each
              one against this list.
            </p>
            <ul className="lp-check">
              <li>
                <i className="bx bx-check" /> <strong>A payment link</strong> your
                client can open and pay from with no signup and no app.
              </li>
              <li>
                <i className="bx bx-check" /> <strong>Naira via Paystack</strong>{' '}
                by card or transfer, plus room to show your foreign account
                details for USD, EUR and GBP invoices.
              </li>
              <li>
                <i className="bx bx-check" /> <strong>VAT and WHT per invoice</strong>,
                captured as you create the invoice, not reconstructed later.
              </li>
              <li>
                <i className="bx bx-check" /> <strong>A ledger on the real date</strong>{' '}
                the money landed, because that date drives the rate your foreign
                income is filed at.
              </li>
              <li>
                <i className="bx bx-check" /> <strong>A branded PDF and receipt</strong>,
                so every transaction looks like you meant it.
              </li>
              <li>
                <i className="bx bx-check" /> <strong>Export</strong>, because the
                records are yours and you should never be locked in.
              </li>
            </ul>
          </div>

          <div data-reveal>
            <h2>How to send an invoice that actually gets paid</h2>
            <ol className="lp-steps-num">
              <li>
                <b>Be specific.</b> Itemise the work, dates and quantities. A
                clear invoice is a paid invoice, and a vague one invites
                questions that delay the transfer.
              </li>
              <li>
                <b>State the currency and the tax.</b> Show VAT as its own line,
                note if WHT applies, and never make the client do mental maths on
                what they owe.
              </li>
              <li>
                <b>Make paying a single tap.</b> Send a link, not a request for a
                bank transfer the client has to type from memory. Friction is the
                enemy of prompt payment.
              </li>
              <li>
                <b>Set a due date and let it chase.</b> Terms plus automatic
                reminders get you paid sooner than politely hoping, and nobody has
                to feel awkward about it.
              </li>
            </ol>
          </div>
        </div>
      </section>

      <KineticBand words={['NAIRA', 'DOLLARS', 'PAID', 'RECORDED', 'FILED']} />

      <section className="lp-section">
        <div className="lp-shell lp-split lp-split--flip">
          <div className="lp-split-copy" data-reveal="left">
            <span className="lp-kicker">Where Invoicier fits</span>
            <h2>Online invoicing that ends at a clean record, not a sent email.</h2>
            <p>
              Invoicier does the whole loop. Your client gets a branded page and a
              print-perfect PDF, pays naira through Paystack or sends foreign
              currency to the account details on the invoice, and the moment the
              money lands it becomes a ledger row with its VAT and WHT already
              worked out. Invoicing in Nigeria without the after-hours
              reconciliation.
            </p>
            <ul className="lp-split-list">
              <li>
                <i className="bx bx-check" /> Naira via Paystack, plus foreign
                currency invoicing
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
              Related:{' '}
              <Link to="/e-invoicing-nigeria">e-invoicing in Nigeria</Link>,{' '}
              <Link to="/resources">the resource hub</Link>, and{' '}
              <Link to="/how-it-works">how Invoicier works</Link>.
            </p>
          </div>
          <div className="lp-split-media" data-reveal="right">
            <div className="lp-hiw-ledger" data-tilt aria-hidden="true">
              <div className="lp-hiw-ledger-row lp-hiw-ledger-row--head">
                <span>Received</span>
                <span>Client</span>
                <span>Amount</span>
              </div>
              <div className="lp-hiw-ledger-row">
                <span>Aug 4</span>
                <span>Lekki Retail</span>
                <b>₦1,720,000</b>
              </div>
              <div className="lp-hiw-ledger-row">
                <span>Aug 12</span>
                <span>Meridian LLC</span>
                <b>$3,400.00</b>
              </div>
              <div className="lp-hiw-ledger-row">
                <span>Aug 19</span>
                <span>Abuja Foods</span>
                <b>₦640,000</b>
              </div>
              <div className="lp-hiw-ledger-foot">
                <i className="bx bx-badge-check" />
                Naira and dollars, one clean ledger
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-section lp-flow">
        <div className="lp-shell lp-faq">
          <div className="lp-section-head" data-reveal>
            <span className="lp-kicker">People also ask</span>
            <h2>Invoicing in Nigeria: your questions</h2>
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
          <h2>Start invoicing in Nigeria the easy way.</h2>
          <p>Send a branded invoice, get paid in naira or dollars, keep a tax-grade record. Free while in beta.</p>
          <a href={primaryCtaHref} className="lp-btn lp-btn--lg">
            {WAITLIST_MODE ? 'Join the waitlist' : 'Send your first invoice'}{' '}
            <i className="bx bx-right-arrow-alt" />
          </a>
          <p className="lp-fineprint">
            This guide is general information, not tax advice. VAT is 7.5% and
            other specifics can change, so confirm your own obligations with FIRS.
          </p>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
};
