import { useId, useMemo, useRef, useState } from 'react';
import { createFileRoute, Link, useParams } from '@tanstack/react-router';
import { ArrowLeft, ExternalLink, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AreaChart, PercentileChart } from '@/components/dashboard/charts';
import {
  EmptyState,
  ErrorState,
  LevelTag,
  LoadingState,
  PageHeader,
  Panel,
  RangeSelector,
  StatTile,
  StateBadge,
} from '@/components/dashboard/primitives';
import {
  LOGS,
  RANGES,
  buildSeries,
  formatClock,
  formatCompact,
  formatMs,
  formatRelative,
  type RangeKey,
} from '@/lib/mock-data';
import { useData } from '@/lib/store';
import { useToast } from '@/components/ui/toast';
import { errorMessage } from '@/lib/api/errors';
import { cn } from '@/lib/utils';
import { pageHead, useDocumentTitle } from '@/lib/seo';

const TABS = ['Metrics', 'Deployments', 'Logs', 'Configuration'] as const;
type Tab = (typeof TABS)[number];

export const Route = createFileRoute('/dashboard/workflows/$workflowId')({
  head: () => pageHead({ title: 'Workflow' }),
  // Tab lives in the URL, so a refresh or a shared link lands on the same one.
  // Optional, so links elsewhere need not pass it and the default tab leaves
  // no query string behind.
  validateSearch: (search: Record<string, unknown>): { tab?: Tab } =>
    TABS.includes(search.tab as Tab) ? { tab: search.tab as Tab } : {},
  component: FunctionDetailPage,
});

