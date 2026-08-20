import { useEffect, useRef, useState } from 'react';
import { usePageMeta } from '@/hooks/usePageMeta';
import { Link, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';
import {
  useLogin,
  useLoginMethods,
  useRequestLoginOtp,
  useVerifyLoginOtp,
} from '@/hooks';
import '@/styles/workspace-v2.css';
import { WAITLIST_MODE } from '@/lib/waitlistMode';
import { SignInLoader } from '@/components/SignInLoader';
import { RETURN_TO_KEY } from '@/lib/guards';

const emailSchema = z.string().email('That email does not look right');

/** Which lock they opened last, so we can offer it first next time. */
const LAST_METHOD_KEY = 'invoicier:last-login-method';
type LastMethod = 'password' | 'otp';

const readLastMethod = (): LastMethod | null => {
  try {
    const v = localStorage.getItem(LAST_METHOD_KEY);
    return v === 'password' || v === 'otp' ? v : null;
  } catch {
    return null;
  }
};

const writeLastMethod = (m: LastMethod) => {
  try {
    localStorage.setItem(LAST_METHOD_KEY, m);
  } catch {
    // private mode: the preference simply won't stick
  }
};

const messageOf = (err: unknown) =>
  err instanceof Error ? err.message : 'That did not work. Give it another go.';

type Mode = 'email' | 'method' | 'password' | 'otp';

/**
 * Sign in, email-first. We ask who they are before we ask for a secret, so
 * the door can offer the right lock — a password they've set, or a code we
 * email — instead of assuming. One card, one question at a time.
 */
export const Login = () => {
  usePageMeta('Log in');
  // The interceptor leaves this behind when a 401 bounced them here. The
  // read has to stay pure: StrictMode calls the initialiser twice, so
  // clearing the flag in here meant the second call found nothing.
  const [expired] = useState(() => {
    try {
      return sessionStorage.getItem('invoicier-signed-out') === 'expired';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      sessionStorage.removeItem('invoicier-signed-out');
    } catch {
      // private mode: the flag simply never persisted
    }
  }, []);

  const navigate = useNavigate();
  const [landing, setLanding] = useState<{ target: string; name?: string } | null>(null);

  const [mode, setMode] = useState<Mode>('email');
  const [email, setEmail] = useState('');
  const [account, setAccount] = useState<{ exists: boolean; has_password: boolean } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [reference, setReference] = useState<string | null>(null);
  const otpRequested = useRef(false);

  const loginMethods = useLoginMethods();
  const login = useLogin();
  const requestOtp = useRequestLoginOtp();
  const verifyOtp = useVerifyLoginOtp();

  // Entering the code step mints a code exactly once. The ref guards against
  // StrictMode's double-invoke and any incidental re-render of this effect.
  useEffect(() => {
    if (mode === 'otp' && !otpRequested.current) {
      otpRequested.current = true;
      requestOtp.mutate(email, {
        onSuccess: ({ reference: ref }) => setReference(ref),
        onError: () => {
          otpRequested.current = false;
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const goToEmail = () => {
    setMode('email');
    setAccount(null);
    setNotFound(false);
    setPassword('');
    setCode('');
    setReference(null);
    otpRequested.current = false;
    login.reset();
    requestOtp.reset();
    verifyOtp.reset();
  };

  const onEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setNotFound(false);
    const parsed = emailSchema.safeParse(email.trim());
    if (!parsed.success) {
      setEmailError(parsed.error.issues[0]?.message ?? 'That email does not look right');
      return;
    }
    const value = parsed.data;
    loginMethods.mutate(value, {
      onSuccess: ({ exists, has_password }) => {
        setEmail(value);
        setAccount({ exists, has_password });
        if (!exists) {
          setNotFound(true);
          return;
        }
        const last = readLastMethod();
        if (last === 'password' && has_password) setMode('password');
        else if (last === 'otp') setMode('otp');
        else setMode('method');
      },
    });
  };

  const onPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate(
      { email, password },
      {
        onSuccess: ({ target, user }) => {
          writeLastMethod('password');
          setLanding({ target, name: user?.first_name || user?.username });
        },
      }
    );
  };

  const onOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reference) return;
    verifyOtp.mutate(
      { email, code, reference },
      {
        onSuccess: ({ target, user }) => {
          writeLastMethod('otp');
          setLanding({ target, name: user?.first_name || user?.username });
        },
      }
    );
  };

  const resendCode = () => {
    verifyOtp.reset();
    setCode('');
    requestOtp.mutate(email, {
      onSuccess: ({ reference: ref }) => setReference(ref),
    });
  };

  if (landing) {
    return (
      <SignInLoader
        name={landing.name}
        onDone={() => {
          // an emailed link they followed before signing in wins over the
          // default landing: finish the errand they actually came for
          let back: string | null = null;
          try {
            back = sessionStorage.getItem(RETURN_TO_KEY);
            if (back) sessionStorage.removeItem(RETURN_TO_KEY);
          } catch {
            // private mode: fall through to the usual landing
          }
          navigate({ to: (back || landing.target) as '/dashboard' });
        }}
      />
    );
  }

  const hasPassword = account?.has_password ?? false;

  // The email chip that lets them correct a typo from any later step.
  const whoChip = (
    <div className="ob-auth-who">
      <span className="ob-auth-who-mail">{email}</span>
      <button type="button" className="ob-auth-change" onClick={goToEmail}>
        Change
      </button>
    </div>
  );

  const passwordChoice = (
    <button
      type="button"
      className="ob-auth-choice"
      disabled={!hasPassword}
      onClick={() => setMode('password')}
    >
      <span className="ob-auth-choice-icon" aria-hidden="true">
        <i className="bx bx-lock-alt" />
      </span>
      <span className="ob-auth-choice-body">
        <b>Continue with password</b>
        <small>
          {hasPassword
            ? 'The password you set for this account.'
            : "You haven't set a password yet, use a code instead."}
        </small>
      </span>
      {hasPassword && <i className="bx bx-chevron-right ob-auth-choice-go" aria-hidden="true" />}
    </button>
  );

  const otpChoice = (
    <button type="button" className="ob-auth-choice" onClick={() => setMode('otp')}>
      <span className="ob-auth-choice-icon" aria-hidden="true">
        <i className="bx bx-envelope" />
      </span>
      <span className="ob-auth-choice-body">
        <b>Email me a 4-digit code</b>
        <small>We'll send it to your inbox now.</small>
      </span>
      <i className="bx bx-chevron-right ob-auth-choice-go" aria-hidden="true" />
    </button>
  );

  // The last-used method sits first, so the familiar path is the obvious one.
  const otpFirst = readLastMethod() === 'otp';

  return (
    <div className="ob iw ob--auth">
      <div className="ob-card ob-card--auth">
        <Link to="/" className="ob-auth-brand">
          invoicier<b>.</b>
        </Link>

        {mode === 'email' && (
          <div className="ob-step">
            <span className="ob-kicker">Welcome back</span>
            <h1>Let's get you to your money.</h1>
            <p>Start with your email, we'll take it from there.</p>

            <form className="ob-auth-form" onSubmit={onEmailSubmit}>
              {expired && !loginMethods.error && (
                <p className="ob-auth-banner ob-auth-banner--info">
                  Your session expired, so we signed you out. Nothing was lost.
                </p>
              )}
              {loginMethods.error && (
                <p className="ob-auth-banner">{messageOf(loginMethods.error)}</p>
              )}

              <label className="cinv-field">
                <span>Email</span>
                <input
                  type="email"
                  autoFocus
                  autoComplete="email"
                  placeholder="you@yourbusiness.com"
                  className={emailError ? 'is-invalid' : ''}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {emailError && <small className="field-error">{emailError}</small>}
                {notFound && (
                  <small className="ob-auth-notfound">
                    We couldn't find an account for that email.{' '}
                    <a href="/welcome">Start setting up</a>
                  </small>
                )}
              </label>

              <button
                type="submit"
                className="iw-btn iw-btn--lg ob-auth-submit"
                disabled={loginMethods.isPending}
              >
                {loginMethods.isPending ? (
                  <>
                    <span className="iw-spin" aria-hidden="true" />
                    Looking you up
                  </>
                ) : (
                  <>
                    Continue <i className="bx bx-right-arrow-alt" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {mode === 'method' && (
          <div className="ob-step">
            <span className="ob-kicker">Welcome back</span>
            <h1>How would you like to sign in?</h1>
            {whoChip}

            <div className="ob-auth-choices">
              {otpFirst ? (
                <>
                  {otpChoice}
                  {passwordChoice}
                </>
              ) : (
                <>
                  {passwordChoice}
                  {otpChoice}
                </>
              )}
            </div>
          </div>
        )}

        {mode === 'password' && (
          <div className="ob-step">
            <span className="ob-kicker">Welcome back</span>
            <h1>Enter your password.</h1>
            {whoChip}

            <form className="ob-auth-form" onSubmit={onPasswordSubmit}>
              {login.error && <p className="ob-auth-banner">{messageOf(login.error)}</p>}

              <label className="cinv-field">
                <span>
                  Password
                  <Link to="/forgot-password" className="ob-auth-aux">
                    Forgot it?
                  </Link>
                </span>
                <input
                  type="password"
                  autoFocus
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>

              <button
                type="submit"
                className="iw-btn iw-btn--lg ob-auth-submit"
                disabled={login.isPending || password.length === 0}
              >
                {login.isPending ? (
                  <>
                    <span className="iw-spin" aria-hidden="true" />
                    Opening the books
                  </>
                ) : (
                  <>
                    Sign in <i className="bx bx-right-arrow-alt" />
                  </>
                )}
              </button>

              <button type="button" className="ob-auth-alt" onClick={() => setMode('method')}>
                Use a different method
              </button>
            </form>
          </div>
        )}

        {mode === 'otp' && (
          <div className="ob-step">
            <span className="ob-kicker">Welcome back</span>
            <h1>Check your inbox.</h1>
            <p>
              We sent a 4-digit code to <b>{email}</b>.
            </p>
            {whoChip}

            <form className="ob-auth-form" onSubmit={onOtpSubmit}>
              {requestOtp.error && (
                <p className="ob-auth-banner">{messageOf(requestOtp.error)}</p>
              )}
              {verifyOtp.error && (
                <p className="ob-auth-banner">{messageOf(verifyOtp.error)}</p>
              )}

              <label className="cinv-field">
                <span>Your code</span>
                <input
                  className="ob-otp-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={4}
                  autoFocus
                  placeholder="0000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                />
              </label>

              <button
                type="submit"
                className="iw-btn iw-btn--lg ob-auth-submit"
                disabled={verifyOtp.isPending || code.length !== 4 || !reference}
              >
                {verifyOtp.isPending ? (
                  <>
                    <span className="iw-spin" aria-hidden="true" />
                    Opening the books
                  </>
                ) : (
                  <>
                    Verify &amp; sign in <i className="bx bx-right-arrow-alt" />
                  </>
                )}
              </button>

              <div className="ob-auth-otp-aux">
                <button
                  type="button"
                  className="ob-auth-alt"
                  onClick={resendCode}
                  disabled={requestOtp.isPending}
                >
                  {requestOtp.isPending ? 'Sending…' : 'Resend code'}
                </button>
                {hasPassword && (
                  <button
                    type="button"
                    className="ob-auth-alt"
                    onClick={() => setMode('method')}
                  >
                    Use password instead
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        <p className="ob-auth-foot">
          {WAITLIST_MODE ? (
            <>
              Not in yet? <a href="/#waitlist">Join the waitlist</a> and we'll send your
              invite.
            </>
          ) : (
            <>
              New here? <a href="/welcome">Start setting up</a> and we will build your
              workspace as we go.
            </>
          )}
        </p>
      </div>
    </div>
  );
};
