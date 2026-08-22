import { useMemo } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Refresh } from 'iconoir-react';
import { PageHeader } from '@/components/dashboard/primitives';
import { Pill, ResourceTable, type Column } from '@/components/dashboard/resource-table';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm';
import { useApps, useInvocations, useReplayInvocation } from '@/lib/api/queries';
import { slugIndex } from '@/lib/api/adapters';
import { errorMessage } from '@/lib/api/errors';
import { formatRelative } from '@/lib/mock-data';
import { consoleHead } from '@/lib/seo';

export const Route = createFileRoute('/dashboard/traces')({
  component: InvocationsPage,
  head: () => consoleHead('traces'),
});

/**
 * Invocations, from `/v1/invocations`.
 *
 * This page was a fabricated span-waterfall "traces" view. The API has no span
 * tree to draw — `/v1/traces/{trace_id}` returns a single trace by id, and there
 * is no endpoint that lists traces to populate a browser. What it does have is
 * a record per invocation, which is the thing you actually want when a request
 * misbehaved, so that is what this shows.
 *
 * Replay re-runs an invocation with its original payload; it is the reason to
 * come here rather than to the logs.
 */
interface InvocationRow {
  id: string;
  app: string;
  state: string;
  source: string;
  route: string;
  attempts: number;
  createdAt: string;
}

const STATE_COLOR: Record<string, string> = {
  completed: 'var(--status-good)',
  dispatching: 'var(--status-warning)',
  pending: 'var(--chart-muted)',
  failed: 'var(--status-critical)',
  dead_letter: 'var(--status-critical)',
  cancelled: 'var(--chart-muted)',
};

function formatWhen(value: string | undefined): string {
  if (!value) return '—';
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? '—' : formatRelative(ms);
}

function InvocationsPage() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const { data, isPending, error, refetch } = useInvocations();
  const { data: apps } = useApps();
  const replay = useReplayInvocation();

  const rows = useMemo<InvocationRow[]>(() => {
    const bySlug = slugIndex(apps ?? []);
    return (data?.invocations ?? []).map((i) => ({
      id: i.id,
      app: bySlug.get(i.app_id) ?? i.app_id,
      state: i.state,
      source: i.source,
      route: [i.method, i.path].filter(Boolean).join(' ') || '—',
      attempts: i.attempts ?? 0,
      createdAt: i.created_at,
    }));
  }, [data, apps]);

  const columns: Column<InvocationRow>[] = [
    {
      key: 'createdAt',
      label: 'When',
      numeric: true,
      render: (i) => (
        <span className="text-xs text-muted-foreground">{formatWhen(i.createdAt)}</span>
      ),
    },
    {
      key: 'app',
      label: 'App',
      render: (i) => <span className="font-mono text-xs">{i.app}</span>,
    },
    {
      key: 'state',
      label: 'State',
      width: 'w-32',
      render: (i) => <Pill label={i.state} color={STATE_COLOR[i.state]} />,
    },
    {
      key: 'source',
      label: 'Source',
      width: 'w-32',
      render: (i) => <Pill label={i.source} />,
    },
    {
      key: 'route',
      label: 'Route',
      render: (i) => <span className="font-mono text-xs text-muted-foreground">{i.route}</span>,
    },
    {
      key: 'attempts',
      label: 'Tries',
      numeric: true,
      width: 'w-20',
      render: (i) => (
        <span className="[font-variant-numeric:tabular-nums]">{i.attempts || '—'}</span>
      ),
    },
    {
      key: 'id',
      label: 'Invocation',
      render: (i) => <span className="font-mono text-xs text-muted-foreground">{i.id}</span>,
    },
    {
      key: 'app',
      label: '',
      width: 'w-12',
      render: (i) => (
        <button
          type="button"
          aria-label={`Replay invocation ${i.id}`}
          onClick={async () => {
            if (
              !(await confirm({
                title: 'Replay this invocation?',
                description:
                  'It is re-issued to the app with the same payload. If the handler is not idempotent, that work happens twice.',
                confirmLabel: 'Replay',
              }))
            )
              return;
            void replay
              .mutateAsync(i.id)
              .then(() => toast({ kind: 'success', title: 'Replayed' }))
              .catch((err: unknown) =>
                toast({ kind: 'error', title: 'Could not replay', description: errorMessage(err) })
              );
          }}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <Refresh className="h-3.5 w-3.5" />
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Invocations"
        description="Every request into your apps, and the ones you can replay with their original payload."
      />
      <ResourceTable
        rows={rows}
        columns={columns}
        initialSort={{ key: 'createdAt', dir: 'desc' }}
        searchKeys={['app', 'state', 'source', 'id']}
        searchPlaceholder="Filter by app, state, or source…"
        emptyMessage="No invocations recorded yet."
        minWidth="min-w-[900px]"
        loading={isPending}
        error={error}
        onRetry={() => void refetch()}
      />
    </div>
  );
}
