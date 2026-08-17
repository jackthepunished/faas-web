import { useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '@/components/dashboard/primitives';
import { ResourceTable, type Column } from '@/components/dashboard/resource-table';
import { useApps, useStorageUsage } from '@/lib/api/queries';
import { slugIndex } from '@/lib/api/adapters';
import { consoleHead } from '@/lib/seo';

export const Route = createFileRoute('/dashboard/storage')({
  component: StoragePage,
  head: () => consoleHead('storage'),
});

/**
 * Storage consumed per app, from `/v1/usage/storage`.
 *
 * This was a list of object-storage buckets. **There are no buckets** — the
 * platform stores VM snapshots and image layers, which is what actually takes
 * up space and what you are billed for. Snapshots are what make a sub-350ms
 * wake possible, so a large snapshot figure is the cost of that speed rather
 * than something to clean up.
 *
 * The endpoint reports a single day, not a range, so the page picks one.
 */
interface StorageRow {
  id: string;
  app: string;
  snapshotBytes: number;
  layerBytes: number;
  totalBytes: number;
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

/** Yesterday in UTC: today's row is still being written. */
function defaultDay(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function StoragePage() {
  const [day, setDay] = useState(defaultDay);
  const { data, isPending, error, refetch } = useStorageUsage(day);
  const { data: apps } = useApps();

  const rows = useMemo<StorageRow[]>(() => {
    const bySlug = slugIndex(apps ?? []);
    return (data?.items ?? []).map((s) => ({
      id: s.app_id,
      app: bySlug.get(s.app_id) ?? s.app_id,
      snapshotBytes: s.snapshot_bytes,
      layerBytes: s.layer_bytes,
      totalBytes: s.snapshot_bytes + s.layer_bytes,
    }));
  }, [data, apps]);

  const columns: Column<StorageRow>[] = [
    { key: 'app', label: 'App', render: (s) => <span className="font-mono text-xs">{s.app}</span> },
    {
      key: 'snapshotBytes',
      label: 'Snapshots',
      numeric: true,
      render: (s) => (
        <span className="[font-variant-numeric:tabular-nums]">{formatBytes(s.snapshotBytes)}</span>
      ),
    },
    {
      key: 'layerBytes',
      label: 'Image layers',
      numeric: true,
      render: (s) => (
        <span className="[font-variant-numeric:tabular-nums]">{formatBytes(s.layerBytes)}</span>
      ),
    },
    {
      key: 'totalBytes',
      label: 'Total',
      numeric: true,
      render: (s) => (
        <span className="[font-variant-numeric:tabular-nums]">{formatBytes(s.totalBytes)}</span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Storage"
        description="VM snapshots and image layers per app. Snapshots are what make a cold wake fast."
        actions={
          <label className="flex items-center gap-2">
            <span className="label-mono text-muted-foreground">Day</span>
            <input
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              aria-label="Usage day"
              className="h-9 rounded-md border border-border bg-card px-2.5 text-sm outline-none focus:border-brand/50"
            />
          </label>
        }
      />
      <ResourceTable
        rows={rows}
        columns={columns}
        initialSort={{ key: 'totalBytes', dir: 'desc' }}
        searchKeys={['app']}
        searchPlaceholder="Filter by app…"
        emptyMessage={`No storage recorded for ${day}.`}
        minWidth="min-w-[760px]"
        loading={isPending}
        error={error}
        onRetry={() => void refetch()}
      />
    </div>
  );
}
