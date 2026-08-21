import { useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { Plus } from 'iconoir-react';
import { useApps } from '@/lib/api/queries';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, LoadingState, UnreachableState, queryPhase } from './primitives';

/**
 * Scope picker for the resources the API keys by app.
 *
 * Secrets, env vars, alerts, webhooks, and queues are all
 * `/v1/apps/{slug}/…` — there is no account-wide read for any of them. These
 * pages used to show a flat fixture list, which quietly implied a workspace-wide
 * view that the API cannot answer. Every one of them now picks an app first.
 *
 * The choice is remembered across pages and reloads, so moving between Secrets
 * and Env Vars while debugging one app does not mean re-selecting it each time.
 */

const STORAGE_KEY = 'gregale.selectedApp';

function remembered(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(STORAGE_KEY) ?? '';
}

/**
 * Returns the selected app slug, the setter, and the app list state.
 *
 * `slug` is empty until the apps load. Callers pass it straight to a per-app
 * query, which stays disabled while it is empty rather than firing at
 * `/v1/apps//secrets`.
 */
export function useSelectedApp() {
  const { data: apps, isPending, error, refetch } = useApps();
  const [chosen, setChosen] = useState<string>(remembered);

  // Derived, not synchronised. The default — the remembered app if it still
  // exists, otherwise the first one — falls out of a computation rather than an
  // effect that writes state, so there is no render where the selection is
  // briefly wrong and no cascading re-render to correct it. A remembered app
  // that has since been deleted simply stops matching.
  const list = apps ?? [];
  const slug = list.some((a) => a.slug === chosen) ? chosen : (list[0]?.slug ?? '');

  const select = (next: string) => {
    setChosen(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  return {
    slug,
    select,
    apps: list,
    loadingApps: isPending,
    appsError: error,
    refetchApps: refetch,
  };
}

export type SelectedApp = ReturnType<typeof useSelectedApp>;

/**
 * Gate for a page whose data hangs off one app.
 *
 * Every per-app read is `/v1/apps/{slug}/…` and is gated on having a slug, so
 * with no app the query never runs — and TanStack reports a query that never
 * ran as pending forever. Pages that forwarded that straight through sat on
 * "Loading…" for eternity, and rendered their editors besides, offering to
 * write a secret to nothing.
 *
 * So the app list is resolved first and the page body only exists once there
 * is an app to point it at.
 */
export function AppScope({
  state,
  resource,
  children,
}: {
  state: SelectedApp;
  /** Plural, lowercase — "secrets", "queue jobs". Names what needs an app. */
  resource: string;
  children: ReactNode;
}) {
  const phase = queryPhase({
    error: state.appsError,
    loading: state.loadingApps,
    isEmpty: state.apps.length === 0,
  });

  if (phase === 'unreachable') return <UnreachableState onRetry={() => void state.refetchApps()} />;
  if (phase === 'error')
    return <ErrorState error={state.appsError} onRetry={() => void state.refetchApps()} />;
  if (phase === 'loading') return <LoadingState message="Loading apps…" />;
  if (phase === 'empty')
    return (
      <EmptyState
        message={`${resource[0].toUpperCase()}${resource.slice(1)} belong to an app, and this workspace has none yet.`}
        action={
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link to="/dashboard/workflows/new">
              <Plus className="h-3.5 w-3.5" />
              Create an app
            </Link>
          </Button>
        }
      />
    );

  return <>{children}</>;
}

export function AppSelect({
  slug,
  onSelect,
  apps,
  label = 'App',
}: {
  slug: string;
  onSelect: (slug: string) => void;
  apps: { slug: string }[];
  label?: string;
}) {
  // With nothing to choose between, the picker is furniture — and "No apps"
  // in a dropdown is a worse way to say it than the empty state below.
  if (apps.length === 0) return null;

  return (
    <label className="flex items-center gap-2">
      <span className="label-mono text-muted-foreground">{label}</span>
      <select
        value={slug}
        onChange={(e) => onSelect(e.target.value)}
        aria-label="Select an app"
        className="h-9 rounded-md border border-border bg-card px-2.5 text-sm outline-none focus:border-brand/50"
      >
        {apps.map((a) => (
          <option key={a.slug} value={a.slug}>
            {a.slug}
          </option>
        ))}
      </select>
    </label>
  );
}
