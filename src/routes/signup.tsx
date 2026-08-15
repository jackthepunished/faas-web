import { createFileRoute, redirect } from '@tanstack/react-router';
import { AuthLayout } from '@/components/auth/auth-layout';
import { EmailCodeFlow } from '@/components/auth/email-code-flow';
import { hasOnboarded, readSession } from '@/lib/auth';
import { pageHead } from '@/lib/seo';

export const Route = createFileRoute('/signup')({
  head: () => pageHead({ title: 'Create account' }),
  beforeLoad: () => {
    if (readSession()) throw redirect({ to: hasOnboarded() ? '/dashboard' : '/onboarding' });
  },
  component: () => (
    <AuthLayout>
      <EmailCodeFlow mode="signup" />
    </AuthLayout>
  ),
});
