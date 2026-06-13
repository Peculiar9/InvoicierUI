import { useEffect, useRef, useState } from 'react';

interface TypewriterProps {
  words: string[];
  typingSpeed?: number;
  deletingSpeed?: number;
  pause?: number;
}

/**
 * Types one word at a time, pauses, deletes it, then advances to the next,
 * looping forever. Used in the hero to cycle through the ways an invoice can
 * get paid. Collapses to the first word when reduced motion is requested.
 */
export const Typewriter = ({
  words,
  typingSpeed = 95,
  deletingSpeed = 45,
  pause = 1500,
}: TypewriterProps) => {
  const reducedMotion = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const [index, setIndex] = useState(0);
  const [count, setCount] = useState(0);
  const [deleting, setDeleting] = useState(false);

  const current = words[index % words.length] ?? '';

  useEffect(() => {
    if (reducedMotion.current) return;

    if (!deleting && count === current.length) {
      const timer = setTimeout(() => setDeleting(true), pause);
      return () => clearTimeout(timer);
    }

    if (deleting && count === 0) {
      setDeleting(false);
      setIndex((i) => (i + 1) % words.length);
      return;
    }

    const timer = setTimeout(
      () => setCount((c) => c + (deleting ? -1 : 1)),
      deleting ? deletingSpeed : typingSpeed
    );
    return () => clearTimeout(timer);
  }, [count, deleting, current, words.length, pause, typingSpeed, deletingSpeed]);

  const shown = reducedMotion.current ? current : current.slice(0, count);

  return (
    <span className="type-wrap" aria-live="polite">
      <span className="type-word">{shown}</span>
      <span className="type-caret" aria-hidden="true" />
    </span>
  );
};
