import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useResetPassword } from '@/hooks/useAuth';

/**
 * Where the emailed reset link lands. The token in the URL is the
 * credential; it works once and dies in thirty minutes, so a stale link gets
 * words, not a stack trace.
 */
export const ResetPassword = () => {
  const token = new URLSearchParams(window.location.search).get('token') ?? '';
  const { mutate: reset, isPending, isError } = useResetPassword();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [formError, setFormError] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 10) {
      setFormError('Ten characters at least — this guards your money.');
      return;
    }
    if (password !== confirm) {
      setFormError('The two passwords do not match.');
      return;
    }
    setFormError('');
    reset({ token, password });
  };

  return (
    <div className="ob iw">
      <div className="ob-card">
        {!token ? (
          <div className="ob-step ob-step--done">
            <h1>This link is missing its key.</h1>
            <p>Ask for a fresh reset email and use the link inside it whole.</p>
            <div className="ob-nav ob-nav--center">
              <Link to="/forgot-password" className="iw-btn iw-btn--lg">
                Request a new link <i className="bx bx-right-arrow-alt" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="ob-step">
            <h1>Choose a new password.</h1>
            <p>The old one stops working the moment you save this.</p>
            <form className="ob-auth-form" onSubmit={submit}>
              {(formError || isError) && (
                <p className="ob-form-note" role="alert">
                  {formError ||
                    'That link has expired or was already used. Request a fresh one.'}
                </p>
              )}
              <label className="ob-field">
                <span>New password</span>
                <input
                  type="password"
                  value={password}
                  autoComplete="new-password"
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </label>
              <label className="ob-field">
                <span>Type it again</span>
                <input
                  type="password"
                  value={confirm}
                  autoComplete="new-password"
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </label>
              <div className="ob-nav ob-nav--center">
                <button type="submit" className="iw-btn iw-btn--lg" disabled={isPending}>
                  {isPending ? (
                    <>
                      <span className="iw-spin" aria-hidden="true" /> Saving
                    </>
                  ) : (
                    <>
                      Save and sign in <i className="bx bx-right-arrow-alt" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
