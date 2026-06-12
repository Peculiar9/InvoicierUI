import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from '@tanstack/react-router';
import { Button, Input } from '@/components/ui';
import { useSignup } from '@/hooks/useAuth';

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

export const SignupForm = () => {
  const { mutate: signup, isPending, error } = useSignup();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      acceptTerms: false,
    },
  });

  const onSubmit = (data: SignupFormData) => {
    signup({
      email: data.email,
      username: data.username,
      password: data.password,
      confirmPassword: data.confirmPassword,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">
            {error instanceof Error ? error.message : 'Signup failed. Please try again.'}
          </p>
        </div>
      )}

      <Input
        label="Email"
        type="email"
        placeholder="you@example.com"
        error={errors.email?.message}
        {...register('email')}
      />

      <Input
        label="Username"
        type="text"
        placeholder="johndoe"
        error={errors.username?.message}
        {...register('username')}
      />

      <Input
        label="Password"
        type="password"
        placeholder="Create a strong password"
        error={errors.password?.message}
        hint="At least 8 characters with uppercase, lowercase, and number"
        {...register('password')}
      />

      <Input
        label="Confirm Password"
        type="password"
        placeholder="Confirm your password"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />

      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="acceptTerms"
          className="mt-1 w-4 h-4 text-primary-500 border-gray-300 rounded focus:ring-primary-500"
          {...register('acceptTerms')}
        />
        <label htmlFor="acceptTerms" className="text-sm text-gray-600">
          I agree to the{' '}
          <a href="/terms" className="text-primary-500 hover:text-primary-600">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" className="text-primary-500 hover:text-primary-600">
            Privacy Policy
          </a>
        </label>
      </div>
      {errors.acceptTerms && (
        <p className="text-sm text-red-500 -mt-3">{errors.acceptTerms.message}</p>
      )}

      <Button type="submit" className="w-full" size="lg" isLoading={isPending}>
        Create Account
      </Button>

      <p className="text-center text-gray-600">
        Already have an account?{' '}
        <Link to="/login" className="text-primary-500 hover:text-primary-600 font-medium">
          Sign in
        </Link>
      </p>
    </form>
  );
};
