import { useMemo, useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Plus } from 'lucide-react';
import { EASE, Item, ItemLi, Stagger, StaggerUl } from '@/components/dashboard/motion';
import {
  Area,
  AreaChart,
  type ChartConfig,
  DitherButton,
  Grid,
  Tooltip,
  XAxis,
  YAxis,
} from '@/components/dither-kit';
import {
  PageHeader,
  Panel,
  RangeSelector,
  StatTile,
  StateBadge,
} from '@/components/dashboard/primitives';
import {
  PROJECTS,
  RANGES,
  buildSeries,
  formatAxisTime,
  formatCompact,
  formatMs,
  formatRelative,
  type RangeKey,
} from '@/lib/mock-data';
import { useData } from '@/lib/store';
import { pageHead } from '@/lib/seo';

export const Route = createFileRoute('/dashboard/')({
  head: () => pageHead({ title: 'Overview' }),
  component: OverviewPage,
});

/** Series → colour on the Invocations chart. One key, one mint fill. */
const INVOCATIONS_CONFIG: ChartConfig = {
  invocations: { label: 'Invocations', color: 'green' },
};

/** Percentage change between the first and second half of a series. */
function deltaOf(values: number[]): number {
  const mid = Math.floor(values.length / 2);
  const prev = values.slice(0, mid).reduce((a, b) => a + b, 0) / Math.max(1, mid);
  const curr = values.slice(mid).reduce((a, b) => a + b, 0) / Math.max(1, values.length - mid);
  return prev === 0 ? 0 : ((curr - prev) / prev) * 100;
}

