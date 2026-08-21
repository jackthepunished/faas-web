import { useMemo } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { WarningTriangle } from 'iconoir-react';
import { PageHeader } from '@/components/dashboard/primitives';
import { ResourceTable, type Column } from '@/components/dashboard/resource-table';
import { AppScope, AppSelect, useSelectedApp } from '@/components/dashboard/app-select';
import { useAppRoutes } from '@/lib/api/queries';
import { consoleHead } from '@/lib/seo';

export const Route = createFileRoute('/dashboard/apis')({
  component: ApisPage,
  head: () => consoleHead('apis'),
});

/**
 * Routes served by an app, from `/v1/apps/{slug}/routes`.
 *
 * These are observed at the gateway, not declared — the list is whatever has
 * actually been requested, which is why there is nothing to create or edit here.
 *
 * The endpoint is plan-gated: per-route observability is off for Free, and the
 * response says `source: 'unavailable'` when it is. That is a different thing
 * from an app with no traffic, and the page has to say which it is rather than
 * showing the same empty table for both.
 */
interface RouteRow {
  id: string;
  path: string;
}

/**
 * The apis body, without the page chrome around it.
 *
 * Rendered both by this route and as a tab on the app detail page, so
 * the two can never drift into two different implementations of the
 * same resource.
 */
export function RoutesBody({ slug }: { slug: string }) {
  const { data, isPending, error, refetch } = useAppRoutes(slug);

  const rows = useMemo<RouteRow[]>(
    () => (data?.routes ?? []).map((path) => ({ id: path, path })),
    [data]
  );

  const columns: Column<RouteRow>[] = [
    {
      key: 'path',
      label: 'Route',
      render: (r) => <span className="font-mono text-xs">{r.path}</span>,
    },
  ];

  const unavailable = data?.source === 'unavailable';

  return (
    <div className="flex flex-col gap-6">
      {unavailable && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-lg border px-3 py-2 text-xs"
          style={{ borderColor: 'color-mix(in oklab, var(--status-warning) 40%, transparent)' }}
        >
          <WarningTriangle
            className="mt-px h-3.5 w-3.5 shrink-0"
            style={{ color: 'var(--status-warning)' }}
          />
          Per-route metrics are not enabled for this app, so no routes can be listed. This is a paid
          plan feature.
        </p>
      )}

      {data?.cap_hit && (
        <p className="text-xs text-muted-foreground">
          The route list hit its cap — some low-traffic routes are not shown.
        </p>
      )}

      <ResourceTable
        rows={rows}
        columns={columns}
        initialSort={{ key: 'path', dir: 'asc' }}
        searchKeys={['path']}
        searchPlaceholder="Filter by path…"
        emptyMessage={
          unavailable
            ? 'Route metrics are disabled for this app.'
            : slug
              ? `No routes observed for ${slug} yet.`
              : 'Create an app first.'
        }
        minWidth="min-w-[600px]"
        loading={isPending}
        error={error}
        onRetry={() => void refetch()}
      />
    </div>
  );
}

function ApisPage() {
  const appState = useSelectedApp();
  const { slug, select, apps } = appState;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="APIs"
        description="Routes observed at the gateway for this app. Discovered from traffic, not declared."
        actions={<AppSelect slug={slug} onSelect={select} apps={apps} />}
      />

      <AppScope state={appState} resource="routes">
        <RoutesBody slug={slug} />
      </AppScope>
    </div>
  );
}
