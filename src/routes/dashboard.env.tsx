import { createFileRoute } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/dashboard/primitives';
import { Pill, ResourceTable, type Column } from '@/components/dashboard/resource-table';
import { ENV_VARS, type EnvVar } from '@/lib/mock-resources';
import { formatRelative, getWorkflow } from '@/lib/mock-data';
import { consoleHead } from '@/lib/seo';

export const Route = createFileRoute('/dashboard/env')({
  component: EnvPage,
  head: () => consoleHead('env'),
});

const ENV_COLOR: Record<EnvVar['environment'], string | undefined> = {
  production: 'var(--status-good)',
  preview: 'var(--status-warning)',
  development: undefined,
};

const COLUMNS: Column<EnvVar>[] = [
  { key: 'key', label: 'Key', render: (e) => <span className="font-mono">{e.key}</span> },
  {
    key: 'value',
    label: 'Value',
    render: (e) => <span className="font-mono text-muted-foreground">{e.value}</span>,
  },
  {
    key: 'environment',
    label: 'Environment',
    width: 'w-36',
    render: (e) => <Pill label={e.environment} color={ENV_COLOR[e.environment]} />,
  },
  {
    key: 'workflowId',
    label: 'Scope',
    render: (e) => (
      <span className="font-mono text-xs text-muted-foreground">
        {e.workflowId ? (getWorkflow(e.workflowId)?.name ?? '—') : 'all workflows'}
      </span>
    ),
  },
  {
    key: 'updatedAt',
    label: 'Updated',
    numeric: true,
    render: (e) => formatRelative(e.updatedAt),
  },
];

function EnvPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Env Vars"
        description="Plain configuration. Anything sensitive belongs in Secrets instead."
        actions={
          <Button size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add variable
          </Button>
        }
      />
      <ResourceTable
        rows={ENV_VARS}
        columns={COLUMNS}
        initialSort={{ key: 'key', dir: 'asc' }}
        searchKeys={['key', 'value']}
        searchPlaceholder="Filter by key or value…"
        emptyMessage="No variables match these filters."
        minWidth="min-w-[760px]"
      />
    </div>
  );
}
