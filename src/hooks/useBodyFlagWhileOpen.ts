import { useEffect } from 'react';

/**
 * While `on` is true, keep a class on <body>. Ref-counted per class, so several
 * menus open at once (or one closing as another opens) never clear the flag
 * prematurely.
 *
 * Used so floating action rails know to duck out of the way of an open dropdown
 * sheet and return the moment it closes — see `body.select-open` in the CSS.
 */
const counts = new Map<string, number>();

export const useBodyFlagWhileOpen = (on: boolean, className = 'select-open') => {
  useEffect(() => {
    if (!on) return;
    counts.set(className, (counts.get(className) ?? 0) + 1);
    document.body.classList.add(className);
    return () => {
      const next = (counts.get(className) ?? 1) - 1;
      counts.set(className, Math.max(0, next));
      if (next <= 0) document.body.classList.remove(className);
    };
  }, [on, className]);
};
