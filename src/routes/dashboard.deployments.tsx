import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { PageHeader } from '@/components/dashboard/primitives';
import { Pill, ResourceTable, type Column } from '@/components/dashboard/resource-table';
import { formatRelative, type Deployment } from '@/lib/mock-data';
import { useData } from '@/lib/store';
import { consoleHead } from '@/lib/seo';

export const Route = createFileRoute('/dashboard/deployments')({
  component: DeploymentsPage,
  head: () => consoleHead('deployments'),
});

const STATE_COLOR: Record<Deployment['state'], string> = {
  succeeded: 'var(--status-good)',
  failed: 'var(--status-critical)',
  building: 'var(--status-warning)',
};

function DeploymentsPage() {
  const { deployments, getWorkflow } = useData();
  const navigate = useNavigate();

  const columns: Column<Deployment>[] = [
    {
      key: 'state',
      label: 'State',
      width: 'w-28',
      render: (d) => <Pill label={d.state} color={STATE_COLOR[d.state]} />,
    },
    {
      key: 'message',
      label: 'Commit',
      render: (d) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate">{d.message}</span>
          <span className="mt-0.5 font-mono text-xs text-muted-foreground">
            {d.commit} · {d.author}
          </span>
        </span>
      ),
    },
    {
      key: 'workflowId',
      label: 'Workflow',
      render: (d) => (
        <span className="font-mono text-xs text-muted-foreground">
          {getWorkflow(d.workflowId)?.name ?? '—'}
        </span>
      ),
    },
    {
      key: 'version',
      label: 'Version',
      render: (d) => <span className="font-mono text-xs">{d.version}</span>,
    },
    {
      key: 'durationMs',
      label: 'Build',
      numeric: true,
      render: (d) => `${(d.durationMs / 1000).toFixed(1)}s`,
    },
    {
      key: 'createdAt',
      label: 'When',
      numeric: true,
      render: (d) => formatRelative(d.createdAt),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Deployments"
        description="Every build across the workspace, newest first."
      />
      <ResourceTable
        rows={deployments}
        columns={columns}
        initialSort={{ key: 'createdAt', dir: 'desc' }}
        searchKeys={['message', 'commit', 'author', 'version']}
        searchPlaceholder="Filter by commit, author, or version…"
        emptyMessage="No deployments match these filters."
        onRowClick={(d) =>
          navigate({
            to: '/dashboard/workflows/$workflowId',
            params: { workflowId: d.workflowId },
            search: { tab: 'Deployments' },
          })
        }
      />
    </div>
  );
}