function FunctionDetailPage() {
  const { workflowId } = useParams({ from: '/dashboard/workflows/$workflowId' });
  const { tab = 'Metrics' } = Route.useSearch();
  const navigate = Route.useNavigate();
  // Replace rather than push, so tab switching does not fill the back stack.
  const setTab = (next: Tab) => navigate({ search: { tab: next }, replace: true });
  const tabsId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // Roving focus: arrows move between tabs and select as they go.
  const onTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    const last = TABS.length - 1;
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = index === last ? 0 : index + 1;
    else if (e.key === 'ArrowLeft') next = index === 0 ? last : index - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    if (next === null) return;
    e.preventDefault();
    tabRefs.current[next]?.focus();
    setTab(TABS[next]);
  };
  const [range, setRange] = useState<RangeKey>('24h');
  const { getWorkflow, deploymentsFor, redeploy, loading, error, refresh } = useData();
  const { toast } = useToast();

  const fn = getWorkflow(workflowId);
  // The route's `head` can only name the id, so the real name is applied here
  // once the store resolves it. Above the early return — it is a hook.
  useDocumentTitle(fn?.name ?? 'Function not found');

  const seedOffset = useMemo(
    () => workflowId.split('').reduce((a, c) => a + c.charCodeAt(0), 0),
    [workflowId]
  );
  const series = useMemo(() => buildSeries(range, seedOffset, 0.12), [range, seedOffset]);

  // Order matters: the app list arrives over the network now, so "not in the
  // list" means "not loaded yet" until the request settles. Claiming 404 first
  // would flash a wrong answer on every cold navigation.
  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={workflowId} />
        <ErrorState error={error} onRetry={refresh} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={workflowId} />
        <LoadingState />
      </div>
    );
  }

  if (!fn) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Function not found" />
        <EmptyState message="This function does not exist or has been deleted." />
      </div>
    );
  }

  const deployments = deploymentsFor(fn.id);
  const isDeploying = fn.state === 'deploying';
  const logs = LOGS.filter((l) => l.workflowId === fn.id).slice(0, 40);
  const totalInvocations = series.reduce((a, s) => a + s.invocations, 0);
  const coldStarts = series.reduce((a, s) => a + s.coldStarts, 0);

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/dashboard/workflows"
        className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        All workflows
      </Link>

      <PageHeader
        title={fn.name}
        description={[fn.runtime, `${fn.memoryMb} MB`, fn.url].filter(Boolean).join(' · ')}
        actions={
          <>
            <StateBadge state={fn.state} />
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={isDeploying}
              onClick={() => {
                // `POST /v1/apps/{slug}/rollback` — a real write, so the toast
                // reports what happened rather than announcing it up front.
                void redeploy(fn.id)
                  .then(() =>
                    toast({
                      kind: 'success',
                      title: 'Rolled back',
                      description: `${fn.name} is serving its previous deployment.`,
                    })
                  )
                  .catch((err: unknown) =>
                    toast({
                      kind: 'error',
                      title: 'Rollback failed',
                      description: errorMessage(err),
                    })
                  );
              }}
            >
              <RotateCw className={cn('h-3.5 w-3.5', isDeploying && 'animate-spin')} />
              {isDeploying ? 'Deploying…' : 'Roll back'}
            </Button>
          </>
        }
      />

      <a
        href={fn.url}
        className="inline-flex w-fit items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:border-brand/40 hover:text-foreground"
      >
        {fn.url}
        <ExternalLink className="h-3 w-3" />
      </a>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Function detail"
        className="flex gap-1 border-b border-border"
      >
        {TABS.map((t, i) => (
          <button
            key={t}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${tabsId}-tab-${t}`}
            aria-selected={tab === t}
            aria-controls={`${tabsId}-panel`}
            tabIndex={tab === t ? 0 : -1}
            onClick={() => setTab(t)}
            onKeyDown={(e) => onTabKeyDown(e, i)}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
              tab === t
                ? 'border-brand text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`${tabsId}-panel`}
        aria-labelledby={`${tabsId}-tab-${tab}`}
        className="flex flex-col gap-6"
      >
        {tab === 'Metrics' && (
          <div className="flex flex-col gap-6">
            <div className="flex justify-end">
              <RangeSelector
                value={range}
                onChange={setRange}
                options={RANGES.map((r) => ({ key: r.key, label: r.key }))}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile
                label="Invocations"
                value={formatCompact(totalInvocations)}
                series={series.map((s) => s.invocations)}
              />
              <StatTile
                label="Cold starts"
                value={formatCompact(coldStarts)}
                series={series.map((s) => s.coldStarts)}
                color="var(--chart-3)"
              />
              <StatTile label="Cold start p50" value={formatMs(fn.coldStartP50Ms)} />
              <StatTile
                label="Error rate"
                value={fn.errorRatePct.toFixed(2)}
                unit="%"
                series={series.map((s) => s.errors)}
                color="var(--chart-2)"
                deltaGood={false}
              />
            </div>

            <Panel title="Response latency" description="Percentile distribution over time">
              <PercentileChart data={series} range={range} />
            </Panel>

            <Panel title="Invocations">
              <AreaChart data={series} range={range} metric="invocations" label="invocations" />
            </Panel>
          </div>
        )}

        {tab === 'Deployments' && (
          <Panel title="Deployment history" description={`${deployments.length} deployments`}>
            <ul className="flex flex-col divide-y divide-border">
              {deployments.map((dep) => (
                <li
                  key={dep.id}
                  className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{
                      background:
                        dep.state === 'succeeded'
                          ? 'var(--status-good)'
                          : dep.state === 'failed'
                            ? 'var(--status-critical)'
                            : 'var(--status-warning)',
                    }}
                  />
                  <span className="font-mono text-xs text-muted-foreground">{dep.version}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">{dep.message}</span>
                  <span className="font-mono text-xs text-muted-foreground">{dep.commit}</span>
                  <span className="text-xs text-muted-foreground">{dep.author}</span>
                  <span className="w-20 text-right text-xs text-muted-foreground [font-variant-numeric:tabular-nums]">
                    {(dep.durationMs / 1000).toFixed(1)}s
                  </span>
                  <span className="w-16 text-right text-xs text-muted-foreground [font-variant-numeric:tabular-nums]">
                    {formatRelative(dep.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        {tab === 'Logs' && (
          <Panel title="Recent logs" description={`Last ${logs.length} entries`}>
            {logs.length === 0 ? (
              <EmptyState message="No log entries in this window." />
            ) : (
              <ul className="flex flex-col gap-0.5 font-mono text-xs">
                {logs.map((log) => (
                  <li
                    key={log.id}
                    className="flex items-start gap-3 rounded px-2 py-1.5 transition-colors hover:bg-muted/50"
                  >
                    <span className="shrink-0 text-muted-foreground [font-variant-numeric:tabular-nums]">
                      {formatClock(log.ts)}
                    </span>
                    <LevelTag level={log.level} />
                    <span className="min-w-0 flex-1">{log.message}</span>
                    <span className="shrink-0 text-muted-foreground [font-variant-numeric:tabular-nums]">
                      {log.durationMs}ms
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        {tab === 'Configuration' && (
          <Panel title="Configuration">
            <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {[
                ['Runtime', fn.runtime],
                ['Memory', `${fn.memoryMb} MB`],
                // The image digest of the live deployment — the API has no
                // version string, and the digest is what actually identifies it.
                ['Current image', fn.version || '—'],
                ['Endpoint', fn.url],
                ['Last deployed', formatRelative(fn.lastDeployedAt)],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-col gap-1 border-b border-border pb-3">
                  <dt className="label-mono text-muted-foreground">{label}</dt>
                  <dd className="font-mono text-sm">{value}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        )}
      </div>
    </div>
  );
}
