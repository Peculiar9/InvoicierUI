import { useEffect, useMemo, useRef, useState } from 'react';
import { useSaveBusinessProfile, useSignup } from '@/hooks';
import type { ChangeEvent, CSSProperties } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { TemplatePicker } from '@/components/TemplatePicker';
import { NewPasswordField } from '@/components/ui/NewPasswordField';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import type { InvoiceTemplate, Persona } from '@/stores/settingsStore';

/**
 * The welcome journey: three small steps and a stamp. Collects only what the
 * first invoice needs (a name, a face, two tax answers) and hands everything
 * else to the moment it is actually needed.
 */

const PERSONAS: { key: Persona; icon: string; title: string; line: string }[] = [
  { key: 'freelancer', icon: 'bx-user', title: 'The Freelancer', line: 'I am the product.' },
  { key: 'studio', icon: 'bx-group', title: 'The Studio', line: 'We ship together.' },
  { key: 'specialist', icon: 'bx-diamond', title: 'The Specialist', line: 'One craft, mastered.' },
  { key: 'collector', icon: 'bx-coin-stack', title: 'The Collector', line: 'Money finds me.' },
];

const SWATCHES = ['#924ee9', '#1d1b2e', '#ff5a5f', '#0c8d6f', '#357fff', '#b97d10'];
const CONFETTI_COLORS = ['#924ee9', '#ff5a5f', '#0c8d6f', '#e0a008', '#357fff'];

/* the pause that loads templates and sets the table */
const PREP_MSGS = [
  'Preparing your workspace',
  'Hanging your logo on the wall',
  'Pressing your invoice paper',
  'Warming up the ledger',
  'Unlocking the front door',
];
const PREP_MS = 3400;

