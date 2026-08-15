import { createFileRoute } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/dashboard/primitives';
import { Pill, ResourceTable, type Column } from '@/components/dashboard/resource-table';
import { ALERT_RULES, type AlertRule } from '@/lib/mock-resources';
import { formatRelative } from '@/lib/mock-data';
import { consoleHead } from '@/lib/seo';

export const Route = createFileRoute('/dashboard/alerts')({
  component: AlertsPage,
  head: () => consoleHead('alerts'),
});

const STATE_COLOR: Record<AlertRule['state'], string | undefined> = {
  ok: 'var(--status-good)',
  firing: 'var(--status-critical)',
  paused: undefined,
};

const COLUMNS: Column<AlertRule>[] = [
  { key: 'name', label: 'Rule', render: (a) => a.name },
  {
    key: 'state',
    label: 'State',
    width: 'w-28',
    render: (a) => <Pill label={a.state} color={STATE_COLOR[a.state]} />,
  },
  {
    key: 'metric',
    label: 'Condition',
    render: (a) => (
      <span className="font-mono text-xs text-muted-foreground">
        {a.metric} {a.comparator} {a.threshold}
        {a.unit === 'USD' ? ' USD' : a.unit}
      </span>
    ),
  },
  {
    key: 'windowMinutes',
    label: 'Window',
    numeric: true,
    render: (a) => `${a.windowMinutes}m`,
  },
  { key: 'channel', label: 'Notifies', render: (a) => <Pill label={a.channel} /> },
  {
    key: 'lastTriggeredAt',
    label: 'Last fired',
    numeric: true,
    render: (a) => (a.lastTriggeredAt ? formatRelative(a.lastTriggeredAt) : '—'),
  },
];

function AlertsPage() {
  const firing = ALERT_RULES.filter((a) => a.state === 'firing').length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Alerts"
        description={
          firing > 0
            ? `${firing} rule${firing > 1 ? 's' : ''} currently firing.`
            : 'No rules are firing right now.'
        }
        actions={
          <Button size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            New rule
          </Button>
        }
      />
      <ResourceTable
        rows={ALERT_RULES}
        columns={COLUMNS}
        initialSort={{ key: 'state', dir: 'asc' }}
        searchKeys={['name', 'metric']}
        searchPlaceholder="Filter by rule or metric…"
        emptyMessage="No alert rules match these filters."
        minWidth="min-w-[760px]"
      />
    </div>
  );
}
