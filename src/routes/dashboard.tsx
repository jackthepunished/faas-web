import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { DashboardShell } from '@/components/dashboard/shell';
import { hasOnboarded, readSession, useRedirectWhenSignedOut } from '@/lib/auth';

export const Route = createFileRoute('/dashboard')({
  // Guards run before the route loads, so a signed-out visitor never sees a
  // flash of the shell. Session lives in localStorage, so this stays sync.
  beforeLoad: () => {
    if (!readSession()) throw redirect({ to: '/login' });
    if (!hasOnboarded()) throw redirect({ to: '/onboarding' });
  },
  component: DashboardLayout,
});

function DashboardLayout() {
  // The guard above covers navigation; this covers a session lost mid-page.
  useRedirectWhenSignedOut();
  return (
    <DashboardShell>
      <Outlet />
    </DashboardShell>
  );
}
