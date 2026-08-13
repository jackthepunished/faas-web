import { useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UsageBars } from '@/components/dashboard/charts';
import { PageHeader, Panel, RangeSelector, StatTile } from '@/components/dashboard/primitives';
import {
  RANGES,
  buildSeries,
  buildUsage,
  formatCompact,
  formatNumber,
  formatUsd,
  type RangeKey,
} from '@/lib/mock-data';

export const Route = createFileRoute('/dashboard/usage')({
  component: UsagePage,
});

function UsagePage() {
  const [range, setRange] = useState<RangeKey>('30d');
  const series = useMemo(() => buildSeries(range), [range]);
  const usage = useMemo(() => buildUsage(), []);

  const totalCost = usage.reduce((a, l) => a + l.cost, 0);
  const gbSeconds = series.reduce((a, s) => a + s.gbSeconds, 0);
  const invocations = series.reduce((a, s) => a + s.invocations, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Usage & billing"
        description="Metered against real compute. Idle functions cost nothing."
        actions={
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Current bill"
          value={formatUsd(totalCost)}
          series={series.map((s) => s.gbSeconds)}
          color="var(--chart-3)"
        />
        <StatTile label="Compute" value={formatCompact(Math.round(gbSeconds))} unit="GB-s" />
        <StatTile label="Invocations" value={formatCompact(invocations)} />
      </div>

      <Panel
        title="Compute consumption"
        description="GB-seconds billed per bucket"
        actions={
          <RangeSelector
            value={range}
            onChange={setRange}
            options={RANGES.map((r) => ({ key: r.key, label: r.key }))}
          />
        }
      >
        <UsageBars data={series} range={range} />
      </Panel>

      {/* The table IS the accessible view of the billing data */}
      <Panel title="Billing breakdown" description="Billing period to date">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {['Line item', 'Quantity', 'Included', 'Billable', 'Unit price', 'Cost'].map(
                  (h, i) => (
                    <th
                      key={h}
                      className={`label-mono px-3 py-2.5 font-medium text-muted-foreground ${
                        i > 0 ? 'text-right' : ''
                      }`}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {usage.map((line) => (
                <tr key={line.label}>
                  <td className="px-3 py-3">
                    <p className="font-medium">{line.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{line.unit}</p>
                  </td>
                  <td className="px-3 py-3 text-right [font-variant-numeric:tabular-nums]">
                    {formatNumber(line.quantity)}
                  </td>
                  <td className="px-3 py-3 text-right text-muted-foreground [font-variant-numeric:tabular-nums]">
                    −{formatNumber(line.included)}
                  </td>
                  <td className="px-3 py-3 text-right [font-variant-numeric:tabular-nums]">
                    {formatNumber(Math.max(0, line.quantity - line.included))}
                  </td>
                  <td className="px-3 py-3 text-right text-muted-foreground [font-variant-numeric:tabular-nums]">
                    ${line.unitPrice.toFixed(7).replace(/0+$/, '')}
                  </td>
                  <td className="px-3 py-3 text-right font-medium [font-variant-numeric:tabular-nums]">
                    {formatUsd(line.cost)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border">
                <td colSpan={5} className="px-3 py-3 text-right text-sm text-muted-foreground">
                  Total due
                </td>
                <td className="px-3 py-3 text-right text-base font-semibold [font-variant-numeric:tabular-nums]">
                  {formatUsd(totalCost)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Free tier: 1M invocations and 400,000 GB-seconds every month, deducted before billing.
        </p>
      </Panel>
    </div>
  );
}
