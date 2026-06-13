import { useRef } from 'react';
import { Link } from '@tanstack/react-router';
import { LegacyMarketingNav, Typewriter } from '@/components/static';
import { useScrollReveal } from '@/hooks/useScrollReveal';

export const Landing = () => {
  const rootRef = useRef<HTMLElement>(null);
  useScrollReveal(rootRef);

  return (
    <section className="legacy-page legacy-marketing-page" ref={rootRef}>
      <LegacyMarketingNav variant="landing" active="home" />

      {/* ---------------------------------------------------------------- HERO */}
      <div className="hero-container">
        <div className="hero-bg" aria-hidden="true">
          <span className="hero-blob hero-blob--1" />
          <span className="hero-blob hero-blob--2" />
          <span className="hero-grid" />
        </div>

        <div className="hero-content">
          <div className="hero-main">
            <div className="header-text">
              <h1 className="header-text-large" data-reveal data-delay="1">
                Invoices that
                <br />
                get paid from{' '}
                <Typewriter
                  words={['anywhere', 'your phone', 'a link', 'an email', 'WhatsApp', 'any bank']}
                />
              </h1>
              <p className="header-text-small" data-reveal data-delay="2">
                Invoicier creates and sends your invoices for you, so you collect
                payments faster, from any device.
              </p>
              <div className="hero-actions" data-reveal data-delay="3">
                <Link to="/signup" className="cta-btn">
                  Get Started for free <i className="bx bx-right-arrow-alt" />
                </Link>
                <a href="#pricing" className="ghost-btn">
                  See pricing <i className="bx bx-chevron-down" />
                </a>
              </div>
            </div>

            <div className="header-img" data-reveal="right" data-delay="2">
              <span className="hero-img-glow" aria-hidden="true" />
              <img src="/images/HeaderVector.png" alt="Invoicier dashboard preview" />
              <div className="hero-float hero-float--paid" aria-hidden="true">
                <span className="hero-float-dot" />
                <div>
                  <strong>$13,009</strong>
                  <small>Paid · just now</small>
                </div>
              </div>
              <div className="hero-float hero-float--sent" aria-hidden="true">
                <i className="bx bx-send" />
                <div>
                  <strong>Invoice sent</strong>
                  <small>to Otto Holdings</small>
                </div>
              </div>
            </div>
          </div>

          <p className="hero-trust" data-reveal data-delay="4">
            Trusted by <strong>2M+</strong> businesses worldwide
          </p>
        </div>
      </div>

      {/* --------------------------------------------------------------- ABOUT */}
      <div className="about-container">
        <div className="about-content">
          {[
            { img: 'abt-img1.png', title: 'Easy to use', delay: '1' },
            { img: 'abt-img2.png', title: 'Access anywhere', delay: '2' },
            { img: 'abt-img3.png', title: 'Customize easily', delay: '3' },
          ].map((card) => (
            <div className="about-card" key={card.title} data-reveal data-delay={card.delay}>
              <img src={`/images/${card.img}`} alt="" className="abt-img" />
              <div className="abt-text">
                <h3 className="abt-header-text">{card.title}</h3>
                <p className="abt-info-text">
                  Manage your business from any device, send invoices and collect
                  payments easily.
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ----------------------------------------------------------- CTA FIRST */}
      <div className="cta-first-container">
        <div className="cta-first-content">
          <div className="cta-first-text" data-reveal="left">
            <h1 className="cta-first-header">Get paid easily, connect with your customers</h1>
            <div className="cta-first-other">
              <div className="cta-text1">
                <h3>
                  <i className="bx bx-mobile-alt" />
                  Set it up in 5 minutes
                </h3>
                <div className="cta-text-small">
                  Spin up your account, add your branding and send your first
                  invoice before your coffee gets cold.
                </div>
              </div>
              <div className="cta-text2">
                <h3>
                  <i className="bx bxs-dashboard" />
                  One clear dashboard
                </h3>
                <div className="cta-text-small">
                  Track what's paid, pending and overdue at a glance, no
                  spreadsheets required.
                </div>
              </div>
            </div>
          </div>
          <div className="cta-first-img" data-reveal="right">
            <img src="/images/cta-img1.png" alt="" />
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------- CTA SECOND */}
      <div className="cta-second-container">
        <div className="cta-second-content">
          <div className="cta-second-img" data-reveal="left">
            <img src="/images/cta-img2.png" alt="" />
          </div>
          <div className="cta-second-text" data-reveal="right">
            <h1 className="cta-second-header">More than just an invoice</h1>
            <div className="cta-second-other">
              <div className="cta-text1">
                <h3>
                  <i className="bx bx-mobile-alt" />
                  Reminders on autopilot
                </h3>
                <div className="cta-text-small">
                  Polite nudges go out automatically until the invoice is paid,
                  so you never have to chase.
                </div>
              </div>
              <div className="cta-text2">
                <h3>
                  <i className="bx bxs-dashboard" />
                  A friendly interface
                </h3>
                <div className="cta-text-small">
                  Everything is where you expect it. If you can use a phone, you
                  can run your billing.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------ FEATURES */}
      <div className="features-container">
        <div className="features-content">
          <div className="features-head" data-reveal>
            <h1>Why Invoicier</h1>
            <p>A beautiful, simple way to handle invoices.</p>
          </div>
          <div className="features-grid">
            <article className="feature-card feature-card--1" data-reveal data-delay="1">
              <span className="feature-num">01</span>
              <span className="feature-icon">
                <i className="bx bx-code-alt" />
              </span>
              <h3>Built to integrate</h3>
              <p>
                Developers can drop invoicing straight into their own product with a
                clean REST API and SDKs.
              </p>
            </article>
            <article className="feature-card feature-card--2" data-reveal data-delay="2">
              <span className="feature-num">02</span>
              <span className="feature-icon">
                <i className="bx bx-wallet" />
              </span>
              <h3>Paid from anywhere</h3>
              <p>
                Cards, bank transfers, mobile money or a simple link. Your clients pay
                however suits them.
              </p>
            </article>
            <article className="feature-card feature-card--3" data-reveal data-delay="3">
              <span className="feature-num">03</span>
              <span className="feature-icon">
                <i className="bx bx-bot" />
              </span>
              <h3>AI does the busywork</h3>
              <p>
                Draft invoices, smart reminders and insights, generated for you so you
                stay focused on the work.
              </p>
            </article>
            <article className="feature-card feature-card--4" data-reveal data-delay="4">
              <span className="feature-num">04</span>
              <span className="feature-icon">
                <i className="bx bx-printer" />
              </span>
              <h3>Print-ready invoices</h3>
              <p>
                Beautiful invoices and receipts that print perfectly, or download as a
                PDF in one click.
              </p>
            </article>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- PRICING */}
      <div className="pricing-container" id="pricing">
        <div className="pricing-content">
          <div className="pricing-header" data-reveal>
            <h1>Start your journey</h1>
          </div>
          <div className="pricing-card" data-reveal data-delay="2">
            <h4>Free</h4>
            <p>Get started for free</p>
            <h3>$0.00</h3>
            <ul>
              <li>Free online system</li>
              <li>SSL security</li>
              <li>Dashboard management</li>
              <li>Unlimited invoices</li>
            </ul>
            <Link to="/signup" className="pricing-btn">
              Get started for free
            </Link>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------ REGISTER */}
      <div className="register-container">
        <div className="register-content">
          <div className="register-text" data-reveal="left">
            <h1 className="register-header-text">Complete business management suite</h1>
            <p className="register-text-small">
              Invoices, clients, payments and insights. Everything you need to
              run the money side of your business, in one place.
            </p>
            <Link to="/signup" className="cta-btn-register">
              Get Started for free <i className="bx bx-right-arrow-alt" />
            </Link>
          </div>
          <div className="register-img" data-reveal="right">
            <img src="/images/Register-img.png" alt="" />
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------- SUBSCRIBE */}
      <div className="subscribe-container">
        <img src="/images/subscribe-img.png" alt="" className="subscribe-image" />
        <div className="subscribe-content">
          <div className="subscribe-text" data-reveal>
            <h1 className="subscribe-header-text">
              Stay in the loop, subscribe to our newsletter
            </h1>
            <p className="subscribe-sub-text">
              No unnecessary noise, just the good stuff for your business.
            </p>
          </div>
          <form
            className="subscribe-form"
            data-reveal
            data-delay="2"
            onSubmit={(event) => event.preventDefault()}
          >
            <input type="search" placeholder="Email: johndoe@gmail.com" />{' '}
            <a>
              Sign Up <i className="bx bx-right-arrow-alt" />
            </a>
          </form>
        </div>
      </div>

      {/* ------------------------------------------------------------- REVIEWS */}
      <div className="user-review-container">
        <img src="/images/Ellipse 82.png" className="elipse" alt="" />
        <img src="/images/Polygon 1.png" className="polygon1" alt="" />
        <img src="/images/Polygon 2.png" className="polygon2" alt="" />
        <div className="user-review-content">
          <div className="usr-rev-text" data-reveal>
            <h1>When 2 million users say it, it can only be true</h1>
          </div>
          <div className="user-review">
            {[1, 2].map((n) => (
              <div className="user-review-card" key={n} data-reveal data-delay={String(n)}>
                <img src="/images/quote.png" alt="" className="quote-img" />
                <div className="user-review-card-content">
                  <div className="user-review-card-header">
                    <img src="/images/Peculiar.png" alt="" className="user-review-img" />
                    <h4 className="user-review-name">John Doe</h4>
                    <sub className="user-review-occupation">CEO, Batallion</sub>
                  </div>
                  <p className="user-review-card-text">
                    I have been using Invoicier for a while now and it has been
                    completely worthwhile. Getting paid has never been simpler.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------- FOOTER */}
      <footer className="footer-container">
        <span className="footer-pattern" aria-hidden="true" />

        <div className="footer-cta" data-reveal>
          <h2>Ready to get paid faster?</h2>
          <p>Create your first invoice in minutes. No card required.</p>
          <Link to="/signup" className="cta-btn footer-cta-btn">
            Get Started for free <i className="bx bx-right-arrow-alt" />
          </Link>
        </div>

        <div className="footer-content">
          <div className="footer-brand">
            <span className="footer-brand-name">Invoicier</span>
            <p>Invoicing on autopilot. Create, send and get paid, anywhere.</p>
            <ul className="social-icons">
              <li className="social-icon">
                <a href="#" className="link" aria-label="Twitter">
                  <i className="bx bxl-twitter" />
                </a>
              </li>
              <li className="social-icon">
                <a href="#" className="link" aria-label="LinkedIn">
                  <i className="bx bxl-linkedin" />
                </a>
              </li>
              <li className="social-icon">
                <a href="#" className="link" aria-label="Instagram">
                  <i className="bx bxl-instagram" />
                </a>
              </li>
            </ul>
          </div>

          <div className="footer-cols">
            <div className="footer-col">
              <h4>Product</h4>
              <ul>
                <li><a href="#pricing">Pricing</a></li>
                <li><a href="#">Features</a></li>
                <li><a href="#">Integrations</a></li>
                <li><Link to="/signup">Get started</Link></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <ul>
                <li><a href="#">About</a></li>
                <li><a href="#">Blog</a></li>
                <li><a href="#">Careers</a></li>
                <li><a href="#">Contact</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Resources</h4>
              <ul>
                <li><a href="#">Help center</a></li>
                <li><a href="#">Guides</a></li>
                <li><Link to="/login">Sign in</Link></li>
                <li><a href="#">Terms &amp; Privacy</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 Invoicier. All rights reserved.</span>
          <span>Made for businesses that move fast.</span>
        </div>

        <span className="footer-wordmark" aria-hidden="true">
          invoicier
        </span>
      </footer>
    </section>
  );
};
