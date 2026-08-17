import { useMemo } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '@/components/dashboard/primitives';
import { Pill, ResourceTable, type Column } from '@/components/dashboard/resource-table';
import { AppSelect, useSelectedApp } from '@/components/dashboard/app-select';
import { useWebhooks } from '@/lib/api/queries';
import { consoleHead } from '@/lib/seo';

export const Route = createFileRoute('/dashboard/webhooks')({
  component: WebhooksPage,
  head: () => consoleHead('webhooks'),
});

/**
 * Outbound webhook subscriptions, from `/v1/apps/{slug}/webhooks`.
 *
 * One row per (app, target URL). The dispatcher signs each payload and retries
 * with exponential backoff, dead-lettering at attempt 7 — so `retry_policy` is
 * the field that decides how noisy a flaky endpoint gets.
 *
 * The signing secret is masked to `***` by the API and is never retrievable;
 * rotating issues a new one.
 */
interface WebhookRow {
  id: string;
  target: string;
  events: string;
  retryPolicy: string;
  enabled: boolean;
}

function WebhooksPage() {
  const { slug, select, apps, loadingApps } = useSelectedApp();
  const { data, isPending, error, refetch } = useWebhooks(slug);

  const rows = useMemo<WebhookRow[]>(
    () =>
      (data ?? []).map((w) => ({
        id: w.id,
        target: w.target_url,
        events: w.event_filter?.length ? w.event_filter.join(', ') : 'all events',
        retryPolicy: w.retry_policy,
        enabled: w.enabled,
      })),
    [data]
  );

  const columns: Column<WebhookRow>[] = [
    {
      key: 'target',
      label: 'Target URL',
      render: (w) => <span className="break-all font-mono text-xs">{w.target}</span>,
    },
    {
      key: 'events',
      label: 'Events',
      render: (w) => <span className="text-xs text-muted-foreground">{w.events}</span>,
    },
    {
      key: 'retryPolicy',
      label: 'Retries',
      width: 'w-32',
      render: (w) => <Pill label={w.retryPolicy} />,
    },
    {
      key: 'enabled',
      label: 'State',
      width: 'w-28',
      render: (w) => (
        <Pill
          label={w.enabled ? 'enabled' : 'paused'}
          color={w.enabled ? 'var(--status-good)' : 'var(--status-neutral)'}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Webhooks"
        description="Signed outbound deliveries. Failed attempts back off and dead-letter after seven tries."
        actions={<AppSelect slug={slug} onSelect={select} apps={apps} />}
      />
      <ResourceTable
        rows={rows}
        columns={columns}
        initialSort={{ key: 'target', dir: 'asc' }}
        searchKeys={['target', 'events']}
        searchPlaceholder="Filter by target URL…"
        emptyMessage={slug ? `No webhooks for ${slug}.` : 'Create an app first.'}
        minWidth="min-w-[900px]"
        loading={loadingApps || isPending}
        error={error}
        onRetry={() => void refetch()}
      />
    </div>
  );
}
