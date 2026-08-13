import { createRootRoute, Link, Outlet } from '@tanstack/react-router';
import { AuthProvider } from '@/lib/auth';
import { DataProvider } from '@/lib/store';
import { ToastProvider } from '@/components/ui/toast';

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootLayout() {
  return (
    <AuthProvider>
      <DataProvider>
        <ToastProvider>
          <Outlet />
        </ToastProvider>
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
