import { createRootRoute, Link, Outlet } from '@tanstack/react-router';
import { accentPair } from 'glimm';
import { GlimmProvider } from 'glimm/react';
import { AuthProvider } from '@/lib/auth';
import { DataProvider } from '@/lib/store';
import { ToastProvider } from '@/components/ui/toast';

// Brand sweep: dark teal into the pale brand-adjacent step, fitted once at
// module scope. Matches --brand in the .theme-teal scope (hue 180).
const TEAL_SWEEP = accentPair('#008c7b', '#7ae9d5');

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootLayout() {
  return (
    <AuthProvider>
      <DataProvider>
        {/* The sweep runs the brand teal ramp (oklch.fyi teal steps 10 → 6).
            The journey pages are light, so brightness sits high enough that
            the band reads as a wash of color rather than a dark flash. */}
        <GlimmProvider
          palette={TEAL_SWEEP}
          brightness={0.95}
          sweepMs={950}
          outroMs={620}
          easing="easeInOutCubic"
          waveAmount={0.6}
          swellAmount={0.6}
        >
          <ToastProvider>
            <Outlet />
          </ToastProvider>
        </GlimmProvider>
      </DataProvider>
    </AuthProvider>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center text-foreground">
      <p className="label-mono text-brand">Error 404</p>
      <h1 className="max-w-md text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
        This route never booted.
      </h1>
      <p className="max-w-sm text-balance text-muted-foreground">
        The page you asked for does not exist. It may have been moved, or the link may be stale.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/"
          className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Back to home
        </Link>
        <Link
          to="/dashboard"
          className="rounded-full border border-border px-5 py-2 text-sm transition-colors hover:border-border-secondary"
        >
          Open dashboard
        </Link>
      </div>
    </div>
  );
}
