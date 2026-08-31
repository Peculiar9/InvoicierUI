import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useBodyFlagWhileOpen } from '@/hooks/useBodyFlagWhileOpen';

export interface BankOption {
  name: string;
  code: string;
  /** a hosted logo, when we have one; the monogram stands in otherwise */
  logo?: string;
}

interface BankPickerProps {
  /** the selected bank code */
  value: string;
  /** the selected bank name, shown before the list loads (e.g. when editing) */
  bankName?: string;
  banks: BankOption[];
  onChange: (bank: BankOption | null) => void;
  loading?: boolean;
  invalid?: boolean;
  disabled?: boolean;
  'aria-label'?: string;
}

/** Two-letter monogram for a bank with no logo (Paystack does not ship logos). */
const initials = (name: string): string =>
  name
    .replace(/[^a-zA-Z ]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || 'B';

/** A stable hue per bank name, so each monogram reads as its own mark. */
const hueFor = (name: string): number => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
};

/**
 * A bank's mark: its hosted logo when we have one, the coloured monogram when
 * we do not (or when the image fails to load). Small enough to sit inline in a
 * row and in the field once a bank is chosen.
 */
export const BankMark = ({ name, logo }: { name: string; logo?: string }) => {
  const [failed, setFailed] = useState(false);
  if (logo && !failed) {
    return (
      <img
        className="bank-ico bank-ico--img"
        src={logo}
        alt=""
        loading="lazy"
        aria-hidden="true"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span
      className="bank-ico"
      style={{
        background: `hsl(${hueFor(name)} 72% 93%)`,
        color: `hsl(${hueFor(name)} 60% 36%)`,
      }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
};

/**
 * The bank picker: a typable field that filters the list live as you type, with
 * a monogram per bank and a loading state while the list arrives. Selecting a
 * bank hands back both its name and its code — the code resolves the account,
 * the name is what a person reads.
 */
export const BankPicker = ({
  value,
  bankName,
  banks,
  onChange,
  loading,
  invalid,
  disabled,
  'aria-label': ariaLabel,
}: BankPickerProps) => {
  const selectedBank = banks.find((b) => b.code === value);
  const selectedName = selectedBank?.name ?? bankName ?? '';
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(selectedName);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const focused = useRef(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | undefined>();
  useBodyFlagWhileOpen(open);

  // Reflect the selection in the field whenever it changes and the user is not
  // mid-type (external set, or the list loading in after a saved code).
  useEffect(() => {
    if (!focused.current) setQuery(selectedName);
  }, [selectedName]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    // when the field still shows the chosen bank, offer the whole list back
    const showingSelection = q === selectedName.trim().toLowerCase();
    const list = q && !showingSelection ? banks.filter((b) => b.name.toLowerCase().includes(q)) : banks;
    return list.slice(0, 80);
  }, [banks, query, selectedName]);

  const placeMenu = () => {
    const el = rootRef.current;
    if (!el || window.matchMedia('(max-width: 720px)').matches) {
      setMenuStyle(undefined);
      return;
    }
    const r = el.getBoundingClientRect();
    const room = window.innerHeight - r.bottom;
    const openUp = room < 300 && r.top > room;
    setMenuStyle({
      position: 'fixed',
      left: r.left,
      width: r.width,
      ...(openUp
        ? { bottom: window.innerHeight - r.top + 6, top: 'auto' }
        : { top: r.bottom + 6, bottom: 'auto' }),
    });
  };

  const close = () => {
    setOpen(false);
    focused.current = false;
    setQuery(selectedName); // drop a half-typed, unmatched query
  };

  const pick = (bank: BankOption) => {
    onChange(bank);
    setQuery(bank.name);
    setOpen(false);
    focused.current = false;
  };

  useEffect(() => {
    if (!open) return;
    setActive(0);
    placeMenu();
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if ((t as HTMLElement).closest?.('.bankpicker-menu')) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    const reflow = () => placeMenu();
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', reflow, true);
    window.addEventListener('resize', reflow);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', reflow, true);
      window.removeEventListener('resize', reflow);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) setOpen(true);
      setActive((i) => {
        const next = e.key === 'ArrowDown' ? i + 1 : i - 1;
        return Math.max(0, Math.min(filtered.length - 1, next));
      });
    }
    const hit = filtered[active];
    if (e.key === 'Enter' && open && hit) {
      e.preventDefault();
      pick(hit);
    }
  };

  return (
    <div className={`ffield bankpicker${invalid ? ' is-invalid' : ''}`} ref={rootRef}>
      <div className="bankpicker-control">
        {selectedBank && query.trim().toLowerCase() === selectedName.trim().toLowerCase() && (
          <BankMark name={selectedBank.name} logo={selectedBank.logo} />
        )}
        <input
          ref={inputRef}
          type="text"
          className="bankpicker-input"
          value={query}
          placeholder={loading ? 'Loading banks…' : 'Type to find your bank'}
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          onFocus={(e) => {
            focused.current = true;
            setOpen(true);
            e.target.select();
          }}
          onChange={(e) => {
            focused.current = true;
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
        {loading ? (
          <span className="iw-spin bankpicker-caret" aria-hidden="true" />
        ) : (
          <i
            className={`bx bx-chevron-down bankpicker-caret${open ? ' is-open' : ''}`}
            aria-hidden="true"
            onClick={() => {
              if (open) close();
              else inputRef.current?.focus();
            }}
          />
        )}
      </div>

      {open && (
        <>
          <button type="button" className="filter-scrim" aria-label="Close" onClick={close} />
          <div className="fs-menu ffield-menu bankpicker-menu" role="listbox" style={menuStyle}>
            {loading ? (
              <div className="fs-loading">
                <span className="iw-spin" aria-hidden="true" /> Loading banks…
              </div>
            ) : filtered.length === 0 ? (
              <div className="fs-empty">
                {banks.length === 0 ? 'No banks available yet.' : `No banks match “${query.trim()}”.`}
              </div>
            ) : (
              filtered.map((b, i) => (
                <button
                  key={b.code}
                  type="button"
                  role="option"
                  aria-selected={b.code === value}
                  className={`fs-option bank-option${b.code === value ? ' is-chosen' : ''}${i === active ? ' is-active' : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(b)}
                >
                  <BankMark name={b.name} logo={b.logo} />
                  <span className="bank-name">{b.name}</span>
                  {b.code === value && <i className="bx bx-check" aria-hidden="true" />}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};
