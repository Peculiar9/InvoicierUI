import { useEffect } from 'react';
import type { RefObject } from 'react';

/**
 * Cursor-tilt, rippled through a page: any [data-tilt] element inside the
 * root leans a few degrees toward the cursor (8deg for data-tilt="strong",
 * 4deg otherwise). Skipped for touch and reduced-motion users.
 */
export function useTiltRipple(rootRef: RefObject<HTMLElement>, ready = true) {
  useEffect(() => {
    if (!ready) return;
    const root = rootRef.current;
    if (!root) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const els = Array.from(root.querySelectorAll<HTMLElement>('[data-tilt]'));
    const move = new Map<HTMLElement, (e: MouseEvent) => void>();
    const leave = new Map<HTMLElement, () => void>();
    els.forEach((el) => {
      const max = el.dataset.tilt === 'strong' ? 8 : 4;
      const onMove = (e: MouseEvent) => {
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - r.left) / r.width - 0.5;
        const dy = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty('--ty', `${(dx * max).toFixed(2)}deg`);
        el.style.setProperty('--tx', `${(-dy * max).toFixed(2)}deg`);
      };
      const onLeave = () => {
        el.style.setProperty('--tx', '0deg');
        el.style.setProperty('--ty', '0deg');
      };
      el.addEventListener('mousemove', onMove);
      el.addEventListener('mouseleave', onLeave);
      move.set(el, onMove);
      leave.set(el, onLeave);
    });
    return () => {
      els.forEach((el) => {
        const m = move.get(el);
        const l = leave.get(el);
        if (m) el.removeEventListener('mousemove', m);
        if (l) el.removeEventListener('mouseleave', l);
      });
    };
  }, [rootRef, ready]);
}
