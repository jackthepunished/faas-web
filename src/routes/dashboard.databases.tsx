import { createFileRoute } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/dashboard/primitives';
import { Pill, ResourceTable, type Column } from '@/components/dashboard/resource-table';
import { DATABASES, formatBytes, type Database } from '@/lib/mock-resources';
import { consoleHead } from '@/lib/seo';

export const Route = createFileRoute('/dashboard/databases')({
  component: DatabasesPage,
  head: () => consoleHead('databases'),
});

const STATE_COLOR: Record<Database['state'], string> = {
  available: 'var(--status-good)',
  migrating: 'var(--status-warning)',
  degraded: 'var(--status-critical)',
};

const COLUMNS: Column<Database>[] = [
  {
    key: 'name',
    label: 'Database',
    render: (d) => (
      <span className="flex flex-col">
        <span className="font-mono">{d.name}</span>
        <span className="mt-0.5 text-xs text-muted-foreground">
          {d.engine} {d.version}
        </span>
      </span>
    ),
  },
  {
    key: 'state',
    label: 'State',
    width: 'w-32',
    render: (d) => <Pill label={d.state} color={STATE_COLOR[d.state]} />,
  },
  {
    key: 'region',
    label: 'Region',
    render: (d) => <span className="font-mono text-xs text-muted-foreground">{d.region}</span>,
  },
  { key: 'sizeBytes', label: 'Size', numeric: true, render: (d) => formatBytes(d.sizeBytes) },
  {
    key: 'connections',
    label: 'Connections',
    numeric: true,
    render: (d) => {
      const pct = (d.connections / d.maxConnections) * 100;
      return (
        <span style={pct > 80 ? { color: 'var(--status-critical)' } : undefined}>
          {d.connections.toLocaleString('en-US')} / {d.maxConnections.toLocaleString('en-US')}
        </span>
      );
    },
  },
];

function DatabasesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Databases"
        description="Managed Postgres and Redis. Connection strings are injected as secrets at boot."
        actions={
          <Button size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            New database
          </Button>
        }
      />
      <ResourceTable
        rows={DATABASES}
        columns={COLUMNS}
        initialSort={{ key: 'sizeBytes', dir: 'desc' }}
        searchKeys={['name', 'engine', 'region']}
        searchPlaceholder="Filter by name, engine, or region…"
        emptyMessage="No databases match these filters."
        minWidth="min-w-[720px]"
      />
    </div>
  );
}
