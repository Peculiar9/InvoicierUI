import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from '@tanstack/react-router';
import { AuthShell } from '@/components/static';
import { useSignup } from '@/hooks';

const signupSchema = z
  .object({
    email: z.string().email('Please enter a valid email address'),
    username: z.string().min(3, 'Username must be at least 3 characters'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: 'You must accept the terms and conditions',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SignupFormData = z.infer<typeof signupSchema>;

export const Signup = () => {
  const { mutate: signup, isPending, error } = useSignup();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { acceptTerms: false },
  });

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start sending invoices in minutes. No card required."
      footer={
        <>
          Already have an account? <Link to="/login">Sign in</Link>
        </>
      }
    >
      <form
        className="auth-form"
        onSubmit={handleSubmit((data) =>
          signup({
            email: data.email,
            username: data.username,
            password: data.password,
            confirmPassword: data.confirmPassword,
          })
        )}
      >
        {error && (
          <p className="form-banner-error">
            {error instanceof Error ? error.message : 'Signup failed. Please try again.'}
          </p>
        )}
        <div className="form-row">
          <div className="form-group">
            <label className="form-text">Email</label>
            <input type="email" className="form-input" placeholder="you@example.com" {...register('email')} />
            {errors.email && <small className="form-field-error">{errors.email.message}</small>}
          </div>
          <div className="form-group">
            <label className="form-text">Username</label>
            <input type="text" className="form-input" placeholder="johndoe" {...register('username')} />
            {errors.username && <small className="form-field-error">{errors.username.message}</small>}
          </div>
        </div>
        <div className="form-group">
          <label className="form-text">Password</label>
          <input type="password" className="form-input" placeholder="••••••••" {...register('password')} />
          {errors.password && <small className="form-field-error">{errors.password.message}</small>}
        </div>
        <div className="form-group">
          <label className="form-text">Confirm Password</label>
          <input type="password" className="form-input" placeholder="••••••••" {...register('confirmPassword')} />
          {errors.confirmPassword && (
            <small className="form-field-error">{errors.confirmPassword.message}</small>
          )}
        </div>
        <label className="form-check">
          <input type="checkbox" {...register('acceptTerms')} />
          <span>
            I agree to the <a href="#">Terms</a> and <a href="#">Privacy Policy</a>
          </span>
        </label>
        {errors.acceptTerms && <small className="form-field-error">{errors.acceptTerms.message}</small>}
        <button type="submit" className="auth-submit" disabled={isPending}>
          {isPending ? 'Creating account…' : 'Get Started for free'}
        </button>
      </form>
    </AuthShell>
  );
};
