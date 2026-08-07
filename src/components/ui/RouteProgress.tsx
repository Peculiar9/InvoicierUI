import { useEffect, useRef, useState } from 'react';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';

/**
 * The thin line at the top that says the app is talking to the server.
 *
 * Driven by React Query itself, so every query and every mutation is covered
 * without a single page wiring it up. Three details make it feel calm rather
 * than busy:
 *
 *   - It waits ~180ms before showing. Most requests here answer in under
 *     50ms, and a bar that flashes on every keystroke is worse than none.
 *   - It creeps towards 90% and stops. Pretending to know how far along a
 *     request is would be a lie; what it honestly says is "still going".
 *   - It finishes to 100% and fades, so the end is felt rather than guessed.
 */
export const RouteProgress = () => {
  const busy = useIsFetching() + useIsMutating();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  useEffect(() => {
    clearTimers();

    if (busy > 0) {
      // hold off, so a fast request never flickers
      timers.current.push(
        window.setTimeout(() => {
          setVisible(true);
          setProgress(12);
        }, 180)
      );
      return clearTimers;
    }

    if (!visible) return clearTimers;

    // land on 100 before leaving, so the end reads as finished not abandoned
    setProgress(100);
    timers.current.push(
      window.setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 320)
    );
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy]);

  // the creep: quick at first, slower as it goes, never reaching the end
  useEffect(() => {
    if (!visible || busy === 0) return;
    const tick = window.setInterval(() => {
      setProgress((current) => (current >= 90 ? 90 : current + (90 - current) * 0.12));
    }, 220);
    return () => clearInterval(tick);
  }, [visible, busy]);

  if (!visible) return null;

  return (
    <div className="route-progress" role="status" aria-live="polite" aria-label="Loading">
      <span className="route-progress-bar" style={{ transform: `scaleX(${progress / 100})` }} />
    </div>
  );
};
