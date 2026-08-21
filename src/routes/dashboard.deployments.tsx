import { useMemo } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { PageHeader } from '@/components/dashboard/primitives';
import { Pill, ResourceTable, type Column } from '@/components/dashboard/resource-table';
import { formatRelative, type Deployment } from '@/lib/mock-data';
import { useData } from '@/lib/store';
import { useBuilds } from '@/lib/api/queries';
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
  const { deployments, getWorkflow, loading, error, refresh } = useData();
  const builds = useBuilds();
  const navigate = useNavigate();

  // Build duration lives on the build record, not the deployment, so the two
  // have to be joined here. Every row showed "0.0s" before this: the adapter
  // hard-codes durationMs because DeploymentResponse has no such field, and
  // nothing ever read /v1/builds to fill it in.
  const buildSeconds = useMemo(() => {
    const byDeployment = new Map<string, number>();
    for (const b of builds.data?.items ?? []) {
      if (b.duration_seconds != null) byDeployment.set(b.deployment_id, b.duration_seconds);
    }
    return byDeployment;
  }, [builds.data]);

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
            {/* The API carries no author on a deployment, so the separator
                only earns its place when there is something after it. */}
            {d.author ? `${d.commit} · ${d.author}` : d.commit}
          </span>
        </span>
      ),
    },
    {
      key: 'workflowId',
      label: 'App',
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
      // Sorting would order by the placeholder on the row, not the joined
      // figure shown, so the header does not offer it.
      sortable: false,
      render: (d) => {
        const seconds = buildSeconds.get(d.id);
        return (
          <span className="text-xs text-muted-foreground">
            {seconds == null ? '—' : seconds >= 60 ? `${Math.round(seconds / 60)}m` : `${seconds}s`}
          </span>
        );
      },
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
        loading={loading}
        error={error}
        onRetry={refresh}
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
