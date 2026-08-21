import { useMemo } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Play, Trash } from 'iconoir-react';
import { PageHeader } from '@/components/dashboard/primitives';
import { Pill, ResourceTable, type Column } from '@/components/dashboard/resource-table';
import { useToast } from '@/components/ui/toast';
import { useApps, useCrons, useDeleteCron, useRunCron } from '@/lib/api/queries';
import { slugIndex } from '@/lib/api/adapters';
import { errorMessage } from '@/lib/api/errors';
import { formatRelative } from '@/lib/mock-data';
import { consoleHead } from '@/lib/seo';

export const Route = createFileRoute('/dashboard/crons')({
  component: CronsPage,
  head: () => consoleHead('crons'),
});

/**
 * Scheduled jobs, from `/v1/crons`.
 *
 * A cron here is a synthetic POST to a path on one of your apps — there is no
 * separate job runtime. "Run now" fires it out of band without touching the
 * schedule.
 */
interface CronRow {
  id: string;
  app: string;
  schedule: string;
  path: string;
  enabled: boolean;
  lastFiredAt: string | null;
}

function formatWhen(value: string | null | undefined): string {
  if (!value) return 'Never';
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? 'Never' : formatRelative(ms);
}

function CronsPage() {
  const { toast } = useToast();
  const { data, isPending, error, refetch } = useCrons();
  const { data: apps } = useApps();
  const runCron = useRunCron();
  const deleteCron = useDeleteCron();

  const rows = useMemo<CronRow[]>(() => {
    const bySlug = slugIndex(apps ?? []);
    return (data ?? []).map((c) => ({
      id: c.id,
      app: bySlug.get(c.app_id) ?? c.app_id,
      schedule: c.schedule,
      path: c.path,
      enabled: c.enabled,
      lastFiredAt: c.last_fired_at ?? null,
    }));
  }, [data, apps]);

  const columns: Column<CronRow>[] = [
    {
      key: 'schedule',
      label: 'Schedule',
      render: (c) => <span className="font-mono text-xs">{c.schedule}</span>,
    },
    {
      key: 'app',
      label: 'App',
      render: (c) => <span className="font-mono text-xs text-muted-foreground">{c.app}</span>,
    },
    {
      key: 'path',
      label: 'Path',
      render: (c) => <span className="font-mono text-xs text-muted-foreground">{c.path}</span>,
    },
    {
      key: 'enabled',
      label: 'State',
      width: 'w-28',
      render: (c) => (
        <Pill
          label={c.enabled ? 'enabled' : 'paused'}
          color={c.enabled ? 'var(--status-good)' : 'var(--status-neutral)'}
        />
      ),
    },
    {
      key: 'lastFiredAt',
      label: 'Last fired',
      numeric: true,
      render: (c) => (
        <span className="text-xs text-muted-foreground">{formatWhen(c.lastFiredAt)}</span>
      ),
    },
    {
      key: 'id',
      label: '',
      width: 'w-20',
      render: (c) => (
        <span className="flex items-center gap-3">
          <button
            type="button"
            aria-label={`Run ${c.schedule} now`}
            onClick={() => {
              void runCron
                .mutateAsync(c.id)
                .then(() => toast({ kind: 'success', title: 'Cron fired' }))
                .catch((err: unknown) =>
                  toast({ kind: 'error', title: 'Could not fire', description: errorMessage(err) })
                );
            }}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <Play className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label={`Delete cron ${c.id}`}
            onClick={() => {
              void deleteCron
                .mutateAsync(c.id)
                .then(() => toast({ kind: 'success', title: 'Cron deleted' }))
                .catch((err: unknown) =>
                  toast({
                    kind: 'error',
                    title: 'Could not delete',
                    description: errorMessage(err),
                  })
                );
            }}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <Trash className="h-3.5 w-3.5" />
          </button>
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cron Jobs"
        description="Scheduled synthetic requests into your apps. Firing one by hand does not change its schedule."
      />
      <ResourceTable
        rows={rows}
        columns={columns}
        initialSort={{ key: 'schedule', dir: 'asc' }}
        searchKeys={['schedule', 'path', 'app']}
        searchPlaceholder="Filter by schedule or path…"
        emptyMessage="No scheduled jobs yet."
        minWidth="min-w-[820px]"
        loading={isPending}
        error={error}
        onRetry={() => void refetch()}
      />
    </div>
  );
}
