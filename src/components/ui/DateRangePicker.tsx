import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { EMPTY_RANGE, rangeIsSet } from '@/utils/dateRange';
import type { DateRangeValue } from '@/utils/dateRange';
import {
  RANGE_PRESETS,
  describeRange,
  matchPreset,
  monthGrid,
  prettyDay,
} from '@/utils/dateRangePresets';
import { toLocalDay } from '@/utils/day';

interface DateRangePickerProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  /** which date is being filtered, e.g. "Issued" */
  label?: string;
  align?: 'left' | 'right';
  /** what an unset range is called: "Any time" on a list, "All time" here */
  emptyLabel?: string;
}

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * Picking a period, without a browser date input in sight.
 *
 * The native control was showing `mm/dd/yyyy` to Nigerian users with the OS's
 * own calendar chrome, in a product that is otherwise entirely ours. This puts
 * the six periods people actually ask for one tap away, and keeps a real
 * calendar behind them for the times a specific fortnight is the question.
 *
 * The trigger says what is chosen in words: "This month" reads instantly where
 * "Aug 1 – Aug 31" makes you do the arithmetic yourself.
 */
export const DateRangePicker = ({
  value,
  onChange,
  label = 'Dates',
  align = 'left',
  emptyLabel = 'Any time',
}: DateRangePickerProps) => {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => new Date());
  // the half-made range while someone is picking two ends
  const [picking, setPicking] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const isSet = rangeIsSet(value);
  const activePreset = matchPreset(value);
  const today = toLocalDay(new Date());

  // open where the range already is, not on whatever month it is now
  useEffect(() => {
    if (!open) return;
    const anchor = value.from || value.to;
    if (anchor) {
      const [y, m] = anchor.split('-').map(Number);
      setCursor(new Date(y, m - 1, 1));
    }
    setPicking(null);
    setHovered(null);
  }, [open, value.from, value.to]);

  // close on an outside click or Escape, the way every other overlay here does
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  // never let the panel hang off the right edge of a narrow window
  useLayoutEffect(() => {
    if (!open || !panelRef.current) return;
    const panel = panelRef.current;
    panel.style.removeProperty('--nudge');
    const box = panel.getBoundingClientRect();
    const overflow = box.right - (window.innerWidth - 12);
    if (overflow > 0) panel.style.setProperty('--nudge', `${-overflow}px`);
  }, [open]);

  const commit = (next: DateRangeValue) => {
    onChange(next);
    setOpen(false);
  };

  const pickDay = (day: string) => {
    if (!picking) {
      setPicking(day);
      return;
    }
    // second click closes the range, in whichever order they were clicked
    const [from, to] = picking <= day ? [picking, day] : [day, picking];
    setPicking(null);
    commit({ from, to });
  };

  /** Highlighting while the second end is still being chosen. */
  const inPreview = (day: string): boolean => {
    if (picking && hovered) {
      const [a, b] = picking <= hovered ? [picking, hovered] : [hovered, picking];
      return day >= a && day <= b;
    }
    if (!picking && value.from && value.to) return day >= value.from && day <= value.to;
    return false;
  };

  const isEnd = (day: string): boolean =>
    day === picking || day === value.from || day === value.to;

  const cells = monthGrid(cursor.getFullYear(), cursor.getMonth());
  const monthLabel = cursor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <div className={`dr${isSet ? ' is-set' : ''}`} ref={wrapRef}>
      <button
        type="button"
        className="dr-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <i className="bx bx-calendar" aria-hidden="true" />
        <span className="dr-trigger-text">
          <small>{label}</small>
          <b>{describeRange(value, emptyLabel)}</b>
        </span>
        <i className={`bx bx-chevron-down dr-caret${open ? ' is-open' : ''}`} aria-hidden="true" />
      </button>

      {isSet && (
        <button
          type="button"
          className="dr-clear"
          aria-label={`Clear the ${label.toLowerCase()} filter`}
          onClick={() => onChange(EMPTY_RANGE)}
        >
          <i className="bx bx-x" />
        </button>
      )}

      {open && (
        <>
          <button
            type="button"
            className="filter-scrim"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <div className="dr-panel" role="dialog" aria-label={`${label} range`} ref={panelRef} data-align={align}>
          <div className="dr-presets">
            {RANGE_PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                className={`dr-preset${activePreset?.key === preset.key ? ' is-active' : ''}`}
                onClick={() => commit(preset.build())}
              >
                {preset.label}
              </button>
            ))}
            <button
              type="button"
              className={`dr-preset dr-preset--any${!isSet ? ' is-active' : ''}`}
              onClick={() => commit(EMPTY_RANGE)}
            >
              {emptyLabel}
            </button>
          </div>

          <div className="dr-cal">
            <div className="dr-cal-head">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              >
                <i className="bx bx-chevron-left" />
              </button>
              <b>{monthLabel}</b>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              >
                <i className="bx bx-chevron-right" />
              </button>
            </div>

            <div className="dr-cal-week" aria-hidden="true">
              {WEEKDAYS.map((day, i) => (
                <span key={`${day}-${i}`}>{day}</span>
              ))}
            </div>

            <div className="dr-cal-grid" onMouseLeave={() => setHovered(null)}>
              {cells.map((day, i) =>
                day === null ? (
                  <span key={`pad-${i}`} className="dr-day is-pad" />
                ) : (
                  <button
                    key={day}
                    type="button"
                    className={[
                      'dr-day',
                      inPreview(day) ? 'in-range' : '',
                      isEnd(day) ? 'is-end' : '',
                      day === today ? 'is-today' : '',
                      day > today ? 'is-future' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onMouseEnter={() => setHovered(day)}
                    onClick={() => pickDay(day)}
                  >
                    {Number(day.slice(-2))}
                  </button>
                )
              )}
            </div>

            <div className="dr-foot">
              <span className="dr-foot-read">
                {picking
                  ? `${prettyDay(picking)} — pick the other end`
                  : describeRange(value, 'No dates chosen')}
              </span>
              <button type="button" className="dr-foot-clear" onClick={() => commit(EMPTY_RANGE)}>
                Clear
              </button>
            </div>
          </div>
        </div>
          </>
      )}
    </div>
  );
};
