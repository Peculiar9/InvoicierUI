import { AuthLayout } from '@/components/layout';
import { SignupForm } from '@/components/auth';

export const Signup = () => {
  return (
    <AuthLayout title="Create an account" subtitle="Start managing your invoices today">
      <SignupForm />
    </AuthLayout>
  );
};
