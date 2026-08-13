import { createFileRoute } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/dashboard/primitives';
import { Pill, ResourceTable, type Column } from '@/components/dashboard/resource-table';
import { DOMAINS, formatDate, type Domain } from '@/lib/mock-resources';
import { getWorkflow } from '@/lib/mock-data';

export const Route = createFileRoute('/dashboard/domains')({ component: DomainsPage });

const TLS_COLOR: Record<Domain['tls'], string> = {
  active: 'var(--status-good)',
  pending: 'var(--status-warning)',
  error: 'var(--status-critical)',
};

const COLUMNS: Column<Domain>[] = [
  {
    key: 'host',
    label: 'Domain',
    render: (d) => (
      <span className="flex items-center gap-2">
        <span className="font-mono">{d.host}</span>
        {d.primary && <Pill label="primary" color="var(--brand)" />}
      </span>
    ),
  },
  {
    key: 'tls',
    label: 'TLS',
    width: 'w-28',
    render: (d) => <Pill label={d.tls} color={TLS_COLOR[d.tls]} />,
  },
  {
    key: 'workflowId',
    label: 'Routes to',
    render: (d) => (
      <span className="font-mono text-xs text-muted-foreground">
        {getWorkflow(d.workflowId)?.name ?? '—'}
      </span>
    ),
  },
  {
    key: 'certExpiresAt',
    label: 'Cert expires',
    numeric: true,
    render: (d) => formatDate(d.certExpiresAt),
  },
  {
    key: 'verifiedAt',
    label: 'Verified',
    numeric: true,
    render: (d) => (d.verifiedAt ? formatDate(d.verifiedAt) : '—'),
  },
];

function DomainsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Domains"
        description="Custom hostnames and their certificates. TLS is issued and renewed automatically."
        actions={
          <Button size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add domain
          </Button>
        }
      />
      <ResourceTable
        rows={DOMAINS}
        columns={COLUMNS}
        initialSort={{ key: 'host', dir: 'asc' }}
        searchKeys={['host']}
        searchPlaceholder="Filter by hostname…"
        emptyMessage="No domains match these filters."
        minWidth="min-w-[720px]"
      />
    </div>
  );
}
