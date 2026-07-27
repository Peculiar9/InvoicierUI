import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, FormEvent, MouseEvent as ReactMouseEvent, RefObject } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/authStore';
import { Typewriter } from '@/components/static';
import { KineticBand } from '@/components/static/MarketingFx';
import { useTiltRipple } from '@/hooks/useTiltRipple';
import '@/styles/landing-v2.css';

/* ----------------------------------------------------------------- loader */

/**
 * Full-page brand cover. The footer's world (deep purple, dot grid, ghost
 * "invoicier" wordmark) fills the screen while a counter runs 0→100 along a
 * stuttering profile, light filling the wordmark as it climbs. At 100 the mark
 * gets stamped PAID, then the curtain lifts and the page reveals.
 */
const COUNT_STOPS: Array<[number, number]> = [
  // [time 0..1, progress 0..100]: fast start, two hesitations, sprint home
  [0, 0],
  [0.3, 47],
  [0.42, 55],
  [0.62, 82],
  [0.74, 88],
  [0.92, 99],
  [1, 100],
];

const STATUS_LINES: Array<[number, string]> = [
  [0, 'Warming up the ledger'],
  [30, 'Folding crisp PDFs'],
  [55, 'Teaching reminders manners'],
  [80, 'Counting your money'],
  [97, 'Stamping'],
];

const LOAD_MS = 2600;

const easedProgress = (t: number) => {
  for (let i = 1; i < COUNT_STOPS.length; i++) {
    const [t1, p1] = COUNT_STOPS[i];
    const [t0, p0] = COUNT_STOPS[i - 1];
    if (t <= t1) {
      const local = (t - t0) / (t1 - t0);
      const eased = 1 - Math.pow(1 - local, 2); // ease-out within each leg
      return p0 + (p1 - p0) * eased;
    }
  }
  return 100;
};

const BrandLoader = ({ onDone }: { onDone: () => void }) => {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'counting' | 'done' | 'leaving'>('counting');
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timers: ReturnType<typeof setTimeout>[] = [];

    if (reduced) {
      setProgress(100);
      setPhase('done');
      timers.push(setTimeout(() => setPhase('leaving'), 500));
      timers.push(setTimeout(() => onDoneRef.current(), 850));
      return () => timers.forEach(clearTimeout);
    }

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / LOAD_MS);
      setProgress(Math.round(easedProgress(t)));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setPhase('done');
        timers.push(setTimeout(() => setPhase('leaving'), 700));
        timers.push(setTimeout(() => onDoneRef.current(), 1600));
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
    };
  }, []);

  const status =
    [...STATUS_LINES].reverse().find(([at]) => progress >= at)?.[1] ?? STATUS_LINES[0][1];

  return (
    <div
      className={`lp-loader${phase !== 'counting' ? ' is-done' : ''}${
        phase === 'leaving' ? ' is-leaving' : ''
      }`}
      style={{ '--p': `${progress}%` } as CSSProperties}
      role="status"
      aria-label={`Loading Invoicier, ${progress} percent`}
    >
      <span className="lp-loader-logo" aria-hidden="true">
        invoicier<b>.</b>
      </span>
      <div className="lp-loader-mark" aria-hidden="true">
        <span className="ghost">invoicier</span>
        <span className="lit">invoicier</span>
        <span className="lp-loader-beam" />
      </div>
      <span className="lp-loader-stamp" aria-hidden="true">
        Paid
      </span>
      <div className="lp-loader-rail" aria-hidden="true">
        <span className="lp-loader-count">
          {progress}
          <sup>%</sup>
        </span>
        <span className="lp-loader-status">{status}</span>
      </div>
      <span className="lp-loader-bar" aria-hidden="true" />
    </div>
  );
};

/* ----------------------------------------------------------- reveal + nav */

/** Scroll reveals, armed only after the loader lifts so nothing plays unseen. */
const useGatedReveal = (rootRef: RefObject<HTMLElement>, ready: boolean) => {
  useEffect(() => {
    if (!ready) return;
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
  }, [rootRef, ready]);
};

export const MarketingNav = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="lp-nav-wrap">
      <nav className={`lp-nav${scrolled ? ' is-scrolled' : ''}`}>
        <Link to="/" className="lp-logo">
          invoicier<b>.</b>
        </Link>
        <ul className="lp-nav-links">
          <li><a href="/#features">Product</a></li>
          <li><Link to="/how-it-works">How it works</Link></li>
          <li><a href="/#pricing">Pricing</a></li>
          <li><a href="#">Docs</a></li>
        </ul>
        <div className="lp-nav-actions">
          <Link to="/login" className="lp-nav-login">
            Log in
          </Link>
          <a href="#waitlist" className="lp-btn">
            Join waitlist <i className="bx bx-right-arrow-alt" />
          </a>
          <button
            type="button"
            className="lp-nav-toggle"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <i className={`bx ${open ? 'bx-x' : 'bx-menu'}`} />
          </button>
        </div>
        <div className={`lp-nav-sheet${open ? ' is-open' : ''}`}>
          <a href="/#features" onClick={() => setOpen(false)}>Product</a>
          <Link to="/how-it-works">How it works</Link>
          <a href="/#pricing" onClick={() => setOpen(false)}>Pricing</a>
          <a href="#waitlist" onClick={() => setOpen(false)}>Join waitlist</a>
          <Link to="/login">Log in</Link>
        </div>
      </nav>
    </div>
  );
};

