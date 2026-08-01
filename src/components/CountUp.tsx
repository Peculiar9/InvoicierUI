import { useEffect, useRef, useState } from 'react';

interface CountUpProps {
  /** the real figure. Whenever it changes, the number travels there. */
  value: number;
  format: (n: number) => string;
  /** how long the trip takes, in ms */
  duration?: number;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Money that assembles itself. Counts from wherever it was to wherever it is
 * now, so a payment landing feels like the number moving, not swapping.
 */
export const CountUp = ({ value, format, duration = 900 }: CountUpProps) => {
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? value : 0));
  const from = useRef(shown);
  const frame = useRef(0);

  useEffect(() => {
    if (prefersReducedMotion() || from.current === value) {
      setShown(value);
      from.current = value;
      return;
    }
    const start = performance.now();
    const origin = from.current;
    const travel = value - origin;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out: fast off the line, settles gently on the figure
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(origin + travel * eased);
      if (t < 1) frame.current = requestAnimationFrame(tick);
      else from.current = value;
    };

    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [value, duration]);

  return <>{format(shown)}</>;
};
