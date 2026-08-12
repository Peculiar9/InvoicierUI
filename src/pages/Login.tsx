import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from '@tanstack/react-router';
import { useLogin } from '@/hooks';
import '@/styles/workspace-v2.css';
import { WAITLIST_MODE } from '@/lib/waitlistMode';

const loginSchema = z.object({
  email: z.string().email('That email does not look right'),
  password: z.string().min(8, 'Passwords are at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Sign in, wearing the welcome journey's room. The promise the marketing
 * page makes is ease, so the door into the product is one card, two fields
 * and nothing else asking for attention.
 */
export const Login = () => {
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

  const { mutate: login, isPending, error } = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  return (
    <div className="ob iw ob--auth">
      <div className="ob-card ob-card--auth">
        <Link to="/" className="ob-auth-brand">
          invoicier<b>.</b>
        </Link>

        <div className="ob-step">
          <span className="ob-kicker">Welcome back</span>
          <h1>Let's get you to your money.</h1>
          <p>Two fields and you're in. Your ledger kept everything warm.</p>

          <form className="ob-auth-form" onSubmit={handleSubmit((data) => login(data))}>
            {expired && !error && (
              <p className="ob-auth-banner ob-auth-banner--info">
                Your session expired, so we signed you out. Nothing was lost.
              </p>
            )}
            {error && (
              <p className="ob-auth-banner">
                {error instanceof Error
                  ? error.message
                  : 'That did not work. Give it another go.'}
              </p>
            )}

            <label className="cinv-field">
              <span>Email</span>
              <input
                type="email"
                autoFocus
                autoComplete="email"
                placeholder="you@yourbusiness.com"
                className={errors.email ? 'is-invalid' : ''}
                {...register('email')}
              />
              {errors.email && <small className="field-error">{errors.email.message}</small>}
            </label>

            <label className="cinv-field">
              <span>
                Password
                <Link to="/forgot-password" className="ob-auth-aux">
                  Forgot it?
                </Link>
              </span>
              <input
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className={errors.password ? 'is-invalid' : ''}
                {...register('password')}
              />
              {errors.password && (
                <small className="field-error">{errors.password.message}</small>
              )}
            </label>

            <button type="submit" className="iw-btn iw-btn--lg ob-auth-submit" disabled={isPending}>
              {isPending ? (
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
          </form>

          <p className="ob-auth-foot">
            {WAITLIST_MODE ? (
              <>
                Not in yet? <a href="/#waitlist">Join the waitlist</a> and we'll
                send your invite.
              </>
            ) : (
              <>
                No account yet? <a href="/signup">Create one</a> — it takes a
                minute.
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
