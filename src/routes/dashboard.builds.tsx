import { useMemo } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '@/components/dashboard/primitives';
import { Pill, ResourceTable, type Column } from '@/components/dashboard/resource-table';
import { useBuilds } from '@/lib/api/queries';
import { formatRelative } from '@/lib/mock-data';
import { consoleHead } from '@/lib/seo';

export const Route = createFileRoute('/dashboard/builds')({
  component: BuildsPage,
  head: () => consoleHead('builds'),
});

/**
 * Image builds, from `/v1/builds`.
 *
 * `failure_class` is the useful column on a bad day: the API separates a build
 * the customer broke (`user_error`) from one the platform broke (`oom`,
 * `timeout`, `infra`), which is the difference between "fix your Dockerfile"
 * and "retry". Flattening both into "failed" would throw that away.
 */
interface BuildRow {
  id: string;
  kind: string;
  status: string;
  failureClass: string;
  sourceBytes: number;
  duration: number;
  enqueuedAt: string;
}

const STATUS_COLOR: Record<string, string> = {
  succeeded: 'var(--status-good)',
  running: 'var(--status-warning)',
  queued: 'var(--chart-muted)',
  failed: 'var(--status-critical)',
};

function formatBytes(bytes: number): string {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function formatWhen(value: string | undefined): string {
  if (!value) return '—';
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? '—' : formatRelative(ms);
}

function BuildsPage() {
  const { data, isPending, error, refetch } = useBuilds();

  const rows = useMemo<BuildRow[]>(
    () =>
      (data?.items ?? []).map((b) => ({
        id: b.id,
        kind: b.kind,
        status: b.status,
        failureClass: b.failure_class ?? '',
        sourceBytes: b.source_bytes,
        duration: b.duration_seconds ?? 0,
        enqueuedAt: b.enqueued_at,
      })),
    [data]
  );

  const columns: Column<BuildRow>[] = [
    {
      key: 'status',
      label: 'Status',
      width: 'w-32',
      render: (b) => <Pill label={b.status} color={STATUS_COLOR[b.status]} />,
    },
    { key: 'kind', label: 'Source', width: 'w-32', render: (b) => <Pill label={b.kind} /> },
    {
      key: 'failureClass',
      label: 'Failure',
      width: 'w-32',
      render: (b) =>
        b.failureClass ? (
          <Pill
            label={b.failureClass}
            // A user error is not an incident; an infra failure is.
            color={
              b.failureClass === 'user_error' ? 'var(--status-warning)' : 'var(--status-critical)'
            }
          />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: 'sourceBytes',
      label: 'Source size',
      numeric: true,
      render: (b) => (
        <span className="[font-variant-numeric:tabular-nums]">{formatBytes(b.sourceBytes)}</span>
      ),
    },
    {
      key: 'duration',
      label: 'Duration',
      numeric: true,
      render: (b) => (
        <span className="[font-variant-numeric:tabular-nums]">
          {b.duration ? `${b.duration.toFixed(1)}s` : '—'}
        </span>
      ),
    },
    {
      key: 'enqueuedAt',
      label: 'Queued',
      numeric: true,
      render: (b) => (
        <span className="text-xs text-muted-foreground">{formatWhen(b.enqueuedAt)}</span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Builds"
        description="Image builds behind your deployments, and why any of them failed."
      />
      <ResourceTable
        rows={rows}
        columns={columns}
        initialSort={{ key: 'enqueuedAt', dir: 'desc' }}
        searchKeys={['id', 'kind', 'status']}
        searchPlaceholder="Filter by status or source…"
        emptyMessage="No builds yet."
        minWidth="min-w-[900px]"
        loading={isPending}
        error={error}
        onRetry={() => void refetch()}
      />
    </div>
  );
}
