import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from '@tanstack/react-router';
import { Button, Input } from '@/components/ui';
import { useLogin } from '@/hooks/useAuth';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginForm = () => {
  const { mutate: login, isPending, error } = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginFormData) => {
    login(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">
            {error instanceof Error ? error.message : 'Login failed. Please try again.'}
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

      <div>
        <Input
          label="Password"
          type="password"
          placeholder="Enter your password"
          error={errors.password?.message}
          {...register('password')}
        />
        <div className="mt-2 text-right">
          <Link
            to="/forgot-password"
            className="text-sm text-primary-500 hover:text-primary-600"
          >
            Forgot password?
          </Link>
        </div>
      </div>

      <Button type="submit" className="w-full" size="lg" isLoading={isPending}>
        Sign In
      </Button>

      <p className="text-center text-gray-600">
        Don't have an account?{' '}
        <Link to="/signup" className="text-primary-500 hover:text-primary-600 font-medium">
          Sign up
        </Link>
      </p>
    </form>
  );
};
