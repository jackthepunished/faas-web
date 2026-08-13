import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { DashboardShell } from '@/components/dashboard/shell';
import { hasOnboarded, readSession } from '@/lib/auth';

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
  return (
    <DashboardShell>
      <Outlet />
    </DashboardShell>
  );
}
