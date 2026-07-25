import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

interface SwipeScrollProps {
  children: ReactNode;
  className?: string;
}

/**
 * Horizontal scroll area with hidden scrollbars: swipe on touch, smooth
 * edge arrows on pointer devices. Arrows and edge fades only appear when
 * there is actually more content in that direction.
 */
export const SwipeScroll = ({ children, className }: SwipeScrollProps) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [can, setCan] = useState({ left: false, right: false });

  const update = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCan({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [update]);

  const nudge = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.7), behavior: 'smooth' });
  };

  return (
    <div
      className={`iw-swipe${can.left ? ' can-left' : ''}${can.right ? ' can-right' : ''}${
        className ? ` ${className}` : ''
      }`}
    >
      {can.left && (
        <button
          type="button"
          className="iw-swipe-btn is-left"
          aria-label="Scroll left"
          onClick={() => nudge(-1)}
        >
          <i className="bx bx-chevron-left" />
        </button>
      )}
      <div className="iw-swipe-track" ref={trackRef}>
        {children}
      </div>
      {can.right && (
        <button
          type="button"
          className="iw-swipe-btn is-right"
          aria-label="Scroll right"
          onClick={() => nudge(1)}
        >
          <i className="bx bx-chevron-right" />
        </button>
      )}
    </div>
  );
};
