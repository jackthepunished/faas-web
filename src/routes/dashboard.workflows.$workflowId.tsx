import { useId, useRef, useState } from 'react';
import { createFileRoute, Link, useParams } from '@tanstack/react-router';
import { ArrowLeft, ArrowRight, ExternalLink, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Panel,
  RangeSelector,
  StatTile,
  StateBadge,
} from '@/components/dashboard/primitives';
import { formatCompact, formatMs, formatRelative } from '@/lib/mock-data';
import { useAppMetrics, type MetricsRange } from '@/lib/api/queries';
import { useData } from '@/lib/store';
import { useToast } from '@/components/ui/toast';
import { errorMessage } from '@/lib/api/errors';
import { cn } from '@/lib/utils';
import { pageHead, useDocumentTitle } from '@/lib/seo';

const METRIC_RANGES: MetricsRange[] = ['5m', '15m', '1h', '6h', '24h', '7d', '15d'];

const TABS = ['Metrics', 'Deployments', 'Logs', 'Configuration'] as const;
type Tab = (typeof TABS)[number];

export const Route = createFileRoute('/dashboard/workflows/$workflowId')({
  head: () => pageHead({ title: 'App' }),
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
  const [range, setRange] = useState<MetricsRange>('24h');
  const { getWorkflow, deploymentsFor, redeploy, loading, error, refresh } = useData();
  const { toast } = useToast();

  const fn = getWorkflow(workflowId);
  // The route's `head` can only name the id, so the real name is applied here
  // once the store resolves it. Above the early return — it is a hook.
  useDocumentTitle(fn?.name ?? 'App not found');

  // Real per-app aggregates for the Metrics tab. Called with the slug, which is
  // what `workflowId` is.
  const metrics = useAppMetrics(workflowId, range);

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
        <PageHeader title="App not found" />
        <EmptyState message="This app does not exist or has been deleted." />
      </div>
    );
  }

  const deployments = deploymentsFor(fn.id);
  const isDeploying = fn.state === 'deploying';

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/dashboard/workflows"
        className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        All apps
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
      <div role="tablist" aria-label="App detail" className="flex gap-1 border-b border-border">
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
                options={METRIC_RANGES.map((r) => ({ key: r, label: r }))}
              />
            </div>

            {/* Scalars, not a series: `/v1/apps/{slug}/metrics` returns one
                aggregate per window. The sparkline charts that used to sit here
                were drawn from a seeded PRNG and are gone with it. */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile
                label="Requests"
                value={metrics.data ? formatCompact(metrics.data.request_count) : '—'}
              />
              <StatTile
                label="Error rate"
                value={metrics.data ? metrics.data.error_rate_pct.toFixed(2) : '—'}
                unit="%"
                deltaGood={false}
              />
              <StatTile
                label="Cold starts"
                value={metrics.data ? metrics.data.cold_start_pct.toFixed(2) : '—'}
                unit="%"
              />
              <StatTile
                label="Wake p95 (fleet)"
                value={metrics.data ? formatMs(metrics.data.wake_p95_ms) : '—'}
              />
            </div>

            <Panel title="Response latency" description="2xx traffic over the selected window">
              {metrics.error ? (
                <ErrorState error={metrics.error} onRetry={() => void metrics.refetch()} />
              ) : metrics.isPending ? (
                <LoadingState message="Querying metrics…" />
              ) : (
                <div className="grid gap-4 p-5 sm:grid-cols-3">
                  <StatTile label="p50" value={formatMs(metrics.data?.latency_p50_ms ?? 0)} />
                  <StatTile label="p95" value={formatMs(metrics.data?.latency_p95_ms ?? 0)} />
                  <StatTile label="p99" value={formatMs(metrics.data?.latency_p99_ms ?? 0)} />
                </div>
              )}
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
          <Panel title="Logs">
            {/* Logs are an SSE stream, not a list this page can hold. The Logs
                page owns the connection, the tail, and the grep. */}
            <div className="flex flex-col items-start gap-3 p-5">
              <p className="text-sm text-muted-foreground">
                Logs stream live from this app&rsquo;s instances.
              </p>
              <Button asChild size="sm" variant="outline" className="gap-1.5">
                <Link to="/dashboard/logs">
                  Open the log stream
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
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
