import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '@/components/dashboard/primitives';
import { Pill, ResourceTable, type Column } from '@/components/dashboard/resource-table';
import { WORKERS, type Worker } from '@/lib/mock-resources';
import { consoleHead } from '@/lib/seo';

export const Route = createFileRoute('/dashboard/workers')({
  component: WorkersPage,
  head: () => consoleHead('workers'),
});

const STATE_COLOR: Record<Worker['state'], string | undefined> = {
  online: 'var(--status-good)',
  draining: 'var(--status-warning)',
  offline: undefined,
};

/** Thin utilisation bar — a number plus its share of the ceiling. */
function Meter({ pct }: { pct: number }) {
  const danger = pct > 85;
  return (
    <span className="flex items-center justify-end gap-2">
      <span className="h-1 w-16 overflow-hidden rounded-full bg-muted">
        <span
          className="block h-full rounded-full"
          style={{
            width: `${Math.min(100, pct)}%`,
            background: danger ? 'var(--status-critical)' : 'var(--chart-1)',
          }}
        />
      </span>
      <span className="w-11 text-right">{pct.toFixed(0)}%</span>
    </span>
  );
}

const COLUMNS: Column<Worker>[] = [
  { key: 'name', label: 'Worker', render: (w) => <span className="font-mono">{w.name}</span> },
  {
    key: 'state',
    label: 'State',
    width: 'w-28',
    render: (w) => <Pill label={w.state} color={STATE_COLOR[w.state]} />,
  },
  {
    key: 'region',
    label: 'Region',
    render: (w) => <span className="font-mono text-xs text-muted-foreground">{w.region}</span>,
  },
  {
    key: 'activeTasks',
    label: 'Tasks',
    numeric: true,
    render: (w) => `${w.activeTasks} / ${w.concurrency}`,
  },
  { key: 'cpuPct', label: 'CPU', numeric: true, render: (w) => <Meter pct={w.cpuPct} /> },
  { key: 'memPct', label: 'Memory', numeric: true, render: (w) => <Meter pct={w.memPct} /> },
];

function WorkersPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Workers"
        description="MicroVMs draining queues and running background tasks."
      />
      <ResourceTable
        rows={WORKERS}
        columns={COLUMNS}
        initialSort={{ key: 'cpuPct', dir: 'desc' }}
        searchKeys={['name', 'region']}
        searchPlaceholder="Filter by name or region…"
        emptyMessage="No workers match these filters."
        minWidth="min-w-[720px]"
      />
    </div>
  );
}