function OverviewPage() {
  const [range, setRange] = useState<RangeKey>('24h');
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const series = useMemo(() => buildSeries(range), [range]);
  const { workflows, deployments, workflowsForProject, getWorkflow } = useData();

  // Rows for the dither chart: same points, plus a preformatted time label the
  // axis and tooltip can show verbatim. Memoised because the chart keys its
  // entrance replay off the array identity.
  const rows = useMemo(
    () => series.map((s) => ({ ...s, time: formatAxisTime(s.t, range) })),
    [series, range]
  );

  const invocations = series.map((s) => s.invocations);
  const errors = series.map((s) => s.errors);
  const totalInvocations = invocations.reduce((a, b) => a + b, 0);
  const totalErrors = errors.reduce((a, b) => a + b, 0);
  const errorRate = (totalErrors / Math.max(1, totalInvocations)) * 100;
  const avgP50 = series.reduce((a, s) => a + s.p50, 0) / series.length;
  const gbSeconds = series.reduce((a, s) => a + s.gbSeconds, 0);

  const recentDeployments = deployments.slice(0, 6);
  const busiest = [...workflows].sort((a, b) => b.invocations24h - a.invocations24h).slice(0, 5);
  // A just-created function has no traffic, so guard the bar denominator.
  const busiestMax = Math.max(1, busiest[0]?.invocations24h ?? 1);

  return (
    <Stagger className="flex flex-col gap-8">
      <PageHeader
        title="Overview"
        description="Traffic, latency, and spend across every project in this workspace."
        actions={
          <>
            <RangeSelector
              dither
              value={range}
              onChange={setRange}
              options={RANGES.map((r) => ({ key: r.key, label: r.key }))}
            />
            <DitherButton
              color="green"
              variant="solid"
              bloom="low"
              onClick={() => navigate({ to: '/dashboard/workflows/new' })}
              className="h-8 px-3 py-0 text-xs font-medium whitespace-nowrap text-primary-foreground"
            >
              <span className="inline-flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                New function
              </span>
            </DitherButton>
          </>
        }
      />

      {/* KPI row — stat tiles, not a grouped bar chart */}
      <Stagger step={0.06} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Item>
          <StatTile
            label="Invocations"
            value={formatCompact(totalInvocations)}
            delta={deltaOf(invocations)}
            series={invocations}
            tone="green"
          />
        </Item>
        <Item>
          <StatTile
            label="Median latency"
            value={formatMs(avgP50)}
            delta={deltaOf(series.map((s) => s.p50))}
            deltaGood={false}
            series={series.map((s) => s.p50)}
            tone="blue"
          />
        </Item>
        <Item>
          <StatTile
            label="Error rate"
            value={errorRate.toFixed(2)}
            unit="%"
            delta={deltaOf(errors)}
            deltaGood={false}
            series={errors}
            tone="orange"
          />
        </Item>
        <Item>
          <StatTile
            label="Compute"
            value={formatCompact(Math.round(gbSeconds))}
            unit="GB-s"
            delta={deltaOf(series.map((s) => s.gbSeconds))}
            series={series.map((s) => s.gbSeconds)}
            tone="purple"
          />
        </Item>
      </Stagger>

      <Item>
        <Panel title="Invocations" description={RANGES.find((r) => r.key === range)?.label}>
          <AreaChart data={rows} config={INVOCATIONS_CONFIG} bloom="low" className="h-64 w-full">
            <Grid vertical={false} />
            <XAxis dataKey="time" maxTicks={6} />
            <YAxis tickCount={4} tickFormatter={(v) => formatCompact(v)} />
            <Area dataKey="invocations" variant="gradient" />
            <Tooltip labelKey="time" valueFormatter={(v) => formatCompact(v)} />
          </AreaChart>
        </Panel>
      </Item>

      <div className="grid gap-6 lg:grid-cols-2">
        <Item>
          <Panel title="Projects" description={`${PROJECTS.length} projects`}>
            <StaggerUl step={0.05} className="flex flex-col gap-2">
              {PROJECTS.map((project) => {
                const fns = workflowsForProject(project.id);
                const unhealthy = fns.filter((f) => f.state === 'error').length;
                return (
                  <ItemLi key={project.id}>
                    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background p-4">
                      <div className="min-w-0">
                        <p className="font-mono text-sm">{project.name}</p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {fns.length} workflows ·{' '}
                          {unhealthy > 0 ? `${unhealthy} failing` : 'all healthy'}
                        </p>
                      </div>
                      <StateBadge state={unhealthy > 0 ? 'error' : 'running'} />
                    </div>
                  </ItemLi>
                );
              })}
            </StaggerUl>
          </Panel>
        </Item>

        <Item>
          <Panel
            title="Recent deployments"
            actions={
              <Link
                to="/dashboard/workflows"
                className="inline-flex items-center gap-1 text-xs text-brand hover:text-brand-hover"
              >
                All workflows
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            }
          >
            <StaggerUl step={0.04} className="flex flex-col divide-y divide-border">
              {recentDeployments.map((dep) => {
                const fn = getWorkflow(dep.workflowId);
                return (
                  <ItemLi
                    key={dep.id}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
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
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{dep.message}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        <span className="font-mono">{fn?.name}</span> · {dep.author} ·{' '}
                        <span className="font-mono">{dep.commit}</span>
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground [font-variant-numeric:tabular-nums]">
                      {formatRelative(dep.createdAt)}
                    </span>
                  </ItemLi>
                );
              })}
            </StaggerUl>
          </Panel>
        </Item>
      </div>

      <Item>
        <Panel title="Busiest workflows" description="By invocations in the last 24 hours">
          <StaggerUl step={0.05} className="flex flex-col divide-y divide-border">
            {busiest.map((fn, i) => {
              const share = fn.invocations24h / busiestMax;
              const width = `${Math.max(4, share * 100)}%`;
              return (
                <ItemLi key={fn.id} className="py-3 first:pt-0 last:pb-0">
                  <Link
                    to="/dashboard/workflows/$workflowId"
                    params={{ workflowId: fn.id }}
                    className="group flex items-center gap-4"
                  >
                    <span className="w-40 shrink-0 truncate font-mono text-sm group-hover:text-brand">
                      {fn.name}
                    </span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      {/* Bars grow from the left once the row has landed —
                          the one place a "chart" here gets to move. */}
                      <motion.span
                        className="block h-full rounded-full"
                        style={{ background: 'var(--chart-1)' }}
                        initial={reduce ? { width } : { width: 0 }}
                        animate={{ width }}
                        transition={{ duration: 0.7, delay: 0.25 + i * 0.05, ease: EASE }}
                      />
                    </span>
                    <span className="w-16 shrink-0 text-right text-sm text-muted-foreground [font-variant-numeric:tabular-nums]">
                      {formatCompact(fn.invocations24h)}
                    </span>
                  </Link>
                </ItemLi>
              );
            })}
          </StaggerUl>
        </Panel>
      </Item>
    </Stagger>
  );
}
