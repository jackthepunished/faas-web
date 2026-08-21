import { useMemo } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/primitives';
import { Pill, ResourceTable, type Column } from '@/components/dashboard/resource-table';
import { AppScope, AppSelect, useSelectedApp } from '@/components/dashboard/app-select';
import { useToast } from '@/components/ui/toast';
import { useAlerts, useDeleteAlert } from '@/lib/api/queries';
import { errorMessage } from '@/lib/api/errors';
import { consoleHead } from '@/lib/seo';

export const Route = createFileRoute('/dashboard/alerts')({
  component: AlertsPage,
  head: () => consoleHead('alerts'),
});

/**
 * Alert rules, from `/v1/apps/{slug}/alerts`.
 *
 * A rule pins a metric to a threshold over a window; when it trips, the
 * dispatcher POSTs a signed payload to the rule's webhook. Account-wide rules
 * (those with an empty `app_id`) appear in every per-app listing, which is why
 * the scope column exists — otherwise the same rule looks duplicated as you
 * switch apps.
 */
interface AlertRow {
  id: string;
  name: string;
  condition: string;
  window: string;
  enabled: boolean;
  scope: string;
}

const COMPARISON: Record<string, string> = { gt: '>', gte: '≥', lt: '<', lte: '≤' };

function AlertsPage() {
  const { toast } = useToast();
  const appState = useSelectedApp();
  const { slug, select, apps } = appState;
  const { data, isPending, error, refetch } = useAlerts(slug);
  const deleteAlert = useDeleteAlert(slug);

  const rows = useMemo<AlertRow[]>(
    () =>
      (data ?? []).map((a) => ({
        id: a.id,
        name: a.name,
        condition: `${a.metric} ${COMPARISON[a.comparison] ?? a.comparison} ${a.threshold}`,
        window: a.window_spec,
        enabled: a.enabled,
        scope: a.app_id ? 'app' : 'account',
      })),
    [data]
  );

  const columns: Column<AlertRow>[] = [
    { key: 'name', label: 'Rule' },
    {
      key: 'condition',
      label: 'Condition',
      render: (a) => <span className="font-mono text-xs">{a.condition}</span>,
    },
    {
      key: 'window',
      label: 'Window',
      width: 'w-24',
      render: (a) => <span className="font-mono text-xs text-muted-foreground">{a.window}</span>,
    },
    {
      key: 'scope',
      label: 'Scope',
      width: 'w-28',
      render: (a) => (
        <Pill label={a.scope} color={a.scope === 'account' ? 'var(--brand)' : undefined} />
      ),
    },
    {
      key: 'enabled',
      label: 'State',
      width: 'w-28',
      render: (a) => (
        <Pill
          label={a.enabled ? 'enabled' : 'paused'}
          color={a.enabled ? 'var(--status-good)' : 'var(--status-neutral)'}
        />
      ),
    },
    {
      key: 'id',
      label: '',
      width: 'w-12',
      render: (a) => (
        <button
          type="button"
          aria-label={`Delete rule ${a.name}`}
          onClick={() => {
            void deleteAlert
              .mutateAsync(a.id)
              .then(() => toast({ kind: 'success', title: 'Rule deleted' }))
              .catch((err: unknown) =>
                toast({ kind: 'error', title: 'Could not delete', description: errorMessage(err) })
              );
          }}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Alerts"
        description="Threshold rules on your app metrics. A breach POSTs a signed payload to the rule's webhook."
        actions={<AppSelect slug={slug} onSelect={select} apps={apps} />}
      />

      <AppScope state={appState} resource="alert rules">
        <ResourceTable
          rows={rows}
          columns={columns}
          initialSort={{ key: 'name', dir: 'asc' }}
          searchKeys={['name', 'condition']}
          searchPlaceholder="Filter by rule name…"
          emptyMessage={`No alert rules for ${slug}.`}
          minWidth="min-w-[880px]"
          loading={isPending}
          error={error}
          onRetry={() => void refetch()}
        />
      </AppScope>
    </div>
  );
}
