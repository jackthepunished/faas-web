import { useMemo } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/primitives';
import { Pill, ResourceTable, type Column } from '@/components/dashboard/resource-table';
import { useToast } from '@/components/ui/toast';
import { useApps, useDeleteEdgeRule, useEdgeRules } from '@/lib/api/queries';
import { slugIndex } from '@/lib/api/adapters';
import { errorMessage } from '@/lib/api/errors';
import { consoleHead } from '@/lib/seo';

export const Route = createFileRoute('/dashboard/edge-rules')({
  component: EdgeRulesPage,
  head: () => consoleHead('edge-rules'),
});

/**
 * Edge rules, from `/v1/edge-rules`.
 *
 * These run at the gateway before a request ever reaches a VM — routing,
 * rewrites, redirects, CORS, JWT checks, IP allowlists, rate limits,
 * maintenance mode. **Priority is the whole story**: rules are evaluated in
 * order and the first match wins, so the table is sorted by it and cannot be
 * usefully read any other way.
 *
 * The `action` payload is a union of thirteen shapes keyed by `kind`. Rendering
 * each properly is a page of its own; here the kind is shown and the detail is
 * left to the CLI rather than flattened into something misleading.
 */
interface EdgeRuleRow {
  id: string;
  priority: number;
  kind: string;
  app: string;
  host: string;
  path: string;
  methods: string;
  enabled: boolean;
}

function EdgeRulesPage() {
  const { toast } = useToast();
  const { data, isPending, error, refetch } = useEdgeRules();
  const { data: apps } = useApps();
  const deleteRule = useDeleteEdgeRule();

  const rows = useMemo<EdgeRuleRow[]>(() => {
    const bySlug = slugIndex(apps ?? []);
    return (data ?? []).map((r) => ({
      id: r.id,
      priority: r.priority,
      kind: r.kind,
      app: bySlug.get(r.app_id) ?? r.app_id,
      host: r.match_host || '*',
      path: r.match_path || '/*',
      methods: r.match_methods?.length ? r.match_methods.join(', ') : 'ANY',
      enabled: r.enabled,
    }));
  }, [data, apps]);

  const columns: Column<EdgeRuleRow>[] = [
    {
      key: 'priority',
      label: '#',
      numeric: true,
      width: 'w-16',
      render: (r) => <span className="[font-variant-numeric:tabular-nums]">{r.priority}</span>,
    },
    { key: 'kind', label: 'Kind', width: 'w-32', render: (r) => <Pill label={r.kind} /> },
    {
      key: 'app',
      label: 'App',
      render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.app}</span>,
    },
    {
      key: 'host',
      label: 'Host',
      render: (r) => <span className="font-mono text-xs">{r.host}</span>,
    },
    {
      key: 'path',
      label: 'Path',
      render: (r) => <span className="font-mono text-xs">{r.path}</span>,
    },
    {
      key: 'methods',
      label: 'Methods',
      width: 'w-32',
      render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.methods}</span>,
    },
    {
      key: 'enabled',
      label: 'State',
      width: 'w-28',
      render: (r) => (
        <Pill
          label={r.enabled ? 'enabled' : 'disabled'}
          color={r.enabled ? 'var(--status-good)' : 'var(--status-neutral)'}
        />
      ),
    },
    {
      key: 'id',
      label: '',
      width: 'w-12',
      render: (r) => (
        <button
          type="button"
          aria-label={`Delete rule ${r.id}`}
          onClick={() => {
            void deleteRule
              .mutateAsync(r.id)
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
        title="Edge Rules"
        description="Gateway rules applied before a request reaches a VM. Evaluated in priority order; the first match wins."
      />
      <ResourceTable
        rows={rows}
        columns={columns}
        initialSort={{ key: 'priority', dir: 'asc' }}
        searchKeys={['kind', 'host', 'path', 'app']}
        searchPlaceholder="Filter by kind, host, or path…"
        emptyMessage="No edge rules configured."
        minWidth="min-w-[1000px]"
        loading={isPending}
        error={error}
        onRetry={() => void refetch()}
      />
    </div>
  );
}
