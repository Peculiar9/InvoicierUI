import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

const PHONE = '(max-width: 720px)';
const onPhone = (): boolean => typeof window !== 'undefined' && window.matchMedia(PHONE).matches;

const STOPWORDS = new Set(['of', 'for', 'and', 'the', 'plc', 'ltd', 'limited']);
const normalise = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const words = (name: string): string[] => normalise(name).split(' ').filter((w) => w && !STOPWORDS.has(w));
/** "Guaranty Trust Bank" -> "gtb", "United Bank for Africa" -> "uba" */
const acronym = (name: string): string => words(name).map((w) => w[0]).join('');

/**
 * How well a bank answers what was typed: 0 the name starts with it, 1 a word
 * does, 2 it appears anywhere, 3 it is the bank's initials ("gtb", "uba",
 * "fcmb"), -1 not at all. People type the short form far more than the
 * registered name, so the initials count.
 */
const rankOf = (name: string, q: string): number => {
  const n = normalise(name);
  if (n.startsWith(q)) return 0;
  if (n.split(' ').some((w) => w.startsWith(q))) return 1;
  if (n.includes(q)) return 2;
  const a = acronym(name);
  if (a.length >= 2 && (a.startsWith(q) || (q.length >= 2 && q.startsWith(a)))) return 3;
  return -1;
};

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
  useBodyFlagWhileOpen(open);

  // Reflect the selection in the field whenever it changes and the user is not
  // mid-type (external set, or the list loading in after a saved code).
  useEffect(() => {
    if (!focused.current) setQuery(selectedName);
  }, [selectedName]);

  const filtered = useMemo(() => {
    const q = normalise(query);
    // when the field still shows the chosen bank, offer the whole list back
    const showingSelection = q === normalise(selectedName);
    if (!q || showingSelection) return banks;
    return banks
      .map((b) => ({ b, r: rankOf(b.name, q) }))
      .filter(({ r }) => r >= 0)
      .sort((x, y) => x.r - y.r || x.b.name.localeCompare(y.b.name))
      .map(({ b }) => b);
  }, [banks, query, selectedName]);

  // On a phone the list is a sheet that takes the whole screen and owns its
  // own search box at the top, so the keyboard can never cover what is being
  // typed. The form field becomes a plain trigger that shows the choice.
  const [sheet, setSheet] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const sheetInputRef = useRef<HTMLInputElement>(null);
  useBodyFlagWhileOpen(sheet);
  useEffect(() => {
    if (!sheet) return;
    // the sheet is exactly the visible part of the screen: when the keyboard
    // rises, the visual viewport shrinks and the sheet shrinks with it, so the
    // search box stays in view and the list scrolls in what is left
    const vv = window.visualViewport;
    const fit = () => {
      const el = sheetRef.current;
      if (!el) return;
      if (vv) {
        el.style.height = `${vv.height}px`;
        el.style.top = `${vv.offsetTop}px`;
      }
    };
    fit();
    vv?.addEventListener('resize', fit);
    vv?.addEventListener('scroll', fit);
    // focus after the paint, inside the tap that opened it, so the keyboard
    // rises on iOS too
    const t = window.setTimeout(() => sheetInputRef.current?.focus(), 30);
    return () => {
      vv?.removeEventListener('resize', fit);
      vv?.removeEventListener('scroll', fit);
      window.clearTimeout(t);
    };
  }, [sheet]);

  const openSheet = () => {
    setQuery('');
    setActive(0);
    setSheet(true);
  };
  const closeSheet = () => {
    setSheet(false);
    focused.current = false;
    setQuery(selectedName);
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
    setSheet(false);
    focused.current = false;
  };

  useEffect(() => {
    if (!open) return;
    setActive(0);
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if ((t as HTMLElement).closest?.('.bankpicker-menu')) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
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
          readOnly={onPhone()}
          onFocus={(e) => {
            if (onPhone()) {
              // no keyboard for the field itself; the sheet brings its own
              e.target.blur();
              openSheet();
              return;
            }
            focused.current = true;
            setOpen(true);
            e.target.select();
          }}
          onClick={() => {
            if (onPhone() && !sheet) openSheet();
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
              if (onPhone()) {
                if (sheet) closeSheet();
                else openSheet();
                return;
              }
              if (open) close();
              else inputRef.current?.focus();
            }}
          />
        )}
      </div>

      {/* Portalled to the workspace root, never left inside the field's
          <label>: in there, every tap on the sheet would activate the label,
          focus the field and reopen the sheet, and the field's own input and
          eyebrow styles would bleed into the search box and the bank names. */}
      {sheet && createPortal(
        <div
          ref={sheetRef}
          className="bankpicker-sheet"
          role="dialog"
          aria-modal="true"
          aria-label="Choose your bank"
        >
          <div className="bankpicker-sheet-head">
            <label className="bankpicker-sheet-search">
              <i className="bx bx-search" aria-hidden="true" />
              <input
                ref={sheetInputRef}
                type="text"
                value={query}
                placeholder="Type your bank's name"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                enterKeyHint="done"
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filtered[0]) {
                    e.preventDefault();
                    pick(filtered[0]);
                  }
                  if (e.key === 'Escape') closeSheet();
                }}
              />
              {query && (
                <button
                  type="button"
                  className="bankpicker-sheet-clear"
                  aria-label="Clear"
                  onClick={() => {
                    setQuery('');
                    sheetInputRef.current?.focus();
                  }}
                >
                  <i className="bx bx-x" aria-hidden="true" />
                </button>
              )}
            </label>
            <button type="button" className="bankpicker-sheet-cancel" onClick={closeSheet}>
              Cancel
            </button>
          </div>
          <div className="bankpicker-sheet-list" role="listbox">
            {loading ? (
              <div className="fs-loading">
                <span className="iw-spin" aria-hidden="true" /> Loading banks…
              </div>
            ) : filtered.length === 0 ? (
              <div className="fs-empty">
                {banks.length === 0
                  ? 'No banks available yet.'
                  : `No bank matches “${query.trim()}”. Try the short name, like GTB or UBA.`}
              </div>
            ) : (
              <>
                <span className="bankpicker-sheet-count">
                  {query.trim() ? `${filtered.length} match${filtered.length === 1 ? '' : 'es'}` : `${banks.length} banks`}
                </span>
                {filtered.map((b) => (
                  <button
                    key={b.code}
                    type="button"
                    role="option"
                    aria-selected={b.code === value}
                    className={`fs-option bank-option${b.code === value ? ' is-chosen' : ''}`}
                    onClick={() => pick(b)}
                  >
                    <BankMark name={b.name} logo={b.logo} />
                    <span className="bank-name">{b.name}</span>
                    {b.code === value && <i className="bx bx-check" aria-hidden="true" />}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>,
        rootRef.current?.closest('.iw') ?? document.body
      )}

      {open && !onPhone() && (
        <>
          <button type="button" className="filter-scrim" aria-label="Close" onClick={close} />
          <div className="fs-menu ffield-menu bankpicker-menu" role="listbox">
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
