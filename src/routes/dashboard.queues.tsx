import { createFileRoute } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/dashboard/primitives';
import { Pill, ResourceTable, type Column } from '@/components/dashboard/resource-table';
import { QUEUES, type Queue } from '@/lib/mock-resources';
import { formatCompact } from '@/lib/mock-data';
import { consoleHead } from '@/lib/seo';

export const Route = createFileRoute('/dashboard/queues')({
  component: QueuesPage,
  head: () => consoleHead('queues'),
});

const STATE_COLOR: Record<Queue['state'], string> = {
  healthy: 'var(--status-good)',
  draining: 'var(--status-warning)',
  'backed-up': 'var(--status-critical)',
};

const COLUMNS: Column<Queue>[] = [
  { key: 'name', label: 'Queue', render: (q) => <span className="font-mono">{q.name}</span> },
  {
    key: 'state',
    label: 'State',
    width: 'w-32',
    render: (q) => <Pill label={q.state} color={STATE_COLOR[q.state]} />,
  },
  { key: 'depth', label: 'Depth', numeric: true, render: (q) => formatCompact(q.depth) },
  { key: 'inFlight', label: 'In flight', numeric: true },
  {
    key: 'dlqDepth',
    label: 'Dead letter',
    numeric: true,
    render: (q) => (
      <span style={q.dlqDepth > 50 ? { color: 'var(--status-critical)' } : undefined}>
        {q.dlqDepth}
      </span>
    ),
  },
  { key: 'consumers', label: 'Consumers', numeric: true },
  {
    key: 'throughputPerMin',
    label: 'Throughput',
    numeric: true,
    render: (q) => `${formatCompact(q.throughputPerMin)}/min`,
  },
  {
    key: 'oldestMessageAgeSec',
    label: 'Oldest',
    numeric: true,
    render: (q) => `${q.oldestMessageAgeSec}s`,
  },
];

function QueuesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Queue Jobs"
        description="Message queues and their consumers. Workers wake only when messages land."
        actions={
          <Button size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            New queue
          </Button>
        }
      />
      <ResourceTable
        rows={QUEUES}
        columns={COLUMNS}
        initialSort={{ key: 'depth', dir: 'desc' }}
        searchKeys={['name']}
        searchPlaceholder="Filter by name…"
        emptyMessage="No queues match these filters."
      />
    </div>
  );
}
