import { useMemo } from 'react';

const COLORS = ['#6C5CE7', '#FF7A59', '#0C8D6F', '#F4B740', '#4C6FFF'];

interface ConfettiProps {
  /** how many pieces fall. Keep it modest inside the app, generous at milestones. */
  count?: number;
  /** a value that, when changed, throws a fresh burst */
  burstKey?: string | number;
}

/** A burst of paper. Used when money actually lands, never for decoration. */
export const Confetti = ({ count = 48, burstKey = 0 }: ConfettiProps) => {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        dur: 2.2 + Math.random() * 1.8,
        tilt: Math.round(Math.random() * 360),
        w: 5 + Math.round(Math.random() * 5),
        color: COLORS[i % COLORS.length],
      })),
    // a new burstKey means a new set of trajectories
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count, burstKey]
  );

  return (
    <div className="ob-confetti" aria-hidden="true">
      {pieces.map((c, i) => (
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
  );
};
