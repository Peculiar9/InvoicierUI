import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/stores/authStore';

/**
 * Where the emailed verification link lands. Confirms the token, flips the
 * account to verified, and sends the user back to work.
 */
export const VerifyEmail = () => {
  const updateUser = useAuthStore((s) => s.updateUser);
  const user = useAuthStore((s) => s.user);
  const [state, setState] = useState<'working' | 'done' | 'failed'>('working');

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token') ?? 'demo';
    let cancelled = false;
    authApi
      .verifyEmail(token)
      .then(() => {
        if (cancelled) return;
        updateUser({ emailVerified: true });
        setState('done');
      })
      .catch(() => !cancelled && setState('failed'));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="ob iw">
      <div className="ob-card">
        {state === 'working' && (
          <div className="ob-step ob-step--done">
            <span className="iw-spin iw-spin--dark" aria-hidden="true" />
            <h1>Checking your link</h1>
            <p>One moment.</p>
          </div>
        )}
        {state === 'done' && (
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
        )}
        {state === 'failed' && (
          <div className="ob-step ob-step--done">
            <h1>That link has gone stale.</h1>
            <p>Links expire for safety. Request a fresh one from the badge in your workspace.</p>
            <div className="ob-nav ob-nav--center">
              <Link to="/dashboard" className="iw-btn iw-btn--lg">
                Back to the workspace <i className="bx bx-right-arrow-alt" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
