import { useEffect, useRef } from 'react';

interface KineticBandProps {
  words: string[];
  /** deep purple brand band when true, paper band when false */
  dark?: boolean;
}

/**
 * Kinetic type band: a giant line of outlined words that slides sideways as
 * the page scrolls past it. Direction-locked to scroll position, so it feels
 * bolted to the page, not animated at it.
 */
export const KineticBand = ({ words, dark = true }: KineticBandProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight;
        // 0 when the band enters from below, 1 when it leaves above
        const p = Math.min(1, Math.max(0, 1 - (rect.top + rect.height) / (vh + rect.height)));
        el.style.setProperty('--kx', String(p));
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const line = (copy: number) => (
    <span className="kb-line" key={copy}>
      {words.map((word, i) => (
        <span key={i} className={`kb-w${i % 2 ? ' alt' : ''}`}>
          {word}
          <i>·</i>
        </span>
      ))}
    </span>
  );

  return (
    <div className={`lp-kinetic${dark ? ' lp-kinetic--dark' : ''}`} ref={ref} aria-hidden="true">
      <div className="lp-kinetic-track">
        {line(0)}
        {line(1)}
      </div>
    </div>
  );
};
