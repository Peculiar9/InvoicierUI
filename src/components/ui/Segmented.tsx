import { useLayoutEffect, useRef, useState } from 'react';

export interface SegmentedOption {
  key: string;
  label: string;
  /** how many records sit behind this segment */
  count?: number;
  /** a status colour, so the tab reads like the badge it filters to */
  tone?: string;
}

interface SegmentedProps {
  options: SegmentedOption[];
  value: string;
  onChange: (key: string) => void;
  ariaLabel: string;
  /** `pill` for filters, `underline` for page-level tabs */
  variant?: 'pill' | 'underline';
  size?: 'md' | 'sm';
}

/**
 * One control for every row of tabs in the product.
 *
 * The indicator slides between segments rather than appearing under whichever
 * one was clicked, so the eye follows the change instead of re-finding it. It
 * is measured from the live element, so it stays right when labels are
 * translated, counts appear, or the row wraps.
 *
 * Counts matter more than they look: "Overdue 3" answers the question the tab
 * exists to answer, without anyone having to click it.
 */
export const Segmented = ({
  options,
  value,
  onChange,
  ariaLabel,
  variant = 'pill',
  size = 'md',
}: SegmentedProps) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  // measure the active segment, and keep measuring when things move
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const measure = () => {
      const active = list.querySelector<HTMLElement>('[data-active="true"]');
      if (!active) {
        setIndicator(null);
        return;
      }
      setIndicator({ left: active.offsetLeft, width: active.offsetWidth });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    list.querySelectorAll('button').forEach((b) => observer.observe(b));
    // fonts land after first paint and change every width
    document.fonts?.ready.then(measure).catch(() => {});
    return () => observer.disconnect();
  }, [options, value]);

  // keep the chosen segment on screen when the row scrolls on a phone
  useLayoutEffect(() => {
    const active = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    active?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [value]);

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = options[(index + step + options.length) % options.length];
    if (next) onChange(next.key);
  };

  return (
    <div
      className={`seg seg--${variant} seg--${size}`}
      role="tablist"
      aria-label={ariaLabel}
      ref={listRef}
    >
      {indicator && (
        <span
          className="seg-indicator"
          aria-hidden="true"
          style={{ transform: `translateX(${indicator.left}px)`, width: indicator.width }}
        />
      )}
      {options.map((option, index) => (
        <button
          key={option.key}
          type="button"
          role="tab"
          aria-selected={option.key === value}
          data-active={option.key === value}
          data-tone={option.tone}
          tabIndex={option.key === value ? 0 : -1}
          className="seg-item"
          onClick={() => onChange(option.key)}
          onKeyDown={(event) => onKeyDown(event, index)}
        >
          {option.tone && <span className="seg-dot" aria-hidden="true" />}
          <span className="seg-label">{option.label}</span>
          {option.count !== undefined && <em className="seg-count">{option.count}</em>}
        </button>
      ))}
    </div>
  );
};
