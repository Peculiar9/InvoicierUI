import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from '@tanstack/react-router';
import { AuthShell } from '@/components/static';
import { useForgotPassword } from '@/hooks';

const forgotSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotFormData = z.infer<typeof forgotSchema>;

export const ForgotPassword = () => {
  const { mutate: requestReset, isPending, isSuccess, error } = useForgotPassword();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFormData>({ resolver: zodResolver(forgotSchema) });

  return (
    <AuthShell
      title="Reset your password"
      subtitle="We'll email you a link to set a new one."
      footer={
        <>
          Remembered it? <Link to="/login">Back to sign in</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit((data) => requestReset(data.email))}>
        {isSuccess && (
          <p className="form-banner-success">
            If that email exists, a reset link is on its way.
          </p>
        )}
        {error && (
          <p className="form-banner-error">
            {error instanceof Error ? error.message : 'Something went wrong. Please try again.'}
          </p>
        )}
        <div className="form-group">
          <label className="form-text">Email</label>
          <input type="email" className="form-input" placeholder="you@example.com" {...register('email')} />
          {errors.email && <small className="form-field-error">{errors.email.message}</small>}
        </div>
        <button type="submit" className="auth-submit" disabled={isPending}>
          {isPending ? 'Sending…' : 'Send Reset Link'}
        </button>
      </form>
    </AuthShell>
  );
};
