import { useForm } from 'react-hook-form';
import { usePageMeta } from '@/hooks/usePageMeta';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from '@tanstack/react-router';
import { useForgotPassword } from '@/hooks';
import '@/styles/workspace-v2.css';

const forgotSchema = z.object({
  email: z.string().email('That email does not look right'),
});

type ForgotFormData = z.infer<typeof forgotSchema>;

/** Same room as sign in: one card, one field, no ceremony. */
export const ForgotPassword = () => {
  usePageMeta('Forgot password');
  const { mutate: requestReset, isPending, isSuccess, error } = useForgotPassword();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFormData>({ resolver: zodResolver(forgotSchema) });

  return (
    <div className="ob iw ob--auth">
      <div className="ob-card ob-card--auth">
        <Link to="/" className="ob-auth-brand">
          invoicier<b>.</b>
        </Link>

        <div className="ob-step">
          <span className="ob-kicker">Locked out</span>
          <h1>Happens to everyone.</h1>
          <p>Tell us the address you sign in with and we'll send a fresh link.</p>

          <form
            className="ob-auth-form"
            onSubmit={handleSubmit((data) => requestReset(data.email))}
          >
            {isSuccess && (
              <p className="ob-auth-banner ob-auth-banner--ok">
                If that email is on file, a reset link is on its way.
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

            <button
              type="submit"
              className="iw-btn iw-btn--lg ob-auth-submit"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <span className="iw-spin" aria-hidden="true" />
                  Sending the link
                </>
              ) : (
                <>
                  Send the reset link <i className="bx bx-right-arrow-alt" />
                </>
              )}
            </button>
          </form>

          <p className="ob-auth-foot">
            Remembered it? <Link to="/login">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};