export const Welcome = () => {
  const navigate = useNavigate();
  const { mutate: saveProfile } = useSaveBusinessProfile();
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding);
  const accountEmail = useAuthStore((s) => s.user?.email);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { mutate: signup, isPending: creating } = useSignup();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [tradingName, setTradingName] = useState('');
  const [email, setEmail] = useState(() => useAuthStore.getState().user?.email ?? '');
  const [emailError, setEmailError] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [wantsPassword, setWantsPassword] = useState(false);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [logo, setLogo] = useState<string | undefined>(undefined);
  const [color, setColor] = useState('#924ee9');
  const [vat, setVat] = useState(true);
  const [wht, setWht] = useState(false);
  const [currency, setCurrency] = useState('NGN');
  const [tin, setTin] = useState('');
  const [template, setTemplate] = useState<InvoiceTemplate>('classic');
  const [prepping, setPrepping] = useState(false);
  const [prepIdx, setPrepIdx] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // one burst per mount; each piece gets its own fall
  const confetti = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 1.1,
        dur: 2.6 + Math.random() * 2.2,
        tilt: Math.round(Math.random() * 360),
        w: 6 + Math.round(Math.random() * 5),
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      })),
    []
  );

  const displayName = tradingName.trim() || name.trim() || 'Your name here';
  const first_name = name.trim().split(' ')[0] || 'friend';

  /**
   * The one step that is not a question: the address plus a password, which
   * is the moment the account actually comes into being. Everything after it
   * is saved to a real account rather than held in the browser and hoped for.
   *
   * Someone already signed in (they came back to finish) just walks past it.
   */
  const goFromCredentials = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('We need a working address to send invoices from');
      return;
    }
    if (isAuthenticated) {
      setStep(3);
      return;
    }
    // Password is optional now: they can start email-only and set one later.
    // Only when they've chosen to set one here do we hold them to a length.
    if (wantsPassword && password.length < 8) {
      setPasswordError('Eight characters or more, so nobody else gets in');
      return;
    }
    signup(
      {
        full_name: name.trim(),
        email: email.trim(),
        password: wantsPassword && password ? password : undefined,
      },
      {
        onSuccess: () => setStep(3),
        onError: (error: unknown) => {
          const message =
            error instanceof Error ? error.message : 'That did not work. Give it another go.';
          // an address already in use is the common case, so say so where the
          // address is, not in a banner the eye has already left
          setEmailError(message);
        },
      }
    );
  };
  const monogram = (displayName.charAt(0) || 'i').toUpperCase();

  const onLogoPick = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogo(String(reader.result));
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!prepping) return;
    const timer = setInterval(
      () => setPrepIdx((i) => Math.min(i + 1, PREP_MSGS.length - 1)),
      Math.floor(PREP_MS / PREP_MSGS.length)
    );
    const done = setTimeout(() => navigate({ to: '/dashboard' }), PREP_MS);
    return () => {
      clearInterval(timer);
      clearTimeout(done);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prepping]);

  const finish = () => {
    // Local first, so the workspace behind the loader already looks like
    // theirs: brand colour, logo and persona are this browser's business.
    completeOnboarding({
      name: displayName,
      logo,
      brandColor: color,
      persona: persona ?? undefined,
      vatRegistered: vat,
      whtUsual: wht,
      email: email.trim(),
      template,
      currency,
      tin: tin.trim() || undefined,
    });

    // Then the account's own record, which is what a second device and every
    // invoice document read from. Fire it alongside the loader rather than
    // before it: the save and the three-second preparation overlap instead of
    // queueing, so nobody waits for a round trip they cannot see.
    saveProfile({
      business_name: displayName,
      email: email.trim() || undefined,
      logo_url: logo || undefined,
      default_currency: currency,
      invoice_template: template,
    });

    setPrepping(true);
  };

  return (
    <div className="ob iw">
      {step === 7 && (
        <div className="ob-confetti" aria-hidden="true">
          {confetti.map((c, i) => (
            <span
              key={i}
              style={{
                left: `${c.left}%`,
                width: c.w,
                height: c.w * 1.6,
                background: c.color,
                animationDelay: `${c.delay}s`,
                animationDuration: `${c.dur}s`,
                rotate: `${c.tilt}deg`,
              }}
            />
          ))}
        </div>
      )}
      {prepping && (
        <div className="prep" role="status" aria-live="polite">
          <div className="prep-core" aria-hidden="true">
            <span className="prep-word">
              {'invoicier'.split('').map((c, i) => (
                <span key={i} className="prep-ltr" style={{ '--i': i } as CSSProperties}>
                  {c}
                </span>
              ))}
            </span>
            <span className="prep-dotwrap">
              <span className="prep-ring" />
              <span className="prep-ring" />
              <span className="prep-ring" />
              <span className="prep-dot" />
            </span>
          </div>
          <p className="prep-msg" key={prepIdx}>
            {PREP_MSGS[prepIdx]}
          </p>
          <span className="prep-bar" aria-hidden="true">
            <span />
          </span>
        </div>
      )}
      <div className="ob-card">
        <div className="ob-progress" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <span key={i} className={step >= i ? 'on' : ''} />
          ))}
        </div>

        {/* ------------------------------------------- step 1: your name */}
        {step === 0 && (
          <div className="ob-step">
            <span className="ob-kicker">First things first</span>
            <h1>What should the money call you?</h1>
            <p>The name that chases invoices and collects the thanks.</p>
            {!isAuthenticated && (
              <p className="ob-aside ob-aside--pre">
                Before you continue, been here before?{' '}
                <a href="/login">Sign in instead</a>.
              </p>
            )}
            <label className="cinv-field">
              <span>Your name</span>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ada Obi"
                onKeyDown={(e) => e.key === 'Enter' && name.trim() && setStep(1)}
              />
            </label>
            <div className="ob-nav">
              <span />
              <button
                type="button"
                className="iw-btn"
                disabled={!name.trim()}
                onClick={() => setStep(1)}
              >
                That's me <i className="bx bx-right-arrow-alt" />
              </button>
            </div>
          </div>
        )}

        {/* -------------------------------------- step 2: the trading name */}
        {step === 1 && (
          <div className="ob-step">
            <span className="ob-kicker">Nice to meet you, {first_name}</span>
            <h1>Does your invoice wear a different name?</h1>
            <p>
              If you trade under a brand, it goes on the letterhead. If it is
              just you, walk right past this one.
            </p>
            <label className="cinv-field">
              <span>Trading name</span>
              <input
                autoFocus
                value={tradingName}
                onChange={(e) => setTradingName(e.target.value)}
                placeholder="Ada Studio, Obi & Co, anything you answer to"
                onKeyDown={(e) => e.key === 'Enter' && setStep(2)}
              />
            </label>
            <div className="ob-nav">
              <button type="button" className="ob-back" onClick={() => setStep(0)}>
                <i className="bx bx-left-arrow-alt" /> Back
              </button>
              <button type="button" className="iw-btn" onClick={() => setStep(2)}>
                {tradingName.trim() ? 'That is the name' : 'It is just me'}{' '}
                <i className="bx bx-right-arrow-alt" />
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------ step 3: the address */}
        {step === 2 && (
          <div className="ob-step">
            <span className="ob-kicker">One detail that matters</span>
            <h1>Where should the money talk happen?</h1>
            <p>
              This is the address your invoices go out from and the one your
              clients hit reply to.
            </p>
            <label className="cinv-field">
              <span>Email</span>
              <input
                type="email"
                autoFocus
                autoComplete="email"
                value={email}
                className={emailError ? 'is-invalid' : ''}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError('');
                }}
                placeholder="you@yourbusiness.com"
                onKeyDown={(e) => e.key === 'Enter' && goFromCredentials()}
              />
              {emailError && <small className="field-error">{emailError}</small>}
            </label>

            {!isAuthenticated && !wantsPassword && (
              <div className="ob-passhint">
                <button
                  type="button"
                  className="ob-passtoggle"
                  onClick={() => setWantsPassword(true)}
                >
                  Set a password now
                </button>
                <span className="ob-passhint-or">or just continue</span>
              </div>
            )}

            {!isAuthenticated && wantsPassword && (
              <div className="ob-passblock">
                <div className="ob-passblock-head">
                  <span>Your password</span>
                  <button
                    type="button"
                    className="ob-passtoggle"
                    onClick={() => {
                      setWantsPassword(false);
                      setPassword('');
                      setPasswordError('');
                    }}
                  >
                    I'll just use email
                  </button>
                </div>
                <NewPasswordField
                  value={password}
                  onChange={(v) => {
                    setPassword(v);
                    setPasswordError('');
                  }}
                  error={passwordError}
                  onEnter={goFromCredentials}
                  autoFocus
                />
              </div>
            )}

            <div className="ob-nav">
              <button type="button" className="ob-back" onClick={() => setStep(1)}>
                <i className="bx bx-left-arrow-alt" /> Back
              </button>
              <button
                type="button"
                className="iw-btn"
                onClick={goFromCredentials}
                disabled={creating}
              >
                {creating
                  ? 'Setting you up…'
                  : wantsPassword
                    ? 'Create my account'
                    : 'Continue'}{' '}
                <i className="bx bx-right-arrow-alt" />
              </button>
            </div>
          </div>
        )}

        {/* --------------------------------------------- step 3: the hat */}
        {step === 3 && (
          <div className="ob-step">
            <span className="ob-kicker">Getting to know you</span>
            <h1>Which hat fits, {first_name}?</h1>
            <p>No wrong answers. We just set the tone.</p>
            <div className="ob-personas">
              {PERSONAS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  className={persona === p.key ? 'active' : ''}
                  onClick={() => setPersona(p.key)}
                >
                  <i className={`bx ${p.icon}`} />
                  <b>{p.title}</b>
                  <small>{p.line}</small>
                </button>
              ))}
            </div>
            <div className="ob-nav">
              <button type="button" className="ob-back" onClick={() => setStep(2)}>
                <i className="bx bx-left-arrow-alt" /> Back
              </button>
              <button type="button" className="iw-btn" onClick={() => setStep(4)}>
                {persona ? 'Wears well' : 'No hat today'}{' '}
                <i className="bx bx-right-arrow-alt" />
              </button>
            </div>
          </div>
        )}

        {/* --------------------------------------------- step 2: the brand */}
        {step === 4 && (
          <div className="ob-step">
            <span className="ob-kicker">Make it yours</span>
            <h1>Dress your invoice.</h1>
            <p>
              Your clients will see this on every invoice and receipt. A logo if
              you have one, our mark if you don't. Either way it looks sharp.
            </p>
            <div className="ob-brand">
              <div className="ob-brand-controls">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={onLogoPick}
                />
                <button
                  type="button"
                  className="iw-btn iw-btn--ghost"
                  onClick={() => fileRef.current?.click()}
                >
                  <i className="bx bx-image-add" /> {logo ? 'Change logo' : 'Upload a logo'}
                </button>
                {logo && (
                  <button type="button" className="ob-clear" onClick={() => setLogo(undefined)}>
                    Use the default mark instead
                  </button>
                )}
                <p className="ob-ask">Pick your color</p>
                <div className="ob-swatches">
                  {SWATCHES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={color === c ? 'active' : ''}
                      style={{ background: c }}
                      aria-label={`Brand color ${c}`}
                      onClick={() => setColor(c)}
                    />
                  ))}
                  <label className="ob-swatch-custom" aria-label="Custom color">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                    />
                    <i className="bx bx-palette" />
                  </label>
                </div>
              </div>
              {/* the souvenir: their invoice, forming live */}
              <div className="ob-preview" style={{ '--acc': color } as CSSProperties}>
                <div className="ob-preview-top">
                  {logo ? (
                    <img src={logo} alt="" />
                  ) : (
                    <span className="ob-preview-mono">{monogram}</span>
                  )}
                  <div>
                    <b>{displayName}</b>
                    <small>INVOICE · No 001</small>
                  </div>
                </div>
                <span className="ob-preview-rule" />
                <span className="ob-preview-line" style={{ width: '82%' }} />
                <span className="ob-preview-line" style={{ width: '64%' }} />
                <span className="ob-preview-line" style={{ width: '71%' }} />
                <div className="ob-preview-total">
                  <small>Total</small>
                  <b>₦3,816,250</b>
                </div>
              </div>
            </div>
            <div className="ob-nav">
              <button type="button" className="ob-back" onClick={() => setStep(3)}>
                <i className="bx bx-left-arrow-alt" /> Back
              </button>
              <button type="button" className="iw-btn" onClick={() => setStep(5)}>
                Next <i className="bx bx-right-arrow-alt" />
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------ step 5: pick the paper */}
        {step === 5 && (
          <div className="ob-step">
            <span className="ob-kicker">Pick your paper</span>
            <h1>Which one should your clients open?</h1>
            <p>
              Same brand, three personalities. This is exactly what the invoice
              looks like, and you can change it anytime in settings.
            </p>
            <TemplatePicker
              value={template}
              onChange={setTemplate}
              brand={{ name: displayName, color, logo }}
            />
            <div className="ob-nav">
              <button type="button" className="ob-back" onClick={() => setStep(4)}>
                <i className="bx bx-left-arrow-alt" /> Back
              </button>
              <button type="button" className="iw-btn" onClick={() => setStep(6)}>
                That is the one <i className="bx bx-right-arrow-alt" />
              </button>
            </div>
          </div>
        )}

        {/* ----------------------------------------------- step 3: the tax */}
        {step === 6 && (
          <div className="ob-step">
            <span className="ob-kicker">The boring part, kept short</span>
            <h1>Two questions now, zero questions in March.</h1>
            <p>These just set your defaults. Every invoice can still differ.</p>
            <div className="iw-toggles ob-toggles">
              <label className="iw-toggle">
                <input type="checkbox" checked={vat} onChange={(e) => setVat(e.target.checked)} />
                <span className="knob" aria-hidden="true" />
                I charge VAT
                <small>7.5%, invoice level</small>
              </label>
              <label className="iw-toggle">
                <input type="checkbox" checked={wht} onChange={(e) => setWht(e.target.checked)} />
                <span className="knob" aria-hidden="true" />
                Clients usually withhold WHT
                <small>we save the credits</small>
              </label>
            </div>
            <div className="ob-row">
              <label className="cinv-field">
                <span>Default currency</span>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  <option value="NGN">NGN, paid via Paystack</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </label>
              <label className="cinv-field">
                <span>TIN, if you have it handy</span>
                <input
                  value={tin}
                  onChange={(e) => setTin(e.target.value)}
                  placeholder="Add later, needed for filing"
                />
              </label>
            </div>
            <div className="ob-nav">
              <button type="button" className="ob-back" onClick={() => setStep(5)}>
                <i className="bx bx-left-arrow-alt" /> Back
              </button>
              <button type="button" className="iw-btn" onClick={() => setStep(7)}>
                Almost there <i className="bx bx-right-arrow-alt" />
              </button>
            </div>
          </div>
        )}

        {/* --------------------------------------------------- the stamp */}
        {step === 7 && (
          <div className="ob-step ob-step--done">
            <div className="ob-stamp-wrap">
              <span className="ob-stamp">Open for business</span>
            </div>
            <h1>{displayName}, your ledger is open.</h1>
            <p>
              First invoice takes thirty seconds. March takes care of itself.
            </p>
            {accountEmail && (
              <p className="ob-mail">
                <i className="bx bx-envelope" aria-hidden="true" /> Your
                verification link is waiting at <b>{accountEmail}</b>
              </p>
            )}
            <div className="ob-nav ob-nav--center">
              <button type="button" className="iw-btn iw-btn--lg" onClick={finish}>
                Enter your workspace <i className="bx bx-right-arrow-alt" />
              </button>
            </div>
          </div>
        )}

        {/* The skip only exists once the account does. Steps 0 to 2 are the
            name and the address: skipping those would jump past the very
            thing that creates the workspace. From step 3 on it is all
            dressing, and dressing can wait for the dashboard. */}
        {step > 2 && step < 7 && (
          <button type="button" className="ob-skip" onClick={() => setStep(7)}>
            Skip the dressing room
          </button>
        )}
      </div>
    </div>
  );
};