/* ---------------------------------------------------- the payment orbit */

/**
 * Pinned scroll stage. Platform icons burst bouncily from a focal point and
 * hold position while the metrics snap in and fade out, one per scroll
 * segment, at the center of the field. Small screens and reduced-motion get
 * a calm static version via CSS.
 */
const ORBIT_ICONS: Array<{ bx: string; color: string; x: number; y: number; d: number }> = [
  { bx: 'bxl-paypal', color: '#003087', x: -300, y: -170, d: 0 },
  { bx: 'bxl-stripe', color: '#635bff', x: 290, y: -190, d: 0.05 },
  { bx: 'bxl-visa', color: '#1a1f71', x: -390, y: 40, d: 0.1 },
  { bx: 'bxl-mastercard', color: '#eb001b', x: 395, y: 60, d: 0.14 },
  { bx: 'bxl-github', color: '#1d1b2e', x: -210, y: 210, d: 0.18 },
  { bx: 'bxl-figma', color: '#a259ff', x: 230, y: 220, d: 0.22 },
  { bx: 'bxl-dribbble', color: '#ea4c89', x: -120, y: -260, d: 0.26 },
  { bx: 'bxl-behance', color: '#1769ff', x: 120, y: -280, d: 0.3 },
  { bx: 'bxl-shopify', color: '#95bf47', x: -450, y: -120, d: 0.34 },
  { bx: 'bxl-google', color: '#4285f4', x: 460, y: -90, d: 0.38 },
  { bx: 'bxl-slack', color: '#611f69', x: -330, y: 190, d: 0.42 },
  { bx: 'bxl-microsoft', color: '#00a4ef', x: 350, y: 200, d: 0.46 },
];

const ORBIT_METRICS = [
  {
    num: '₦0',
    copy: 'Invoicing is free and uncapped. The wedge, not a trial.',
  },
  {
    num: '3',
    copy: 'Three answers turn a foreign payment into a tax-grade record.',
  },
  {
    num: '7.5%',
    copy: 'Nigerian VAT handled per invoice, not per headache.',
  },
  {
    num: '₦100k+',
    copy: 'The filing penalty you will never meet.',
  },
];

const PaymentOrbit = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const [burst, setBurst] = useState(false);
  const [metric, setMetric] = useState(-1);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setBurst(true);
      return;
    }
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = sectionRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight;
        const total = rect.height - vh;
        if (total <= 0) return;
        const p = Math.min(1, Math.max(0, -rect.top / total));
        setBurst(p > 0.02);
        // segments: burst settles first, then one metric per slice
        const seg = (p - 0.12) / 0.86;
        setMetric(seg < 0 ? -1 : Math.min(3, Math.floor(seg * 4)));
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <section className="lp-orbit" ref={sectionRef} aria-label="Who you get paid by">
      <div className={`lp-orbit-stage${burst ? ' is-burst' : ''}`}>
        <p className="lp-orbit-cap">Wherever the work comes from, the record lands here.</p>
        <div className="lp-orbit-field" aria-hidden="true">
          {ORBIT_ICONS.map((icon) => (
            <span
              key={icon.bx}
              className="lp-orbit-icon"
              style={
                {
                  '--ox': `${icon.x}px`,
                  '--oy': `${icon.y}px`,
                  '--od': `${icon.d}s`,
                  '--oc': icon.color,
                } as CSSProperties
              }
            >
              <i className={`bx ${icon.bx}`} />
            </span>
          ))}
        </div>
        <div className="lp-orbit-metrics">
          {ORBIT_METRICS.map((m, i) => (
            <div
              key={m.num}
              className={`lp-orbit-metric${
                metric === i ? ' is-active' : metric > i ? ' is-passed' : ''
              }`}
            >
              <span className="lp-orbit-num">{m.num}</span>
              <p>{m.copy}</p>
            </div>
          ))}
        </div>
        <div className="lp-orbit-dots" aria-hidden="true">
          {ORBIT_METRICS.map((m, i) => (
            <span key={m.num} className={metric >= i ? 'on' : ''} />
          ))}
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------ invoice mock */

const STATUSES = [
  { key: 'drafted', label: 'Drafted' },
  { key: 'sent', label: 'Sent' },
  { key: 'viewed', label: 'Viewed' },
  { key: 'paid', label: 'Paid' },
] as const;

