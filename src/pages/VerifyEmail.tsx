import { useEffect, useRef, useState } from 'react';
import { AxiosError } from 'axios';
import { usePageMeta } from '@/hooks/usePageMeta';
import { Link, useSearch } from '@tanstack/react-router';
import { authApi } from '@/api/auth';
import { PENDING_VERIFICATION_KEY } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';

interface PendingVerification {
  email: string;
  reference: string;
}

const readPending = (): PendingVerification | null => {
  try {
    const raw = sessionStorage.getItem(PENDING_VERIFICATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingVerification>;
    return parsed.email && parsed.reference
      ? { email: parsed.email, reference: parsed.reference }
      : null;
  } catch {
    return null;
  }
};

/**
 * The four digits from the email, typed back. Confirms the code against the
 * reference minted at signup, flips the account to verified, and sends the
 * user back to work.
 */
export const VerifyEmail = () => {
  usePageMeta('Verify your email');
  const updateUser = useAuthStore((s) => s.updateUser);
  const setSession = useAuthStore((s) => s.setSession);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const search = useSearch({ from: '/verify-email' });

  // three sources, in order of freshness: the URL (the emailed deep link),
  // this tab's sessionStorage, and finally an authed resend below
  const [pending, setPending] = useState<PendingVerification | null>(() => {
    if (search.email && search.ref) {
      const fromUrl = { email: search.email, reference: search.ref };
      try {
        sessionStorage.setItem(PENDING_VERIFICATION_KEY, JSON.stringify(fromUrl));
      } catch {
        // private mode: the state alone carries this visit
      }
      return fromUrl;
    }
    return readPending();
  });
  const [code, setCode] = useState(() => (typeof search.code === 'string' ? search.code : ''));
  const [state, setState] = useState<'entering' | 'working' | 'done' | 'failed'>(
    'entering'
  );
  const [note, setNote] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoTried = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = async (fourDigits: string) => {
    if (!pending) return;
    setState('working');
    setNote(null);
    try {
      const session = await authApi.verifyEmail(
        pending.email,
        pending.reference,
        fourDigits
      );
      setSession(
        { ...session.user, email_verified: true },
        session.accessToken,
        session.refreshToken
      );
      updateUser({ email_verified: true });
      try {
        sessionStorage.removeItem(PENDING_VERIFICATION_KEY);
      } catch {
        // stale handle in private mode is harmless
      }
      setState('done');
    } catch (err) {
      const status = err instanceof AxiosError ? err.response?.status : undefined;
      const msg =
        err instanceof AxiosError ? String(err.response?.data?.message ?? '') : '';

      // The address is in fact already confirmed — usually the emailed link did
      // it a moment ago. That is a success, not a failure to wave in their face.
      if (/already/i.test(msg)) {
        updateUser({ email_verified: true });
        setState('done');
        return;
      }

      setState('entering');
      if (status === 500 || /expire/i.test(msg)) {
        // stale code or a hiccup on our side: send a fresh one and say so, so
        // nobody is left staring at a dead code with no way forward
        void resend();
        setNote('That code was stale, so we sent a fresh one to your inbox. Use the new one.');
      } else {
        setNote('That code is not right. Check the email, or tap “Send a fresh code”.');
      }
      // keep the digits and select them: the Confirm button stays live so it
      // never looks broken, and the next keystroke overwrites cleanly
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  };

  // The emailed "Confirm this address" button lands here with the code in the
  // URL: verify it at once, so the button actually confirms instead of asking
  // the user to type what they just clicked. Guarded so it fires once.
  useEffect(() => {
    if (autoTried.current) return;
    if (pending && typeof search.code === 'string' && /^\d{4}$/.test(search.code)) {
      autoTried.current = true;
      void submit(search.code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, search.code]);

  const resend = async () => {
    if (!pending) return;
    try {
      await authApi.resendVerification(pending.email, pending.reference);
      setNote(`A fresh code is on its way to ${pending.email}.`);
    } catch {
      setNote('Could not resend just now. Give it a moment.');
    }
  };

  return (
    <div className="ob iw">
      <div className="ob-card">
        {state === 'done' ? (
          <div className="ob-step ob-step--done">
            <div className="ob-stamp-wrap">
              <span className="ob-stamp">Verified</span>
            </div>
            <h1>That's you, confirmed.</h1>
            <p>
              {user?.email} can now send invoices under your name. Back to the
              money.
            </p>
            <div className="ob-nav ob-nav--center">
              <Link to="/dashboard" className="iw-btn iw-btn--lg">
                Back to the workspace <i className="bx bx-right-arrow-alt" />
              </Link>
            </div>
          </div>
        ) : !pending ? (
          <div className="ob-step ob-step--done">
            <h1>Nothing waiting to be verified.</h1>
            <p>
              {isAuthenticated ? (
                <>
                  No handle on this device. One click and a fresh code lands in{' '}
                  <b>{user?.email}</b>.
                </>
              ) : (
                <>Use the button in your verification email, or sign in and ask for a fresh code.</>
              )}
            </p>
            {note && <p className="ob-form-note">{note}</p>}
            <div className="ob-nav ob-nav--center">
              {!isAuthenticated && (
                <Link to="/login" className="iw-btn iw-btn--lg">
                  Sign in <i className="bx bx-right-arrow-alt" />
                </Link>
              )}
              {isAuthenticated && <button
                type="button"
                className="iw-btn iw-btn--lg"
                onClick={async () => {
                  try {
                    const handle = await authApi.resendMyVerification();
                    setPending({ email: handle.email, reference: handle.reference });
                    try {
                      sessionStorage.setItem(
                        PENDING_VERIFICATION_KEY,
                        JSON.stringify({ email: handle.email, reference: handle.reference })
                      );
                    } catch {
                      // private mode: state alone is enough
                    }
                    setNote(null);
                  } catch {
                    setNote('Could not send a code just now. Give it a moment.');
                  }
                }}
              >
                Email me a fresh code <i className="bx bx-envelope" />
              </button>}
            </div>
          </div>
        ) : (
          <div className="ob-step">
            <h1>Check your inbox.</h1>
            <p>
              A four-digit code went to <b>{pending.email}</b>. Type it here and
              the account is yours, confirmed.
            </p>
            <form
              className="ob-auth-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (code.length === 4) void submit(code);
              }}
            >
              <label className="ob-field ob-code-field">
                <span>Verification code</span>
                <input
                  className="ob-code"
                  ref={inputRef}
                  value={code}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={4}
                  placeholder="0000"
                  disabled={state === 'working'}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setCode(digits);
                    if (digits.length === 4) void submit(digits);
                  }}
                />
              </label>
              {note && <p className="ob-form-note">{note}</p>}
              <div className="ob-nav ob-nav--center">
                <button
                  type="submit"
                  className="iw-btn iw-btn--lg"
                  disabled={code.length !== 4 || state === 'working'}
                >
                  {state === 'working' ? (
                    <>
                      <span className="iw-spin" aria-hidden="true" /> Verifying
                    </>
                  ) : (
                    <>
                      <i className="bx bx-badge-check" /> Verify email
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="iw-btn iw-btn--ghost"
                  onClick={() => void resend()}
                  disabled={state === 'working'}
                >
                  <i className="bx bx-mail-send" /> Send a fresh code
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
