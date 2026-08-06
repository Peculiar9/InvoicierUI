import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from '@tanstack/react-router';
import { useSignup } from '@/hooks';
import '@/styles/workspace-v2.css';

const signupSchema = z.object({
  full_name: z.string().min(2, 'We need a name to put on your invoices'),
  email: z.string().email('That email does not look right'),
  password: z.string().min(8, 'Passwords are at least 8 characters'),
});

type SignupFormData = z.infer<typeof signupSchema>;

/**
 * The way in.
 *
 * Three fields, because everything else about the business is asked during
 * onboarding, one question at a time, where there is room to explain why we
 * want it. Asking for a phone number and a country here would be the same
 * questions in a worse room.
 */
export const Signup = () => {
  const { mutate: signup, isPending, error } = useSignup();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({ resolver: zodResolver(signupSchema) });

  return (
    <div className="ob ob--auth iw">
      <div className="ob-card ob-card--auth">
        <Link to="/" className="ob-auth-brand">
          invoicier<b>.</b>
        </Link>

        <div className="ob-step">
          <span className="ob-kicker">First time here</span>
          <h1>Let's get you paid properly.</h1>
          <p>Three fields now. The rest we'll ask as we set up your first invoice.</p>

          <form className="ob-auth-form" onSubmit={handleSubmit((data) => signup(data))}>
            {error && (
              <p className="ob-auth-banner">
                {error instanceof Error
                  ? error.message
                  : 'That did not work. Give it another go.'}
              </p>
            )}

            <label className="cinv-field">
              <span>Your name</span>
              <input
                type="text"
                autoFocus
                autoComplete="name"
                placeholder="Ada Obi"
                className={errors.full_name ? 'is-invalid' : ''}
                {...register('full_name')}
              />
              {errors.full_name && (
                <small className="field-error">{errors.full_name.message}</small>
              )}
            </label>

            <label className="cinv-field">
              <span>Email</span>
              <input
                type="email"
                autoComplete="email"
                placeholder="you@yourbusiness.com"
                className={errors.email ? 'is-invalid' : ''}
                {...register('email')}
              />
              {errors.email && <small className="field-error">{errors.email.message}</small>}
            </label>

            <label className="cinv-field">
              <span>Password</span>
              <input
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
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
                  <span className="iw-spin" aria-hidden="true" /> Making your workspace
                </>
              ) : (
                <>
                  Create my account <i className="bx bx-right-arrow-alt" />
                </>
              )}
            </button>

            <p className="ob-auth-alt">
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};
