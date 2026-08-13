import { createFileRoute } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/dashboard/primitives';
import { Pill, ResourceTable, type Column } from '@/components/dashboard/resource-table';
import { SECRETS, type Secret } from '@/lib/mock-resources';
import { formatRelative, getWorkflow } from '@/lib/mock-data';

export const Route = createFileRoute('/dashboard/secrets')({ component: SecretsPage });

const COLUMNS: Column<Secret>[] = [
  {
    key: 'key',
    label: 'Key',
    render: (s) => (
      <span className="flex flex-col">
        <span className="font-mono">{s.key}</span>
        {/* Values are never rendered — secrets are write-only once stored. */}
        <span className="mt-0.5 font-mono text-xs text-muted-foreground">••••••••••••</span>
      </span>
    ),
  },
  {
    key: 'scope',
    label: 'Scope',
    width: 'w-40',
    render: (s) => (
      <span className="flex items-center gap-2">
        <Pill label={s.scope} color={s.scope === 'workspace' ? 'var(--brand)' : undefined} />
        {s.workflowId && (
          <span className="font-mono text-xs text-muted-foreground">
            {getWorkflow(s.workflowId)?.name}
          </span>
        )}
      </span>
    ),
  },
  { key: 'version', label: 'Version', numeric: true, render: (s) => `v${s.version}` },
  {
    key: 'lastAccessedAt',
    label: 'Last read',
    numeric: true,
    render: (s) => formatRelative(s.lastAccessedAt),
  },
  {
    key: 'updatedAt',
    label: 'Updated',
    numeric: true,
    render: (s) => formatRelative(s.updatedAt),
  },
];

function SecretsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Secrets"
        description="Encrypted at rest and injected into the microVM at boot. Values cannot be read back."
        actions={
          <Button size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add secret
          </Button>
        }
      />
      <ResourceTable
        rows={SECRETS}
        columns={COLUMNS}
        initialSort={{ key: 'key', dir: 'asc' }}
        searchKeys={['key']}
        searchPlaceholder="Filter by key…"
        emptyMessage="No secrets match these filters."
        minWidth="min-w-[760px]"
      />
    </div>
  );
}
