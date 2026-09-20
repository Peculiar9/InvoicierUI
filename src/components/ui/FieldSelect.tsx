import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
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
  /** a long list: a search box on top of the menu, and on a phone the list
      takes the whole screen with the search pinned where the keyboard
      cannot reach it */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** what to say when there are no options at all (the placeholder row aside) */
  emptyHint?: string;
}

const PHONE = '(max-width: 720px)';
const onPhone = (): boolean => typeof window !== 'undefined' && window.matchMedia(PHONE).matches;
const normalise = (s: string): string => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
/** 0 label starts with it, 1 a word does, 2 it appears anywhere, -1 no */
const rankOf = (label: string, q: string): number => {
  const n = normalise(label);
  if (n.startsWith(q)) return 0;
  if (n.split(' ').some((w) => w.startsWith(q))) return 1;
  if (n.includes(q)) return 2;
  return -1;
};

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
  searchable,
  searchPlaceholder,
  emptyHint,
}: FieldSelectProps) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  // a searchable list on a phone is a full-screen sheet, not a bottom sheet
  const [sheet, setSheet] = useState(false);
  useBodyFlagWhileOpen(sheet);
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
  // the search only earns its place once there is something to search
  const hasSearch = Boolean(searchable) && options.length > 0;
  const shown = useMemo(() => {
    const q = normalise(query);
    if (!hasSearch || !q) return rows;
    const keep = rows
      .filter((o) => o.value !== '')
      .map((o) => ({ o, r: rankOf(o.label, q) }))
      .filter(({ r }) => r >= 0)
      .sort((x, y) => x.r - y.r || x.o.label.localeCompare(y.o.label))
      .map(({ o }) => o);
    // the "nothing chosen" row always stays reachable
    const blank = rows.find((o) => o.value === '');
    return blank ? [blank, ...keep] : keep;
  }, [rows, query, hasSearch]);

  useEffect(() => {
    if (!sheet) return;
    // the sheet is exactly the visible screen: the keyboard shrinks it, so
    // the search box stays in view and the list scrolls in what is left
    const vv = window.visualViewport;
    const fit = () => {
      const el = sheetRef.current;
      if (!el || !vv) return;
      el.style.height = `${vv.height}px`;
      el.style.top = `${vv.offsetTop}px`;
    };
    fit();
    vv?.addEventListener('resize', fit);
    vv?.addEventListener('scroll', fit);
    const t = window.setTimeout(() => searchRef.current?.focus(), 30);
    return () => {
      vv?.removeEventListener('resize', fit);
      vv?.removeEventListener('scroll', fit);
      window.clearTimeout(t);
    };
  }, [sheet]);

  useEffect(() => {
    if (!open) return;
    const index = rows.findIndex((option) => option.value === value);
    setActive(index < 0 ? 0 : index);
    setQuery('');
    placeMenu();
    if (hasSearch) window.setTimeout(() => searchRef.current?.focus(), 30);
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
    setSheet(false);
    setQuery('');
  };

  const toggle = () => {
    if (hasSearch && onPhone()) {
      setQuery('');
      setSheet((s) => !s);
      return;
    }
    setOpen((o) => !o);
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
        return Math.max(0, Math.min(shown.length - 1, next));
      });
    }
    if (e.key === 'Enter' && open) {
      e.preventDefault();
      pick(shown[active]?.value ?? '');
    }
  };

  const optionRow = (option: FieldOption, index: number) => (
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
  );
  const noMatch = hasSearch && query.trim() && shown.filter((o) => o.value !== '').length === 0;

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
        onClick={toggle}
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
            {hasSearch && (
              <label className="fs-search">
                <i className="bx bx-search" aria-hidden="true" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  placeholder={searchPlaceholder ?? 'Search'}
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActive(0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') onTriggerKey(e);
                  }}
                />
              </label>
            )}
            {shown.map((option, index) => optionRow(option, index))}
            {noMatch && <div className="fs-empty">Nothing matches “{query.trim()}”.</div>}
            {options.length === 0 && emptyHint && <div className="fs-empty fs-empty--hint">{emptyHint}</div>}
          </div>
        </>
      )}

      {/* the phone: a full-screen sheet with its own search, portalled out of
          any <label> so a tap on it never re-activates the field */}
      {sheet && createPortal(
        <div ref={sheetRef} className="pick-sheet" role="dialog" aria-modal="true" aria-label={ariaLabel}>
          <div className="pick-sheet-head">
            <label className="pick-sheet-search">
              <i className="bx bx-search" aria-hidden="true" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                placeholder={searchPlaceholder ?? 'Search'}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                enterKeyHint="done"
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  const first = shown.find((o) => o.value !== '') ?? shown[0];
                  if (e.key === 'Enter' && first) {
                    e.preventDefault();
                    pick(first.value);
                  }
                  if (e.key === 'Escape') setSheet(false);
                }}
              />
              {query && (
                <button
                  type="button"
                  className="pick-sheet-clear"
                  aria-label="Clear"
                  onClick={() => {
                    setQuery('');
                    searchRef.current?.focus();
                  }}
                >
                  <i className="bx bx-x" aria-hidden="true" />
                </button>
              )}
            </label>
            <button type="button" className="pick-sheet-cancel" onClick={() => setSheet(false)}>
              Cancel
            </button>
          </div>
          <div className="pick-sheet-list" role="listbox">
            {shown.map((option, index) => optionRow(option, index))}
            {noMatch && <div className="fs-empty">Nothing matches “{query.trim()}”.</div>}
            {options.length === 0 && emptyHint && <div className="fs-empty fs-empty--hint">{emptyHint}</div>}
          </div>
        </div>,
        rootRef.current?.closest('.iw, .ob') ?? document.body
      )}
    </div>
  );
};