const InvoiceScene = () => {
  const [statusIndex, setStatusIndex] = useState(0);
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStatusIndex(STATUSES.length - 1);
      return;
    }
    const timer = setInterval(
      () => setStatusIndex((i) => (i + 1) % STATUSES.length),
      2200
    );
    return () => clearInterval(timer);
  }, []);

  const tilt = (event: ReactMouseEvent<HTMLDivElement>) => {
    const el = sceneRef.current;
    if (!el || !window.matchMedia('(pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = el.getBoundingClientRect();
    const dx = (event.clientX - rect.left) / rect.width - 0.5;
    const dy = (event.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty('--ry', `${(dx * 10).toFixed(2)}deg`);
    el.style.setProperty('--rx', `${(-dy * 10).toFixed(2)}deg`);
    el.style.setProperty('--gx', `${((dx + 0.5) * 100).toFixed(1)}%`);
    el.style.setProperty('--gy', `${((dy + 0.5) * 100).toFixed(1)}%`);
  };
  const untilt = () => {
    const el = sceneRef.current;
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  };

  return (
    <div
      className="lp-invoice-scene"
      data-reveal="right"
      data-delay="2"
      ref={sceneRef}
      onMouseMove={tilt}
      onMouseLeave={untilt}
    >
      <span className="lp-env lp-env--one" aria-hidden="true">
        <i className="bx bx-envelope" />
      </span>
      <span className="lp-env lp-env--two" aria-hidden="true">
        <i className="bx bxs-paper-plane" />
      </span>
      <div className="lp-hero-art lp-hero-art--big">
        <img
          src="/images/waitlist-voyage.png"
          alt="The Invoicier captain sailing a boat full of invoices to their destination"
        />
        <span className="lp-hero-art-glare" aria-hidden="true" />
        <div className="lp-hero-art-strip" aria-hidden="true">
          <div className="lp-invoice-steps">
            {STATUSES.map((s, i) => (
              <span
                key={s.key}
                className={`lp-step${i === statusIndex ? ' is-active' : ''}${
                  i < statusIndex ? ' is-done-step' : ''
                }`}
              >
                {s.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="lp-toast lp-toast--paid" aria-hidden="true">
        <span className="tick">
          <i className="bx bx-check" />
        </span>
        <div>
          <strong>+₦3,816,250</strong>
          <small>Paid via Paystack · just now</small>
        </div>
      </div>
      <div className="lp-toast lp-toast--remind" aria-hidden="true">
        <span className="bell">
          <i className="bx bx-bell" />
        </span>
        <div>
          <strong>Reminder sent</strong>
          <small>politely, on your behalf</small>
        </div>
      </div>
    </div>
  );
};

/* ----------------------------------------------------- the paper trail */

/**
 * Pinned horizontal scrub: one invoice becomes five documents. The stage
 * holds while vertical scroll slides the paper train sideways. Small screens
 * get a plain swipeable row.
 */
const PaperTrail = () => {
  const ref = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const measured = useRef(false);
  const [phase, setPhase] = useState<'scrub' | 'stack' | 'pulse' | 'voila'>('scrub');
  const [docked, setDocked] = useState(false);
  const [featIdx, setFeatIdx] = useState(-1);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPhase('voila');
      setDocked(true);
      setFeatIdx(3);
      return;
    }
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = ref.current;
        const stage = stageRef.current;
        if (!el || !stage) return;
        const rect = el.getBoundingClientRect();
        const total = rect.height - window.innerHeight;
        if (total <= 0) return;
        const p = Math.min(1, Math.max(0, -rect.top / total));
        // documents scrub through the first 22%, then the magic starts
        el.style.setProperty('--tp', String(Math.min(1, p / 0.22)));
        const next =
          p >= 0.36 ? 'voila' : p >= 0.3 ? 'pulse' : p >= 0.22 ? 'stack' : 'scrub';
        setDocked(p >= 0.46);
        setFeatIdx(p < 0.52 ? -1 : Math.min(3, Math.floor((p - 0.52) / 0.12)));
        if (next !== 'scrub' && !measured.current) {
          // each paper learns its own route to the center of the stage
          const sr = stage.getBoundingClientRect();
          const cx = sr.left + sr.width / 2;
          const cy = sr.top + sr.height * 0.55;
          stage.querySelectorAll<HTMLElement>('.lp-trail-doc').forEach((doc, i) => {
            const r = doc.getBoundingClientRect();
            doc.style.setProperty('--dx', `${Math.round(cx - (r.left + r.width / 2))}px`);
            doc.style.setProperty('--dy', `${Math.round(cy - (r.top + r.height / 2))}px`);
            doc.style.setProperty('--sr', `${(i - 2) * 4}deg`);
            doc.style.setProperty('--sd', `${i * 70}ms`);
          });
          measured.current = true;
        }
        setPhase(next);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const stageClass = `lp-trail-stage${phase !== 'scrub' ? ' is-stack' : ''}${
    phase === 'pulse' || phase === 'voila' ? ' is-pulse' : ''
  }${phase === 'voila' ? ' is-voila' : ''}${docked ? ' is-docked' : ''}${
    featIdx >= 0 ? ' is-story' : ''
  }`;

  const title =
    phase === 'voila'
      ? 'Voila. One clean dashboard.'
      : phase === 'scrub'
        ? 'One invoice becomes five documents. You touch it once.'
        : 'Now watch them come together.';

  return (
    <section className="lp-trail" id="features" ref={ref}>
      <div className={stageClass} ref={stageRef}>
        <div className="lp-shell lp-trail-head">
          <span className="lp-kicker">The paper trail</span>
          <h2 key={phase === 'scrub' ? 'a' : phase === 'voila' ? 'c' : 'b'} className="lp-trail-title">
            {title}
          </h2>
        </div>

        {/* the app itself, waiting behind the curtain */}
        <div className="lp-trail-dash" aria-hidden="true">
          <span className="lp-sd-rail">
            <i className="bx bx-grid-alt is-here" />
            <i className="bx bx-receipt" />
            <i className="bx bx-user" />
            <i className="bx bx-cog" />
          </span>
          <div className="lp-sd-main">
            <div className="lp-td-top">
              <span className="lp-td-dot" />
              Dashboard
              <small>this tax year</small>
              <b className="lp-sd-new">+ New invoice</b>
            </div>
            <div className="lp-td-kpis">
              <div>
                <small>Collected</small>
                <b>&#8358;21.4m</b>
              </div>
              <div>
                <small>Outstanding</small>
                <b>&#8358;11.5m</b>
              </div>
              <div>
                <small>VAT set aside</small>
                <b>&#8358;1.49m</b>
              </div>
            </div>
            <div className="lp-td-march">
              <small>March readiness</small>
              <span className="track">
                <span className="fill" />
              </span>
              <b>100%</b>
            </div>
            <svg className="lp-td-chart" viewBox="0 0 300 60" preserveAspectRatio="none">
              <path
                d="M0 50 C40 44 60 46 90 38 C120 30 150 34 180 24 C210 16 240 20 300 6"
                fill="none"
                stroke="#924ee9"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
            <div className="lp-td-rows">
              <span><em>IV2047</em> Otto Holdings <b>Paid</b></span>
              <span><em>IV2048</em> Bird Studios <b className="sent">Sent</b></span>
            </div>
          </div>
        </div>

        {/* the left story: static while the app shows its receipts */}
        <div className="lp-saga-story">
          <span className="lp-kicker">Why Invoicier</span>
          <h2>The invoice is the easy part. We built everything after it.</h2>
          <p className="lp-saga-sub">
            Getting paid is a link. Staying filed is a system. Invoicier is
            both, wearing one clean interface.
          </p>
          <div className="lp-card lp-card--dark lp-card--mini">
            <span className="lp-card-tag">The core</span>
            <h3>A ledger that writes itself</h3>
            <div className="lp-mini-ledger" aria-hidden="true">
              <span><em>Mar 3</em><b>Otto Holdings</b><i>&#8358;3,816,250</i></span>
              <span><em>Mar 9</em><b>Bird Studios</b><i>$2,150.00</i></span>
              <span><em>Mar 14</em><b>Thornton &amp; Co</b><i>&#8358;980,000</i></span>
            </div>
          </div>
        </div>

        {/* the receipts, snapping bottom to top beside the docked app */}
        <div className="lp-saga-feats" aria-hidden="true">
          <div className={`lp-feat${featIdx === 0 ? ' is-active' : featIdx > 0 ? ' is-passed' : ''}`}>
            <span className="lp-card-icon"><i className="bx bx-wallet" /></span>
            <h3>Paid from anywhere</h3>
            <p>Paystack for naira, your own accounts for dollars, euros and pounds.</p>
            <div className="lp-chiprow">
              <span className="lp-chip">Paystack</span>
              <span className="lp-chip">NGN</span>
              <span className="lp-chip">USD</span>
              <span className="lp-chip">EUR</span>
              <span className="lp-chip">GBP</span>
            </div>
          </div>
          <div className={`lp-feat${featIdx === 1 ? ' is-active' : featIdx > 1 ? ' is-passed' : ''}`}>
            <span className="lp-card-icon"><i className="bx bx-badge-check" /></span>
            <h3>Receipts on autopilot</h3>
            <p>The moment an invoice is paid, receipt PDFs go to both of you. Zero clicks.</p>
          </div>
          <div className={`lp-feat${featIdx === 2 ? ' is-active' : featIdx > 2 ? ' is-passed' : ''}`}>
            <span className="lp-card-icon"><i className="bx bx-printer" /></span>
            <h3>Print-perfect PDFs</h3>
            <p>Invoices that survive the accountant, the auditor and the office printer.</p>
          </div>
          <div className={`lp-feat${featIdx === 3 ? ' is-active' : ''}`}>
            <span className="lp-card-icon"><i className="bx bx-calculator" /></span>
            <h3>The estimator, next</h3>
            <p>Your liability as an honest range beside the &#8358;100k penalty.</p>
            <span className="lp-mini-range">&#8358;480k <i>to</i> &#8358;610k</span>
          </div>
        </div>

        <div className="lp-trail-track" aria-hidden="true">
          <article className="lp-trail-doc">
            <span className="lp-trail-num">01</span>
            <h4>The invoice</h4>
            <div className="lp-trail-paper">
              <b>INVOICE &#183; IV2047</b>
              <span className="rule" />
              <span className="row"><em>Brand identity</em><i>&#8358;2,400,000</i></span>
              <span className="row"><em>Motion design</em><i>&#8358;1,150,000</i></span>
              <span className="row"><em>VAT 7.5%</em><i>&#8358;266,250</i></span>
              <span className="rule" />
              <span className="row total"><em>Total</em><i>&#8358;3,816,250</i></span>
            </div>
          </article>
          <i className="bx bx-right-arrow-alt lp-trail-arrow" />
          <article className="lp-trail-doc">
            <span className="lp-trail-num">02</span>
            <h4>The pay link</h4>
            <div className="lp-trail-paper lp-trail-paper--link">
              <b>pay.invoicier.app/otto-2047</b>
              <span className="paybtn">Pay &#8358;3,816,250</span>
              <small>No account needed</small>
            </div>
          </article>
          <i className="bx bx-right-arrow-alt lp-trail-arrow" />
          <article className="lp-trail-doc">
            <span className="lp-trail-num">03</span>
            <h4>The receipt</h4>
            <div className="lp-trail-paper">
              <b>RECEIPT &#183; IV2047</b>
              <span className="rule" />
              <span className="row"><em>Received</em><i>Mar 3, 2027</i></span>
              <span className="row"><em>Via</em><i>Paystack</i></span>
              <span className="stamp">Paid</span>
            </div>
          </article>
          <i className="bx bx-right-arrow-alt lp-trail-arrow" />
          <article className="lp-trail-doc">
            <span className="lp-trail-num">04</span>
            <h4>The ledger row</h4>
            <div className="lp-trail-paper lp-trail-paper--mono">
              <span className="row"><em>2027-03-03</em><i>Otto Holdings</i></span>
              <span className="row"><em>&#8358;3,816,250</em><i>VAT &#8358;266,250</i></span>
              <span className="row ok"><em>Cash basis</em><i>recorded</i></span>
            </div>
          </article>
          <i className="bx bx-right-arrow-alt lp-trail-arrow" />
          <article className="lp-trail-doc">
            <span className="lp-trail-num">05</span>
            <h4>The filing pack</h4>
            <div className="lp-trail-paper lp-trail-paper--pack">
              <b>MARCH, PREPARED</b>
              <span className="row"><em>CBN rates</em><i>applied</i></span>
              <span className="row"><em>VAT &amp; WHT</em><i>reconciled</i></span>
              <span className="row ok"><em>Return</em><i>ready</i></span>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ faq */

const FAQS = [
  {
    q: 'Is it actually free, or free like a gym trial?',
    a: 'Free like air, not like a trial. Invoicing stays free after launch too. The filing pack is what we sell, and it shows up priced beside the ₦100k penalty, not beside an accountant’s retainer.',
  },
  {
    q: 'Does my client need to download anything?',
    a: 'Nothing. They tap a link, see a clean invoice, pay, and get a thank-you receipt. Some of them will ask what you are using. That is the plan.',
  },
  {
    q: 'What happens when a dollar payment lands?',
    a: 'You answer three questions: the date it arrived, the amount after fees, and any tax withheld. That is all filing season ever wanted from you.',
  },
  {
    q: 'What does tax-grade actually mean?',
    a: 'Income recorded on the day the money landed, the way individuals are actually taxed. VAT per invoice. Withholding tax saved as credit records. When March comes, the homework is already done.',
  },
  {
    q: 'When does the filing pack arrive?',
    a: 'Before March does. The waitlist gets it first and cheapest.',
  },
];

const Faq = () => {
  const [openIdx, setOpenIdx] = useState(0);

  return (
    <section className="lp-section lp-faq-wrap">
      <div className="lp-shell lp-faq">
        <div className="lp-faq-head">
          <span className="lp-kicker">The straight answers</span>
          <h2>You ask, we don't dodge.</h2>
          <p>Five questions everyone asks before they join.</p>
          <a href="#waitlist" className="lp-faq-more">
            Still curious? Ask us from the inside
            <i className="bx bx-right-arrow-alt" aria-hidden="true" />
          </a>
        </div>
        <div className="lp-faq-list">
          {FAQS.map((item, i) => (
            <div key={item.q} className={`lp-faq-item${openIdx === i ? ' is-open' : ''}`}>
              <button
                type="button"
                onClick={() => setOpenIdx(openIdx === i ? -1 : i)}
                aria-expanded={openIdx === i}
              >
                <span className="lp-faq-num">{String(i + 1).padStart(2, '0')}</span>
                {item.q}
                <i className="bx bx-plus" aria-hidden="true" />
              </button>
              <div className="lp-faq-a">
                <p>{item.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------- the statement */

const STATEMENT_WORDS =
  'Never think about receiving your payments the same way again.'.split(' ');

/**
 * Manifesto moment: the sentence assembles itself as you scroll, one word
 * catching ink at a time.
 */
/** True when the card can fly: fine pointer, wide screen, motion allowed. */
const useTravelOk = () => {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const wide = window.matchMedia('(min-width: 1021px)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setOk(wide.matches && !reduced.matches);
    update();
    wide.addEventListener('change', update);
    reduced.addEventListener('change', update);
    return () => {
      wide.removeEventListener('change', update);
      reduced.removeEventListener('change', update);
    };
  }, []);
  return ok;
};

/** The one pricing card, front and back. Rendered exactly once per viewport. */
const PriceCardFaces = () => (
  <>
    <div className="lp-morph-face lp-morph-front lp-price-card">
      <span className="lp-price-badge">Beta</span>
      <h4>Everything plan</h4>
      <div className="lp-price">
        <strong>&#8358;0.00</strong>
        <span>/ uncapped, forever</span>
      </div>
      <ul className="lp-price-list">
        <li><i className="bx bx-check" />Unlimited invoices &amp; clients</li>
        <li><i className="bx bx-check" />Payment links in USD, EUR, GBP &amp; NGN</li>
        <li><i className="bx bx-check" />Automatic, well-mannered reminders</li>
        <li><i className="bx bx-check" />Dashboard, insights &amp; exports</li>
        <li><i className="bx bx-check" />SSL security, PDF downloads</li>
      </ul>
      <a href="/#waitlist" className="lp-btn">
        Join the waitlist <i className="bx bx-right-arrow-alt" />
      </a>
      <p className="lp-price-note">Free for waitlist members during beta. No card, no gotchas.</p>
    </div>
    <div className="lp-morph-face lp-morph-back">
      <svg className="lp-morph-check" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r="32" fill="none" strokeWidth="4" />
        <path d="M22 37 L32 47 L51 27" fill="none" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <b>Payment successful</b>
      <small>&#8358;0.00 · the wedge stays free</small>
      <span className="lp-morph-ref">REF · INV-YOU-2026</span>
    </div>
  </>
);

const PricingSection = ({ travel }: { travel: boolean }) => (
  <section className="lp-section lp-pricing" id="pricing">
    <div className="lp-shell lp-pricing-grid">
      <div className="lp-pricing-copy" data-reveal="left">
        <span className="lp-kicker lp-kicker--warm">Pricing</span>
        <h2>Pricing that isn't.</h2>
        <p>
          Every feature, every invoice. Free while we're in beta. And free
          means free, not “free until you need it.”
        </p>
      </div>
      <div className="lp-ps-slot" id="ps-slot-a" data-reveal="right">
        {/* on small screens the card stays home; on desktop the fixed layer flies it */}
        {!travel && (
          <div className="lp-morph">
            <div className="lp-morph-inner">
              <PriceCardFaces />
            </div>
          </div>
        )}
      </div>
    </div>
  </section>
);

const StatementSection = () => {
  const ref = useRef<HTMLElement>(null);
  const [lit, setLit] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setLit(STATEMENT_WORDS.length);
      return;
    }
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight;
        const p = Math.min(1, Math.max(0, (vh * 0.85 - rect.top) / (vh * 0.5)));
        setLit(Math.round(p * STATEMENT_WORDS.length));
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <section className="lp-statement" ref={ref}>
      <div className="lp-shell lp-statement-grid">
        <div>
          <span className="lp-kicker">The point of all this</span>
          <p className="lp-statement-line" aria-label={STATEMENT_WORDS.join(' ')}>
            {STATEMENT_WORDS.map((word, i) => (
              <span key={i} className={i < lit ? 'on' : ''} aria-hidden="true">
                {word}{' '}
              </span>
            ))}
          </p>
          <p className="lp-statement-sub">
            Invoicier turns getting paid into keeping records, without you ever
            noticing the second part happened.
          </p>
        </div>
        <div className="lp-ps-slot" id="ps-slot-b" aria-hidden="true" />
      </div>
    </section>
  );
};

/**
 * The flight itself: a fixed layer measures both slots every frame and
 * carries the card from pricing to the statement with an arc and a tilt,
 * flipping it to "payment successful" on landing. Hand-rolled FLIP, no
 * library required.
 */
const CardTravel = () => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const a = document.getElementById('ps-slot-a');
      const b = document.getElementById('ps-slot-b');
      const card = cardRef.current;
      if (!a || !b || !card) return;
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      const dist = br.top - ar.top;
      if (dist <= 0) return;
      const s = Math.min(1, Math.max(0, (window.innerHeight * 0.55 - ar.top) / dist));
      const e = s < 0.5 ? 2 * s * s : 1 - Math.pow(-2 * s + 2, 2) / 2;
      const drift = Math.sin(e * Math.PI) * -52;
      const rot = Math.sin(e * Math.PI) * -5;
      card.style.width = `${ar.width}px`;
      card.style.transform = `translate3d(${ar.left + e * (br.left - ar.left) + drift}px, ${
        ar.top + e * dist
      }px, 0) rotate(${rot}deg)`;
      setFlipped(s >= 0.985);
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div className="lp-cardtravel" ref={cardRef}>
      <div className={`lp-morph${flipped ? ' is-flipped' : ''}`}>
        <div className="lp-morph-inner">
          <PriceCardFaces />
        </div>
      </div>
    </div>
  );
};

/* TEMPORARY: dev shortcut into the onboarding journey. Self-authenticates
   against the mock backend and jumps to /welcome. Delete before launch. */
const TempOnboardingButton = () => {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setUser = useAuthStore((s) => s.setUser);

  const go = () => {
    if (!isAuthenticated) {
      setUser(
        {
          id: 'usr_demo',
          email: 'demo@invoicier.app',
          username: 'demo',
          createdAt: new Date().toISOString(),
        },
        'mock-jwt-token'
      );
    }
    navigate({ to: '/welcome' });
  };

  return (
    <button type="button" className="lp-temp-ob" onClick={go}>
      <b>Temp</b>
      <i className="bx bx-test-tube" aria-hidden="true" />
      Test the onboarding
    </button>
  );
};

/** Scroll parallax: the hero background drifts as the page moves. */
const useScrollDrift = (rootRef: RefObject<HTMLElement>) => {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        root.style.setProperty('--sy', String(Math.min(1, window.scrollY / 900)));
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, [rootRef]);
};

/* ------------------------------------------------------------------ page */

const MARQUEE_ITEMS = [
  'NGN · USD · EUR · GBP',
  'Paystack payments',
  'Tax-grade ledger',
  'VAT & WHT captured',
  'PDF invoices & receipts',
  'Tax estimator coming soon',
];

const WAITLIST_KEY = 'invoicier-waitlist';

const INTRO_KEY = 'invoicier-intro-played';

export const Landing = () => {
  const rootRef = useRef<HTMLElement>(null);
  // The brand loader exists to cover the first paint while assets land.
  // After it has played once this session, going Home skips straight in.
  const [loading, setLoading] = useState(
    () => sessionStorage.getItem(INTRO_KEY) === null
  );
  useGatedReveal(rootRef, !loading);
  useTiltRipple(rootRef, !loading);
  useScrollDrift(rootRef);
  const travelOk = useTravelOk();

  const finishIntro = () => {
    sessionStorage.setItem(INTRO_KEY, '1');
    setLoading(false);
  };

  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistError, setWaitlistError] = useState('');
  const [waitlisted, setWaitlisted] = useState(
    () => localStorage.getItem(WAITLIST_KEY) !== null
  );

  const joinWaitlist = (event: FormEvent) => {
    event.preventDefault();
    const email = waitlistEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setWaitlistError('That email does not look right. Give it another go.');
      return;
    }
    const entries: Array<{ email: string; at: string }> = JSON.parse(
      localStorage.getItem(WAITLIST_KEY) ?? '[]'
    );
    entries.push({ email, at: new Date().toISOString() });
    localStorage.setItem(WAITLIST_KEY, JSON.stringify(entries));
    setWaitlisted(true);
  };

  useEffect(() => {
    if (!loading) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [loading]);

  return (
    <>
      {loading && <BrandLoader onDone={finishIntro} />}

      <main className="lp" ref={rootRef}>
        <MarketingNav />
        <TempOnboardingButton />

        {/* ------------------------------------------------------------ HERO */}
        <section className="lp-hero">
          <div className="lp-hero-bg" aria-hidden="true">
            <span className="grid" />
            <span className="blob blob--brand" />
            <span className="blob blob--coral" />
            <span className="cur cur--ngn">₦</span>
            <span className="cur cur--usd">$</span>
            <span className="cur cur--eur">€</span>
            <span className="cur cur--gbp">£</span>
          </div>
          <div className="lp-shell lp-hero-inner">
            <div>
              <a href="#waitlist" className="lp-tag" data-reveal data-delay="1">
                Early access is open · join the waitlist
                <i className="bx bx-right-arrow-alt" />
              </a>
              <h1 data-reveal data-delay="2">
                Invoices that get themselves paid. From{' '}
                <Typewriter
                  words={['anywhere', 'a link', 'WhatsApp', 'Paystack', 'any bank', 'your phone']}
                />
              </h1>
              <p className="lp-hero-sub" data-reveal data-delay="3">
                Invoicier drafts it in thirty seconds, sends it as a link your
                client can pay in naira or dollars, then quietly files every
                payment into a tax-grade ledger. By the time March asks
                questions, your books already have the answers.
              </p>
              <div className="lp-hero-actions" data-reveal data-delay="4">
                <a href="#waitlist" className="lp-btn lp-btn--lg">
                  Join the waitlist <i className="bx bx-right-arrow-alt" />
                </a>
                <Link to="/how-it-works" className="lp-btn lp-btn--ghost lp-btn--lg">
                  See everything you get <i className="bx bx-right-arrow-alt" />
                </Link>
              </div>
              <div className="lp-assure" data-reveal data-delay="5">
                <span>
                  <i className="bx bx-check" />
                  Free, uncapped invoicing
                </span>
                <span>
                  <i className="bx bx-check" />
                  NGN, USD, EUR &amp; GBP
                </span>
                <span>
                  <i className="bx bx-check" />
                  VAT &amp; WHT captured
                </span>
              </div>
            </div>
            <InvoiceScene />
          </div>
        </section>

        {/* --------------------------------------------------------- MARQUEE */}
        <div className="lp-marquee" aria-hidden="true">
          <div className="lp-marquee-track">
            {[0, 1].map((copy) => (
              <span className="lp-marquee-item" key={copy}>
                {MARQUEE_ITEMS.map((item) => (
                  <span className="lp-marquee-item" key={item}>
                    {item}
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>

        {/* --------------------------------------------- THE PAYMENT ORBIT */}
        <PaymentOrbit />

        {/* ----------------------------------------------- THE PAPER TRAIL */}
        <PaperTrail />

        {/* the lifecycle, shouted quietly */}
        <KineticBand
          words={['SEND', 'GET PAID', 'RECEIPTED', 'LEDGERED', 'FILED']}
        />

        {/* -------------------------------- PRICING, then THE POINT, apart */}
        <PricingSection travel={travelOk} />
        <StatementSection />
        {travelOk && <CardTravel />}

        {/* ------------------------------------------------------------ QUOTES */}
        <section className="lp-section">
          <div className="lp-shell">
            <div className="lp-section-head" data-reveal>
              <span className="lp-kicker lp-kicker--warm">Early users</span>
              <h2>Kind words from the beta.</h2>
              <p>Real workflows from the people testing Invoicier right now.</p>
            </div>
            <div className="lp-quotes-drift">
              <div className="lp-quotes-track">
                <div className="lp-quotes-set">
                  <blockquote className="lp-quote">
                    <p>
                      Invoicier chases so I don't have to. My awkward “just
                      following up on this” emails are officially extinct.
                    </p>
                    <footer>
                      <span className="lp-quote-avatar">AO</span>
                      <div>
                        <b>Amara O.</b>
                        <small>Studio lead, Lagos</small>
                      </div>
                    </footer>
                  </blockquote>
                  <blockquote className="lp-quote">
                    <p>
                      I invoice from my phone between commits. The money shows
                      up. That's the whole review.
                    </p>
                    <footer>
                      <span className="lp-quote-avatar">TA</span>
                      <div>
                        <b>Tobi A.</b>
                        <small>Product designer, billing US clients from Lagos</small>
                      </div>
                    </footer>
                  </blockquote>
                  <blockquote className="lp-quote">
                    <p>
                      The ledger part is sneaky. I came for the invoices and
                      stayed because March stopped being scary.
                    </p>
                    <footer>
                      <span className="lp-quote-avatar">CN</span>
                      <div>
                        <b>Chidi N.</b>
                        <small>Photographer, Abuja</small>
                      </div>
                    </footer>
                  </blockquote>
                  <blockquote className="lp-quote">
                    <p>
                      Sent my first invoice from the bus. It was paid before I
                      got home.
                    </p>
                    <footer>
                      <span className="lp-quote-avatar">SK</span>
                      <div>
                        <b>Sade K.</b>
                        <small>Copywriter, Ibadan</small>
                      </div>
                    </footer>
                  </blockquote>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------------- FAQ */}
        <Faq />

        {/* ---------------------------------------------------------- WAITLIST */}
        <section className="lp-waitlist" id="waitlist">
          <div className="lp-shell lp-waitlist-stage">
            <div className="lp-waitlist-panel" data-reveal>
              <span className="lp-waitlist-hands" aria-hidden="true">
                <img src="/images/subscribe-img.png" alt="" />
              </span>
              <span className="lp-waitlist-float lp-waitlist-float--plane" aria-hidden="true">
                <i className="bx bx-paper-plane" />
              </span>
              <span className="lp-waitlist-float lp-waitlist-float--coin" aria-hidden="true">
                <i className="bx bx-coin" />
              </span>
              <span className="lp-waitlist-float lp-waitlist-float--bell" aria-hidden="true">
                <i className="bx bx-bell" />
              </span>
              <span className="lp-waitlist-float lp-waitlist-float--check" aria-hidden="true">
                <i className="bx bx-check-circle" />
              </span>

              <span className="lp-stamp">Early access</span>
              <h2>Stay in the loop. Be first in line when Invoicier opens up.</h2>
              <p>
                We're letting people in as we go. Drop your email and you'll get
                your invite before anyone else, plus the early-bird price when
                the filing pack lands. No unnecessary noise, just the good stuff
                for your business.
              </p>

              {waitlisted ? (
                <div className="lp-waitlist-done" role="status">
                  <i className="bx bx-check" />
                  You're on the list. Watch your inbox for your invite.
                </div>
              ) : (
                <>
                  <form className="lp-waitlist-form" onSubmit={joinWaitlist}>
                    <input
                      type="email"
                      value={waitlistEmail}
                      onChange={(event) => {
                        setWaitlistEmail(event.target.value);
                        setWaitlistError('');
                      }}
                      placeholder="you@yourbusiness.com"
                      aria-label="Email address"
                    />
                    <button type="submit" className="lp-btn">
                      Join the waitlist <i className="bx bx-right-arrow-alt" />
                    </button>
                  </form>
                  {waitlistError && <p className="lp-waitlist-error">{waitlistError}</p>}
                </>
              )}

              <div className="lp-waitlist-perks">
                <span>
                  <i className="bx bx-check" />
                  Early-bird filing pack price
                </span>
                <span>
                  <i className="bx bx-check" />
                  Vote on the roadmap
                </span>
                <span>
                  <i className="bx bx-check" />
                  One email a month, no spam
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ FOOTER */}
        <MarketingFooter />
      </main>
    </>
  );
};

/* shared marketing footer: the brand world closes every page */
export const MarketingFooter = () => (
  <footer className="lp-footer">
    <div className="lp-footer-cta" data-reveal>
      <h2>Invoice today. Thank yourself in March.</h2>
      <p>
        Free invoicing now, painless filing later. Your invite takes thirty
        seconds.
      </p>
      <a href="/#waitlist" className="lp-btn lp-btn--lg">
        Join the waitlist <i className="bx bx-right-arrow-alt" />
      </a>
    </div>

    <div className="lp-footer-grid">
      <div className="lp-footer-brand">
        <span className="lp-logo">
          invoicier<b>.</b>
        </span>
        <p>
          Free invoicing with tax-grade records, for Nigerian freelancers and
          small businesses billing the world.
        </p>
        <div className="lp-social">
          <a href="#" aria-label="Twitter"><i className="bx bxl-twitter" /></a>
          <a href="#" aria-label="LinkedIn"><i className="bx bxl-linkedin" /></a>
          <a href="#" aria-label="Instagram"><i className="bx bxl-instagram" /></a>
        </div>
      </div>
      <div className="lp-footer-cols">
        <div className="lp-footer-col">
          <h4>Product</h4>
          <ul>
            <li><a href="/#pricing">Pricing</a></li>
            <li><a href="/#features">Features</a></li>
            <li><Link to="/how-it-works">How it works</Link></li>
            <li><a href="/#waitlist">Join the waitlist</a></li>
          </ul>
        </div>
        <div className="lp-footer-col">
          <h4>Company</h4>
          <ul>
            <li><a href="#">About</a></li>
            <li><a href="#">Blog</a></li>
            <li><a href="#">Careers</a></li>
            <li><a href="#">Contact</a></li>
          </ul>
        </div>
        <div className="lp-footer-col">
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

    <div className="lp-footer-bottom">
      <span>© 2026 Invoicier. All rights reserved.</span>
      <a
        className="lp-footer-credit"
        href="https://peculiarlabs.com"
        target="_blank"
        rel="noreferrer"
      >
        Made with <i className="bx bxs-heart lp-heart" aria-hidden="true" /> by
        peculiarlabs
      </a>
      <span>Made for businesses and individuals that move fast.</span>
    </div>

    <span className="lp-wordmark" data-reveal aria-hidden="true">
      invoicier
    </span>
  </footer>
);
