import { createFileRoute } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/dashboard/primitives';
import { Pill, ResourceTable, type Column } from '@/components/dashboard/resource-table';
import { CRON_JOBS, type CronJob } from '@/lib/mock-resources';
import { formatMs, formatRelative, getWorkflow, NOW } from '@/lib/mock-data';

export const Route = createFileRoute('/dashboard/crons')({ component: CronsPage });

/** Relative label for a timestamp in the future. */
function formatIn(ts: number): string {
  const diff = Math.max(0, ts - NOW);
  if (diff < 3_600_000) return `in ${Math.max(1, Math.round(diff / 60_000))}m`;
  if (diff < 86_400_000) return `in ${Math.round(diff / 3_600_000)}h`;
  return `in ${Math.round(diff / 86_400_000)}d`;
}

const COLUMNS: Column<CronJob>[] = [
  { key: 'name', label: 'Job', render: (c) => <span className="font-mono">{c.name}</span> },
  {
    key: 'state',
    label: 'State',
    width: 'w-28',
    render: (c) => (
      <Pill label={c.state} color={c.state === 'active' ? 'var(--status-good)' : undefined} />
    ),
  },
  {
    key: 'schedule',
    label: 'Schedule',
    render: (c) => <span className="font-mono text-xs">{c.schedule}</span>,
  },
  {
    key: 'workflowId',
    label: 'Workflow',
    render: (c) => (
      <span className="font-mono text-xs text-muted-foreground">
        {getWorkflow(c.workflowId)?.name ?? '—'}
      </span>
    ),
  },
  {
    key: 'lastRunAt',
    label: 'Last run',
    numeric: true,
    render: (c) => formatRelative(c.lastRunAt),
  },
  { key: 'nextRunAt', label: 'Next run', numeric: true, render: (c) => formatIn(c.nextRunAt) },
  {
    key: 'lastDurationMs',
    label: 'Duration',
    numeric: true,
    render: (c) => formatMs(c.lastDurationMs),
  },
  {
    key: 'successRatePct',
    label: 'Success',
    numeric: true,
    render: (c) => `${c.successRatePct}%`,
  },
];

function CronsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cron Jobs"
        description="Scheduled workflows. Idle between runs, so they cost nothing while waiting."
        actions={
          <Button size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            New job
          </Button>
        }
      />
      <ResourceTable
        rows={CRON_JOBS}
        columns={COLUMNS}
        initialSort={{ key: 'nextRunAt', dir: 'asc' }}
        searchKeys={['name', 'schedule']}
        searchPlaceholder="Filter by name or schedule…"
        emptyMessage="No cron jobs match these filters."
      />
    </div>
  );
}
