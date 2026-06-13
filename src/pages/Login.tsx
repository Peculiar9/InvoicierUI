import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from '@tanstack/react-router';
import { AuthShell } from '@/components/static';
import { useLogin } from '@/hooks';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const Login = () => {
  const { mutate: login, isPending, error } = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to pick up where you left off."
      footer={
        <>
          Don&apos;t have an account? <Link to="/signup">Create one</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit((data) => login(data))}>
        {error && (
          <p className="form-banner-error">
            {error instanceof Error ? error.message : 'Login failed. Please try again.'}
          </p>
        )}
        <div className="form-group">
          <label className="form-text">Email</label>
          <input type="email" className="form-input" placeholder="you@example.com" {...register('email')} />
          {errors.email && <small className="form-field-error">{errors.email.message}</small>}
        </div>
        <div className="form-group">
          <div className="form-label-row">
            <label className="form-text">Password</label>
            <Link to="/forgot-password" className="form-aux-link">
              Forgot password?
            </Link>
          </div>
          <input type="password" className="form-input" placeholder="••••••••" {...register('password')} />
          {errors.password && <small className="form-field-error">{errors.password.message}</small>}
        </div>
        <button type="submit" className="auth-submit" disabled={isPending}>
          {isPending ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </AuthShell>
  );
};
