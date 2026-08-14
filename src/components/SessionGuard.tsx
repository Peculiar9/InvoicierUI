import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useExtendSession } from '@/hooks';
import { getTokenExpiry } from '@/lib/jwt';
import { tryProactiveRefresh, forceSignOut } from '@/api/client';
import '@/styles/session-guard.css';

/** Two minutes out we try to renew silently; if that fails, the nudges begin. */
const NOTICE_AT = 120_000;
/** One minute out the compact nudge becomes a countdown people can't miss. */
const COUNTDOWN_AT = 60_000;

const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
};

/**
 * Keeps a session from ending out from under someone.
 *
 * Normally the token renews silently and this shows nothing. But when a renewal
 * can't happen — a password change clears the refresh token — an abrupt bounce
 * to the login screen would feel like the app forgot them. So instead: a quiet
 * heads-up two minutes out, a can't-miss countdown in the last minute, and one
 * button that keeps them exactly where they are (minting fresh tokens off the
 * still-valid access token). Ignore it and it signs out cleanly at zero.
 */
export const SessionGuard = () => {
  const token = useAuthStore((s) => s.token);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const extend = useExtendSession();

  const [remaining, setRemaining] = useState<number | null>(null);
  const warning = useRef(false);
  const triedFor = useRef<string | null>(null);
  const expired = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setRemaining(null);
      return;
    }
    const exp = getTokenExpiry(token);
    if (!exp) {
      setRemaining(null);
      return;
    }
    // fresh token: clean slate
    warning.current = false;
    triedFor.current = null;
    expired.current = false;
    setRemaining(exp - Date.now());

    const tick = () => {
      const rem = exp - Date.now();
      if (rem <= 0) {
        if (!expired.current) {
          expired.current = true;
          forceSignOut();
        }
        return;
      }
      // Two minutes out, try once to renew silently. Success rotates the token
      // and restarts this effect; failure (spent refresh token) starts the nudges.
      if (rem <= NOTICE_AT && triedFor.current !== token) {
        triedFor.current = token;
        void tryProactiveRefresh().then((ok) => {
          if (!ok) warning.current = true;
        });
      }
      setRemaining(rem);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [token, isAuthenticated]);

  const onStay = () => {
    extend.mutate(undefined, { onError: () => forceSignOut() });
  };

  if (remaining === null || !warning.current) return null;

  const staying = extend.isPending;

  // 2:00 → 1:00 — the quiet heads-up
  if (remaining > COUNTDOWN_AT) {
    return (
      <div className="sg-notice" role="status">
        <div className="sg-notice-body">
          <b>Still there?</b>
          <span>Your session ends in {fmt(remaining)}.</span>
        </div>
        <button type="button" className="sg-stay" onClick={onStay} disabled={staying}>
          {staying ? 'Keeping you in…' : 'Stay signed in'}
        </button>
      </div>
    );
  }

  // final minute — the countdown
  const pct = Math.max(0, Math.min(100, (remaining / COUNTDOWN_AT) * 100));
  return (
    <div className="sg-scrim" role="alertdialog" aria-modal="true" aria-label="Session ending">
      <div className="sg-card">
        <div className="sg-clock" aria-hidden="true">
          {fmt(remaining)}
        </div>
        <h2>Signing you out soon</h2>
        <p>Your session is about to expire. Stay signed in to pick up right where you are.</p>
        <div className="sg-bar" aria-hidden="true">
          <span style={{ width: `${pct}%` }} />
        </div>
        <div className="sg-actions">
          <button
            type="button"
            className="sg-stay sg-stay--lg"
            onClick={onStay}
            disabled={staying}
            autoFocus
          >
            {staying ? 'Keeping you in…' : 'Stay signed in'}
          </button>
          <button type="button" className="sg-out" onClick={() => forceSignOut()}>
            Sign out now
          </button>
        </div>
      </div>
    </div>
  );
};
