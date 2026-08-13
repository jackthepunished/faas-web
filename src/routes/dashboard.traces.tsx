import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '@/components/dashboard/primitives';
import { Pill, ResourceTable, type Column } from '@/components/dashboard/resource-table';
import { TRACES, type Trace } from '@/lib/mock-resources';
import { formatClock, formatMs, getWorkflow } from '@/lib/mock-data';

export const Route = createFileRoute('/dashboard/traces')({ component: TracesPage });

const COLUMNS: Column<Trace>[] = [
  {
    key: 'traceId',
    label: 'Trace',
    render: (t) => <span className="font-mono text-xs">{t.traceId}</span>,
  },
  {
    key: 'status',
    label: 'Status',
    width: 'w-24',
    render: (t) => (
      <Pill
        label={t.status}
        color={t.status === 'ok' ? 'var(--status-good)' : 'var(--status-critical)'}
      />
    ),
  },
  { key: 'operation', label: 'Root operation', render: (t) => <span className="font-mono text-xs">{t.operation}</span> },
  {
    key: 'rootWorkflowId',
    label: 'Workflow',
    render: (t) => (
      <span className="font-mono text-xs text-muted-foreground">
        {getWorkflow(t.rootWorkflowId)?.name ?? '—'}
      </span>
    ),
  },
  { key: 'spans', label: 'Spans', numeric: true },
  {
    key: 'durationMs',
    label: 'Duration',
    numeric: true,
    render: (t) => formatMs(t.durationMs),
  },
  { key: 'ts', label: 'Time', numeric: true, render: (t) => formatClock(t.ts) },
];

function TracesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Traces"
        description="Distributed traces across workflows, queues, and scheduled runs."
      />
      <ResourceTable
        rows={TRACES}
        columns={COLUMNS}
        initialSort={{ key: 'ts', dir: 'desc' }}
        searchKeys={['traceId', 'operation']}
        searchPlaceholder="Filter by trace id or operation…"
        emptyMessage="No traces match these filters."
      />
    </div>
  );
}
