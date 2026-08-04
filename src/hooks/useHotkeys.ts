import { useEffect, useRef } from 'react';

type Handler = (event: KeyboardEvent) => void;

/** True while the person is typing, when a shortcut would be an interruption. */
const isTyping = (target: EventTarget | null): boolean => {
  const el = target as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
};

/**
 * Bind single-key shortcuts. Keys are matched lowercase, so 'n' covers N.
 * Nothing fires while a field has focus, except Escape, which is how you
 * leave a field in the first place.
 */
export const useHotkeys = (
  map: Record<string, Handler | undefined>,
  enabled = true
) => {
  // the handlers change every render; the listener should not
  const latest = useRef(map);
  latest.current = map;

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      const handler = latest.current[key];
      if (!handler) return;
      if (key !== 'Escape' && isTyping(event.target)) return;
      event.preventDefault();
      handler(event);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
};
