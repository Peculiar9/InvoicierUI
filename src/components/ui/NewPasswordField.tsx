import { useMemo, useState } from 'react';
import '@/styles/password-field.css';

interface NewPasswordFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** a server or step error to show under the field */
  error?: string;
  /** fired on Enter, so the step's primary action can run */
  onEnter?: () => void;
  autoFocus?: boolean;
  id?: string;
}

/** The four things we look for, checked live as they type. */
const RULES: { key: string; label: string; test: (v: string) => boolean }[] = [
  { key: 'len', label: '8 characters', test: (v) => v.length >= 8 },
  { key: 'alpha', label: 'A letter', test: (v) => /[a-zA-Z]/.test(v) },
  { key: 'num', label: 'A number', test: (v) => /\d/.test(v) },
  { key: 'extra', label: 'A symbol or 12+', test: (v) => /[^a-zA-Z0-9]/.test(v) || v.length >= 12 },
];

/** Warm, never scolding — the meter climbs and the words cheer it on. */
const VERDICTS = ['', 'A start', 'Getting there', 'Strong, nice', 'Ironclad'] as const;

/**
 * The password field as a welcome, not a checkpoint.
 *
 * A single secret to set, with a meter that climbs, four little checks that
 * spring shut as they're met, and a line that cheers the whole way up. The
 * point isn't to gatekeep — eight characters is all we require — it's to make
 * the first thing they hand us feel like the start of something considered.
 */
export const NewPasswordField = ({
  value,
  onChange,
  error,
  onEnter,
  autoFocus,
  id,
}: NewPasswordFieldProps) => {
  const [show, setShow] = useState(false);
  const [touched, setTouched] = useState(false);

  const passed = useMemo(() => RULES.map((r) => r.test(value)), [value]);
  const score = passed.filter(Boolean).length;
  const empty = value.length === 0;

  return (
    <div className={`pwx${empty ? '' : ' is-typed'}`} data-score={score}>
      <div className="pwx-inputwrap">
        <input
          id={id}
          className="pwx-input"
          type={show ? 'text' : 'password'}
          autoComplete="new-password"
          autoFocus={autoFocus}
          value={value}
          placeholder="Make it yours"
          onChange={(e) => {
            onChange(e.target.value);
            if (!touched) setTouched(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onEnter?.();
          }}
          aria-describedby={id ? `${id}-rules` : undefined}
          aria-invalid={Boolean(error)}
        />
        <button
          type="button"
          className="pwx-eye"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          aria-pressed={show}
          tabIndex={-1}
        >
          <i className={`bx ${show ? 'bx-hide' : 'bx-show'}`} aria-hidden="true" />
        </button>
      </div>

      <div className="pwx-meter" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`pwx-seg${i < score ? ' on' : ''}`} />
        ))}
      </div>

      <div className="pwx-verdict-row" aria-hidden="true">
        <span className="pwx-verdict">{VERDICTS[score]}</span>
      </div>

      <ul className="pwx-rules" id={id ? `${id}-rules` : undefined}>
        {RULES.map((rule, i) => (
          <li key={rule.key} className={passed[i] ? 'ok' : ''}>
            <span className="pwx-tick" aria-hidden="true">
              <i className="bx bx-check" />
            </span>
            {rule.label}
          </li>
        ))}
      </ul>

      {error && <small className="field-error pwx-error">{error}</small>}
    </div>
  );
};
