import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
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
  const updateUser = useAuthStore((s) => s.updateUser);
  const setSession = useAuthStore((s) => s.setSession);
  const user = useAuthStore((s) => s.user);

  const [pending] = useState<PendingVerification | null>(readPending);
  const [code, setCode] = useState('');
  const [state, setState] = useState<'entering' | 'working' | 'done' | 'failed'>(
    'entering'
  );
  const [note, setNote] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    } catch {
      setState('entering');
      setNote('That code did not match. Check the email and try again.');
      setCode('');
      inputRef.current?.focus();
    }
  };

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
              Sign in and use the badge in your workspace to request a fresh
              verification email.
            </p>
            <div className="ob-nav ob-nav--center">
              <Link to="/dashboard" className="iw-btn iw-btn--lg">
                Back to the workspace <i className="bx bx-right-arrow-alt" />
              </Link>
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
              <label className="ob-field">
                <span>Verification code</span>
                <input
                  ref={inputRef}
                  value={code}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={4}
                  placeholder="••••"
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
                      <span className="iw-spin" aria-hidden="true" /> Checking
                    </>
                  ) : (
                    <>
                      Confirm <i className="bx bx-right-arrow-alt" />
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="iw-btn iw-btn--ghost"
                  onClick={() => void resend()}
                  disabled={state === 'working'}
                >
                  Resend the code
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
