import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useBodyFlagWhileOpen } from '@/hooks/useBodyFlagWhileOpen';

export interface FieldOption {
  value: string;
  label: string;
  hint?: string;
}

interface FieldSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: FieldOption[];
  /** the row shown for "nothing chosen"; pass '' as its value */
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  'aria-label'?: string;
}

/**
 * The form cousin of FilterSelect: a field-shaped trigger that opens the
 * same menu the filters use, same options, same keyboard, same bottom
 * sheet on small screens. Native selects render the OS's menu; this one
 * renders ours.
 */
export const FieldSelect = ({
  value,
  onChange,
  options,
  placeholder,
  invalid,
  disabled,
  'aria-label': ariaLabel,
}: FieldSelectProps) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // desktop only: pin the menu to the trigger with position:fixed so it floats
  // over the panel's scroll container instead of being clipped by its overflow.
  // On phones (<=720px) the stylesheet turns the menu into a bottom sheet, so we
  // leave the style off and let CSS own it.
  const [menuStyle, setMenuStyle] = useState<CSSProperties | undefined>();

  // let floating action rails duck while this menu is open
  useBodyFlagWhileOpen(open);

  const placeMenu = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    if (window.matchMedia('(max-width: 720px)').matches) {
      setMenuStyle(undefined); // CSS bottom sheet takes over
      return;
    }
    const r = trigger.getBoundingClientRect();
    const room = window.innerHeight - r.bottom;
    const openUp = room < 260 && r.top > room; // flip above when there's no room below
    setMenuStyle({
      position: 'fixed',
      left: r.left,
      minWidth: r.width,
      ...(openUp
        ? { bottom: window.innerHeight - r.top + 6, top: 'auto' }
        : { top: r.bottom + 6, bottom: 'auto' }),
    });
  };

  const rows: FieldOption[] = placeholder !== undefined
    ? [{ value: '', label: placeholder }, ...options]
    : options;
  const chosen = rows.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const index = rows.findIndex((option) => option.value === value);
    setActive(index < 0 ? 0 : index);
    placeMenu();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onDown = (e: PointerEvent) => {
      // the fixed menu is not inside rootRef, so also spare clicks landing in it
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if ((t as HTMLElement).closest?.('.fs-menu')) return;
      setOpen(false);
    };
    // the menu is pinned to the trigger; follow it as the panel scrolls/resizes
    const reflow = () => placeMenu();
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('scroll', reflow, true);
    window.addEventListener('resize', reflow);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
      window.removeEventListener('scroll', reflow, true);
      window.removeEventListener('resize', reflow);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const pick = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  const onTriggerKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setActive((i) => {
        const next = e.key === 'ArrowDown' ? i + 1 : i - 1;
        return Math.max(0, Math.min(rows.length - 1, next));
      });
    }
    if (e.key === 'Enter' && open) {
      e.preventDefault();
      pick(rows[active]?.value ?? '');
    }
  };

  return (
    <div className="ffield" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`ffield-trigger${invalid ? ' is-invalid' : ''}${value ? ' has-value' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onTriggerKey}
      >
        <span className="ffield-text">{chosen?.label ?? placeholder ?? 'Choose…'}</span>
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
          <div className="fs-menu ffield-menu" role="listbox" style={menuStyle}>
            {rows.map((option, index) => (
              <button
                key={option.value || '∅'}
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={`fs-option${option.value === value ? ' is-chosen' : ''}${index === active ? ' is-active' : ''}`}
                onMouseEnter={() => setActive(index)}
                onClick={() => pick(option.value)}
              >
                {option.label}
                {option.hint && <span className="fs-hint">{option.hint}</span>}
                {option.value === value && <i className="bx bx-check" aria-hidden="true" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
