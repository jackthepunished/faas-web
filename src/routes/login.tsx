import { createFileRoute, redirect } from '@tanstack/react-router';
import { AuthLayout } from '@/components/auth/auth-layout';
import { EmailCodeFlow } from '@/components/auth/email-code-flow';
import { hasOnboarded, readSession } from '@/lib/auth';

export const Route = createFileRoute('/login')({
  beforeLoad: () => {
    if (readSession()) throw redirect({ to: hasOnboarded() ? '/dashboard' : '/onboarding' });
  },
  component: () => (
    <AuthLayout>
      <EmailCodeFlow mode="signin" />
    </AuthLayout>
  ),
});
