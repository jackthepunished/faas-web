import { createFileRoute } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/dashboard/primitives';
import { Pill, ResourceTable, type Column } from '@/components/dashboard/resource-table';
import { BUCKETS, formatBytes, formatDate, type Bucket } from '@/lib/mock-resources';
import { formatCompact } from '@/lib/mock-data';
import { consoleHead } from '@/lib/seo';

export const Route = createFileRoute('/dashboard/storage')({
  component: StoragePage,
  head: () => consoleHead('storage'),
});

const COLUMNS: Column<Bucket>[] = [
  { key: 'name', label: 'Bucket', render: (b) => <span className="font-mono">{b.name}</span> },
  {
    key: 'visibility',
    label: 'Access',
    width: 'w-28',
    render: (b) => (
      <Pill
        label={b.visibility}
        color={b.visibility === 'public' ? 'var(--status-warning)' : undefined}
      />
    ),
  },
  {
    key: 'region',
    label: 'Region',
    render: (b) => <span className="font-mono text-xs text-muted-foreground">{b.region}</span>,
  },
  { key: 'objects', label: 'Objects', numeric: true, render: (b) => formatCompact(b.objects) },
  { key: 'sizeBytes', label: 'Size', numeric: true, render: (b) => formatBytes(b.sizeBytes) },
  { key: 'createdAt', label: 'Created', numeric: true, render: (b) => formatDate(b.createdAt) },
];

function StoragePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Storage"
        description="S3-compatible object storage. Buckets mount into workflows without credentials."
        actions={
          <Button size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            New bucket
          </Button>
        }
      />
      <ResourceTable
        rows={BUCKETS}
        columns={COLUMNS}
        initialSort={{ key: 'sizeBytes', dir: 'desc' }}
        searchKeys={['name', 'region']}
        searchPlaceholder="Filter by name or region…"
        emptyMessage="No buckets match these filters."
        minWidth="min-w-[720px]"
      />
    </div>
  );
}
