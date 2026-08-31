import { useEffect, useRef, useState } from 'react';
import { monthGrid, prettyDay } from '@/utils/dateRangePresets';
import { toLocalDay } from '@/utils/day';
import { useBodyFlagWhileOpen } from '@/hooks/useBodyFlagWhileOpen';

interface DateFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** past days are usually fine for issue dates; block them for due dates */
  min?: string;
  invalid?: boolean;
  'aria-label'?: string;
}

/**
 * One date, picked from the same calendar the list filters use, not the
 * browser's native widget, which matches nothing else on the page. The
 * trigger reads like a field ("Mon, 25 Aug"); the panel is the dr calendar.
 */
export const DateField = ({ value, onChange, min, invalid, 'aria-label': ariaLabel }: DateFieldProps) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useBodyFlagWhileOpen(open);
  const today = toLocalDay(new Date());
  const seed = value || today;
  const [view, setView] = useState({
    year: Number(seed.slice(0, 4)),
    month: Number(seed.slice(5, 7)) - 1,
  });

  useEffect(() => {
    if (!open) return;
    const key = value || today;
    setView({ year: Number(key.slice(0, 4)), month: Number(key.slice(5, 7)) - 1 });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const grid = monthGrid(view.year, view.month);
  const monthName = new Date(view.year, view.month, 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="ffield" ref={rootRef}>
      <button
        type="button"
        className={`ffield-trigger${invalid ? ' is-invalid' : ''}${value ? ' has-value' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
      >
        <i className="bx bx-calendar" aria-hidden="true" />
        <span className="ffield-text">{value ? prettyDay(value) : 'Pick a date'}</span>
        <i className={`bx bx-chevron-down ffield-caret${open ? ' is-open' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="filter-scrim"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <div className="fs-menu ffield-menu ffield-menu--cal" role="dialog" aria-label="Pick a date">
            <div className="dr-cal-head">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() =>
                  setView((v) =>
                    v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 }
                  )
                }
              >
                <i className="bx bx-chevron-left" />
              </button>
              <b>{monthName}</b>
              <button
                type="button"
                aria-label="Next month"
                onClick={() =>
                  setView((v) =>
                    v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 }
                  )
                }
              >
                <i className="bx bx-chevron-right" />
              </button>
            </div>
            <div className="dr-cal-week">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
            <div className="dr-cal-grid">
              {grid.map((key, i) =>
                key === null ? (
                  <span key={`pad-${i}`} className="dr-day is-pad" />
                ) : (
                  <button
                    key={key}
                    type="button"
                    className={[
                      'dr-day',
                      key === value ? 'is-end' : '',
                      key === today ? 'is-today' : '',
                      min && key < min ? 'is-future' : '',
                    ].filter(Boolean).join(' ')}
                    disabled={Boolean(min && key < min)}
                    onClick={() => {
                      onChange(key);
                      setOpen(false);
                    }}
                  >
                    {Number(key.slice(-2))}
                  </button>
                )
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
