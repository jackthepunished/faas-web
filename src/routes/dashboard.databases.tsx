import { useMemo } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '@/components/dashboard/primitives';
import { Pill, ResourceTable, type Column } from '@/components/dashboard/resource-table';
import { AppScope, AppSelect, useSelectedApp } from '@/components/dashboard/app-select';
import { useUpstreams } from '@/lib/api/queries';
import { consoleHead } from '@/lib/seo';

export const Route = createFileRoute('/dashboard/databases')({
  component: UpstreamsPage,
  head: () => consoleHead('databases'),
});

/**
 * Upstream dependencies, from `/v1/apps/{slug}/upstreams`.
 *
 * This page used to list managed databases. **The platform does not host
 * databases** — it runs functions, and those functions call out to services you
 * run elsewhere. What the API can tell you is which upstreams each app actually
 * reaches, mostly inferred by observing egress.
 *
 * Hostnames are returned only as a salted hash, by design: the console can show
 * that an app talks to a Postgres somewhere without the dashboard becoming a
 * place your connection strings leak from. So the host column shows a short
 * fingerprint, which is enough to tell two upstreams apart.
 */
interface UpstreamRow {
  id: string;
  kind: string;
  fingerprint: string;
  port: number;
  source: string;
  scope: string;
}

function UpstreamsPage() {
  const appState = useSelectedApp();
  const { slug, select, apps } = appState;
  const { data, isPending, error, refetch } = useUpstreams(slug);

  const rows = useMemo<UpstreamRow[]>(
    () =>
      (data?.upstreams ?? []).map((u) => ({
        id: u.id,
        kind: u.kind,
        fingerprint: u.host_redacted_hash.slice(0, 12),
        port: u.port,
        source: u.source,
        scope: u.scope ?? '—',
      })),
    [data]
  );

  const columns: Column<UpstreamRow>[] = [
    { key: 'kind', label: 'Kind', width: 'w-40', render: (u) => <Pill label={u.kind} /> },
    {
      key: 'fingerprint',
      label: 'Host',
      render: (u) => (
        <span
          className="font-mono text-xs text-muted-foreground"
          title="Hostnames are never returned in the clear"
        >
          {u.fingerprint}…
        </span>
      ),
    },
    {
      key: 'port',
      label: 'Port',
      numeric: true,
      width: 'w-24',
      render: (u) => <span className="[font-variant-numeric:tabular-nums]">{u.port}</span>,
    },
    {
      key: 'source',
      label: 'Source',
      width: 'w-32',
      render: (u) => (
        <Pill label={u.source} color={u.source === 'explicit' ? 'var(--brand)' : undefined} />
      ),
    },
    {
      key: 'scope',
      label: 'Scope',
      render: (u) => <span className="text-xs text-muted-foreground">{u.scope}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Upstreams"
        description="External services this app reaches. Mostly discovered from egress; hostnames are hashed, never stored in the clear."
        actions={<AppSelect slug={slug} onSelect={select} apps={apps} />}
      />

      <AppScope state={appState} resource="upstreams">
        <ResourceTable
          rows={rows}
          columns={columns}
          initialSort={{ key: 'kind', dir: 'asc' }}
          searchKeys={['kind', 'scope']}
          searchPlaceholder="Filter by kind…"
          emptyMessage={`No upstreams observed for ${slug}.`}
          minWidth="min-w-[820px]"
          loading={isPending}
          error={error}
          onRetry={() => void refetch()}
        />
      </AppScope>
    </div>
  );
}
