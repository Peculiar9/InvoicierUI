import { AuthLayout } from '@/components/layout';
import { LoginForm } from '@/components/auth';

export const Login = () => {
  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your account to continue">
      <LoginForm />
    </AuthLayout>
  );
};
