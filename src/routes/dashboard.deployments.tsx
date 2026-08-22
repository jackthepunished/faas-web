import { useMemo, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { PageHeader } from '@/components/dashboard/primitives';
import { Pill, ResourceTable, type Column } from '@/components/dashboard/resource-table';
import { formatRelative, type Deployment } from '@/lib/mock-data';
import { useData } from '@/lib/store';
import { Link } from '@tanstack/react-router';
import {
  useBuilds,
  useDeployment,
  useDeploymentScan,
  useSetDeploymentTraffic,
} from '@/lib/api/queries';
import { useConfirm } from '@/components/ui/confirm';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/lib/auth';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/api/errors';
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

/**
 * Move all live traffic to one deployment.
 *
 * The API calls this a traffic split, and its own description says setting one
 * row's percent zeroes every other live row — which is promotion. The button
 * says what happens rather than implying a weighted rollout the endpoint does
 * not do.
 */
function PromoteButton({
  deployment,
  appName,
  serving,
}: {
  deployment: Deployment | null;
  appName: string;
  serving: number;
}) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const { account } = useAuth();
  const setTraffic = useSetDeploymentTraffic();
  const allowed = account?.plan === 'pro' || account?.plan === 'scale';

  if (!deployment || deployment.state === 'failed') return null;
  if (serving === 100)
    return <span className="mr-auto text-xs text-muted-foreground">Serving all traffic.</span>;

  if (!allowed)
    return (
      <span className="mr-auto text-xs text-muted-foreground">
        Moving traffic needs Pro or Scale.{' '}
        <Link to="/dashboard/plans" className="text-brand hover:underline">
          Compare plans
        </Link>
      </span>
    );

  return (
    <Button
      size="sm"
      disabled={setTraffic.isPending}
      onClick={async () => {
        if (
          !(await confirm({
            title: `Send all traffic to ${deployment.version}?`,
            description: `${appName} starts serving this deployment immediately, and every other deployment drops to zero. Roll back if it misbehaves.`,
            confirmLabel: 'Send all traffic',
          }))
        )
          return;
        void setTraffic
          .mutateAsync({ id: deployment.id, traffic_percent: 100 })
          .then(() =>
            toast({ kind: 'success', title: `${appName} is serving ${deployment.version}` })
          )
          .catch((err: unknown) =>
            toast({
              kind: 'error',
              title: 'Could not move traffic',
              description: errorMessage(err),
            })
          );
      }}
    >
      {setTraffic.isPending ? 'Moving…' : 'Send all traffic here'}
    </Button>
  );
}

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: 'var(--status-critical)',
  HIGH: 'var(--status-serious)',
  MEDIUM: 'var(--status-warning)',
};

/**
 * One deployment: what shipped, what it carries, and what the scanner found.
 * `useDeployment` and `useDeploymentScan` existed with no caller — the rows
 * used to jump straight to the app's tab and the scan was never shown.
 */
function DeploymentDrawer({
  deployment,
  appName,
  onClose,
  onOpenApp,
}: {
  deployment: Deployment | null;
  appName: string;
  onClose: () => void;
  onOpenApp: () => void;
}) {
  const detail = useDeployment(deployment?.id ?? '');
  const scan = useDeploymentScan(deployment?.id ?? '');
  const d = detail.data;

  return (
    <Modal
      open={deployment !== null}
      onClose={onClose}
      title={deployment ? `${appName} · ${deployment.version}` : ''}
      description={deployment?.message}
      width="max-w-2xl"
      footer={
        <>
          <Button size="sm" variant="outline" onClick={onOpenApp}>
            Open {appName}
          </Button>
          <PromoteButton
            deployment={deployment}
            appName={appName}
            serving={d?.traffic_percent ?? 0}
          />
        </>
      }
    >
      {detail.isPending ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : detail.error || !d ? (
        <p className="text-sm text-muted-foreground">{errorMessage(detail.error)}</p>
      ) : (
        <div className="flex flex-col gap-5">
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {[
              ['Status', d.status],
              ['Kind', d.kind],
              ['Traffic', d.traffic_percent != null ? `${d.traffic_percent}%` : '—'],
              ['Min instances', String(d.min_instances ?? 0)],
              ['Image', d.image_digest],
              ['Build', d.build_id ?? '—'],
              ['Created', formatRelative(Date.parse(d.created_at))],
              ['Error', d.error ?? '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex min-w-0 flex-col gap-0.5">
                <dt className="label-mono text-muted-foreground">{k}</dt>
                <dd className="truncate font-mono text-xs" title={v}>
                  {v}
                </dd>
              </div>
            ))}
          </dl>

          <div>
            <p className="label-mono mb-2 text-muted-foreground">Vulnerability scan</p>
            {scan.isPending ? (
              <p className="text-sm text-muted-foreground">Reading scan…</p>
            ) : scan.error || !scan.data ? (
              <p className="text-sm text-muted-foreground">{errorMessage(scan.error)}</p>
            ) : scan.data.status !== 'complete' ? (
              <p className="text-sm text-muted-foreground">
                Scan {scan.data.status}
                {scan.data.error ? ` — ${scan.data.error}` : '.'}
              </p>
            ) : scan.data.vulnerabilities.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing known in this image.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {scan.data.vulnerabilities.map((v) => (
                  <li
                    key={v.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm"
                  >
                    <Pill label={v.severity.toLowerCase()} color={SEVERITY_COLOR[v.severity]} />
                    <span className="font-mono text-xs">{v.id}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {v.package}@{v.version}
                      {v.fixed_in ? ` → ${v.fixed_in}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function DeploymentsPage() {
  const { deployments, getWorkflow, loading, error, refresh } = useData();
  const builds = useBuilds();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Deployment | null>(null);

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
      key: 'trafficPercent',
      label: 'Traffic',
      numeric: true,
      width: 'w-24',
      render: (d) =>
        d.trafficPercent > 0 ? (
          <Pill
            label={`${d.trafficPercent}%`}
            color={d.trafficPercent === 100 ? 'var(--status-good)' : 'var(--status-warning)'}
          />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
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
        onRowClick={(d) => setSelected(d)}
      />

      <DeploymentDrawer
        deployment={selected}
        appName={selected ? (getWorkflow(selected.workflowId)?.name ?? selected.workflowId) : ''}
        onClose={() => setSelected(null)}
        onOpenApp={() => {
          if (!selected) return;
          void navigate({
            to: '/dashboard/workflows/$workflowId',
            params: { workflowId: selected.workflowId },
            search: { tab: 'Deployments' },
          });
        }}
      />
    </div>
  );
}
