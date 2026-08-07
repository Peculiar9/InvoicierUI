import { useEffect, useRef, useState } from 'react';
import { Overlay } from './Overlay';

export interface FilterOption {
  value: string;
  label: string;
  /** an optional right-hand figure, e.g. how many invoices a client has */
  hint?: string;
}

interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  /** shown when nothing is chosen, and as the reset row */
  placeholder: string;
  label: string;
  icon?: string;
  /**
   * Whether "no choice" is a real option. A client filter can be cleared;
   * a page size cannot, and offering an empty row there produced a bare "8"
   * sitting above "8 per page" that silently reset the list.
   */
  clearable?: boolean;
}

/**
 * A dropdown that shows when it is doing something.
 *
 * The native `<select>` looked identical whether it was filtering or not, so a
 * list could be quietly narrowed with nothing on screen saying so. This one
 * carries the brand when a value is chosen, names the field above the value,
 * and lets the choice be cleared without hunting for an "All" row.
 *
 * Keyboard: arrows move, Enter picks, Escape closes, and typing a letter jumps
 * to the next option starting with it.
 */
export const FilterSelect = ({
  value,
  onChange,
  options,
  placeholder,
  label,
  icon,
  clearable = true,
}: FilterSelectProps) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const chosen = options.find((option) => option.value === value) ?? null;

  useEffect(() => {
    if (!open) return;
    setActive(Math.max(0, options.findIndex((option) => option.value === value)));
    const onDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, options, value]);

  // keep the highlighted row in view when arrowing through a long client list
  useEffect(() => {
    if (!open) return;
    const rows = listRef.current?.querySelectorAll('.fs-option');
    rows?.[active]?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const pick = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!open) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => Math.min(i + 1, options.length - 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const option = options[active];
      if (option) pick(option.value);
      return;
    }
    if (event.key.length === 1) {
      const from = active + 1;
      const found = options.findIndex(
        (option, i) =>
          i >= from && option.label.toLowerCase().startsWith(event.key.toLowerCase())
      );
      const wrapped =
        found >= 0
          ? found
          : options.findIndex((option) =>
              option.label.toLowerCase().startsWith(event.key.toLowerCase())
            );
      if (wrapped >= 0) setActive(wrapped);
    }
  };

  return (
    <div className={`fs${chosen ? ' is-set' : ''}`} ref={wrapRef}>
      <button
        type="button"
        className="fs-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKeyDown}
      >
        {icon && <i className={`bx ${icon}`} aria-hidden="true" />}
        <span className="fs-trigger-text">
          <small>{label}</small>
          <b>{chosen ? chosen.label : placeholder}</b>
        </span>
        <i className={`bx bx-chevron-down fs-caret${open ? ' is-open' : ''}`} aria-hidden="true" />
      </button>

      {chosen && clearable && (
        <button
          type="button"
          className="fs-clear"
          aria-label={`Clear the ${label.toLowerCase()} filter`}
          onClick={() => onChange('')}
        >
          <i className="bx bx-x" />
        </button>
      )}

      {open && (
        <Overlay
          anchorRef={wrapRef}
          onClose={() => setOpen(false)}
          className="fs-menu"
          role="listbox"
          ariaLabel={label}
        >
          <div ref={listRef} className="fs-menu-inner">
          {clearable && (
            <button
              type="button"
              role="option"
              aria-selected={!chosen}
              className={`fs-option${!chosen ? ' is-chosen' : ''}`}
              onClick={() => pick('')}
            >
              <span>{placeholder}</span>
              {!chosen && <i className="bx bx-check" />}
            </button>
          )}
          {options.map((option, i) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={[
                'fs-option',
                option.value === value ? 'is-chosen' : '',
                i === active ? 'is-active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(option.value)}
            >
              <span>{option.label}</span>
              {option.hint && <em className="fs-hint">{option.hint}</em>}
              {option.value === value && <i className="bx bx-check" />}
            </button>
          ))}
          </div>
        </Overlay>
      )}
    </div>
  );
};
