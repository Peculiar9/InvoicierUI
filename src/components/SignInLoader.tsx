import { useEffect, useMemo, useState } from 'react';
import '@/styles/signin-loader.css';

/**
 * The moment between the door and the desk.
 *
 * A sign-in does real work the person cannot see: proving who they are,
 * pulling their ledger, tallying what they are owed. Instead of a spinner that
 * says nothing, this narrates it as a checklist that ticks line by line, then
 * lets a little confetti go when the workspace is ready. It is part of the
 * sign-in, not a wait dressed up as one.
 *
 * `onDone` fires once the sequence finishes, which is when the caller navigates
 * on. Reduced-motion visitors skip straight through.
 */

const STEPS = [
  { icon: 'bx-fingerprint', label: "Confirming it's you" },
  { icon: 'bx-book-open', label: 'Opening your ledger' },
  { icon: 'bx-coin-stack', label: "Counting what you're owed" },
  { icon: 'bx-been-here', label: 'Setting your table' },
] as const;

const CONFETTI_COLORS = ['#924ee9', '#ff5a5f', '#0c8d6f', '#e0a008', '#357fff'];
const STEP_MS = 620;

export const SignInLoader = ({ name, onDone }: { name?: string; onDone: () => void }) => {
  const [ticked, setTicked] = useState(0);
  const [celebrate, setCelebrate] = useState(false);

  const reduced = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );

  const confetti = useMemo(
    () =>
      Array.from({ length: 44 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        dur: 2.4 + Math.random() * 1.8,
        tilt: Math.round(Math.random() * 360),
        w: 6 + Math.round(Math.random() * 5),
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      })),
    []
  );

  useEffect(() => {
    if (reduced) {
      onDone();
      return;
    }
    const timers = STEPS.map((_, i) =>
      window.setTimeout(() => setTicked(i + 1), STEP_MS * (i + 1))
    );
    const cel = window.setTimeout(() => setCelebrate(true), STEP_MS * STEPS.length + 200);
    const finish = window.setTimeout(onDone, STEP_MS * STEPS.length + 1650);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(cel);
      clearTimeout(finish);
    };
  }, [reduced, onDone]);

  if (reduced) return null;

  const first = name?.trim().split(' ')[0];

  return (
    <div className="sil" role="status" aria-live="polite">
      {celebrate && (
        <div className="sil-confetti" aria-hidden="true">
          {confetti.map((c, i) => (
            <span
              key={i}
              style={{
                left: `${c.left}%`,
                width: c.w,
                height: c.w * 1.6,
                background: c.color,
                animationDelay: `${c.delay}s`,
                animationDuration: `${c.dur}s`,
                rotate: `${c.tilt}deg`,
              }}
            />
          ))}
        </div>
      )}

      <div className="sil-card">
        <div className={`sil-mark${celebrate ? ' is-open' : ''}`} aria-hidden="true">
          invoicier<b>.</b>
        </div>

        <p className="sil-head">
          {celebrate
            ? first
              ? `Welcome back, ${first}.`
              : 'Your workspace is ready.'
            : 'One moment, tidying up.'}
        </p>

        <ul className="sil-list">
          {STEPS.map((step, i) => {
            const state = i < ticked ? 'done' : i === ticked ? 'active' : 'wait';
            return (
              <li key={step.label} className={`sil-item is-${state}`}>
                <span className="sil-dot" aria-hidden="true">
                  <i className={`bx ${state === 'done' ? 'bx-check' : step.icon}`} />
                </span>
                <span className="sil-label">{step.label}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
