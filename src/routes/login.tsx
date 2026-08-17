import { createFileRoute, redirect } from '@tanstack/react-router';
import { AuthLayout } from '@/components/auth/auth-layout';
import { PasswordFlow } from '@/components/auth/password-flow';
import { hasOnboarded, readSession } from '@/lib/auth';
import { pageHead } from '@/lib/seo';

export const Route = createFileRoute('/login')({
  head: () => pageHead({ title: 'Sign in' }),
  beforeLoad: () => {
    if (readSession()) throw redirect({ to: hasOnboarded() ? '/dashboard' : '/onboarding' });
  },
  component: () => (
    <AuthLayout>
      <PasswordFlow mode="signin" />
    </AuthLayout>
  ),
});
