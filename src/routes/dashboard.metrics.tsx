import { useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { AreaChart, PercentileChart, UsageBars } from '@/components/dashboard/charts';
import {
  PageHeader,
  Panel,
  RangeSelector,
  StatTile,
} from '@/components/dashboard/primitives';
import {
  RANGES,
  buildSeries,
  formatCompact,
  formatMs,
  type RangeKey,
} from '@/lib/mock-data';

export const Route = createFileRoute('/dashboard/metrics')({ component: MetricsPage });

function MetricsPage() {
  const [range, setRange] = useState<RangeKey>('24h');
  const series = useMemo(() => buildSeries(range), [range]);

  const invocations = series.reduce((a, s) => a + s.invocations, 0);
  const errors = series.reduce((a, s) => a + s.errors, 0);
  const coldStarts = series.reduce((a, s) => a + s.coldStarts, 0);
  const avgP95 = series.reduce((a, s) => a + s.p95, 0) / series.length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Metrics"
        description="Traffic, latency, and cold starts across every workflow."
        actions={
          <RangeSelector
            value={range}
            onChange={setRange}
            options={RANGES.map((r) => ({ key: r.key, label: r.key }))}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Invocations"
          value={formatCompact(invocations)}
          series={series.map((s) => s.invocations)}
        />
        <StatTile
          label="p95 latency"
          value={formatMs(avgP95)}
          series={series.map((s) => s.p95)}
          color="var(--chart-ord-2)"
          deltaGood={false}
        />
        <StatTile
          label="Cold starts"
          value={formatCompact(coldStarts)}
          series={series.map((s) => s.coldStarts)}
          color="var(--chart-3)"
        />
        <StatTile
          label="Errors"
          value={formatCompact(errors)}
          series={series.map((s) => s.errors)}
          color="var(--chart-2)"
          deltaGood={false}
        />
      </div>

      <Panel title="Response latency" description="Percentile distribution over time">
        <PercentileChart data={series} range={range} />
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Invocations">
          <AreaChart data={series} range={range} metric="invocations" label="invocations" />
        </Panel>
        <Panel title="Cold starts">
          <AreaChart
            data={series}
            range={range}
            metric="coldStarts"
            label="cold starts"
            color="var(--chart-3)"
          />
        </Panel>
      </div>

      <Panel title="Compute consumption" description="GB-seconds per bucket">
        <UsageBars data={series} range={range} />
      </Panel>
    </div>
  );
}
