import { useMemo } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '@/components/dashboard/primitives';
import { Pill, ResourceTable, type Column } from '@/components/dashboard/resource-table';
import { useAuditLog } from '@/lib/api/queries';
import { consoleHead } from '@/lib/seo';

export const Route = createFileRoute('/dashboard/audit')({
  component: AuditPage,
  head: () => consoleHead('audit'),
});

/**
 * The account audit trail, from `/v1/audit-log`.
 *
 * Append-only by design: there is no write path and nothing to edit here. The
 * severity the API assigns is carried through rather than re-derived, since it
 * is the server that knows which events matter.
 */
interface AuditRow {
  id: string;
  at: string;
  actor: string;
  kind: string;
  detail: string;
}

function formatWhen(value: string): string {
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? '—' : new Date(ms).toLocaleString();
}

/**
 * Each entry carries a free-form `data` bag whose keys vary by event kind.
 * Rendering it as compact JSON keeps every event legible without pretending
 * there is a fixed schema to build columns from.
 */
function summarise(data: Record<string, unknown> | undefined): string {
  if (!data) return '';
  const parts = Object.entries(data)
    .filter(([, v]) => v !== null && v !== '')
    .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : String(v)}`);
  return parts.join(' ');
}

function AuditPage() {
  const { data, isPending, error, refetch } = useAuditLog();

  const rows = useMemo<AuditRow[]>(
    () =>
      (data?.entries ?? []).map((e) => ({
        id: e.id,
        at: e.received_at,
        actor: e.actor ?? e.account_email ?? '',
        kind: e.kind,
        detail: summarise(e.data),
      })),
    [data]
  );

  const columns: Column<AuditRow>[] = [
    {
      key: 'at',
      label: 'When',
      numeric: true,
      render: (e) => <span className="text-xs text-muted-foreground">{formatWhen(e.at)}</span>,
    },
    {
      key: 'kind',
      label: 'Event',
      width: 'w-56',
      render: (e) => <Pill label={e.kind} />,
    },
    {
      key: 'actor',
      label: 'Actor',
      render: (e) => <span className="text-xs text-muted-foreground">{e.actor || '—'}</span>,
    },
    {
      key: 'detail',
      label: 'Detail',
      render: (e) => (
        <span className="break-all font-mono text-xs text-muted-foreground">{e.detail || '—'}</span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Audit Log"
        description="Every account-level change, append-only. Who did what, and when."
      />
      <ResourceTable
        rows={rows}
        columns={columns}
        initialSort={{ key: 'at', dir: 'desc' }}
        searchKeys={['kind', 'actor', 'detail']}
        searchPlaceholder="Filter by event, actor, or subject…"
        emptyMessage="Nothing recorded yet."
        minWidth="min-w-[900px]"
        loading={isPending}
        error={error}
        onRetry={() => void refetch()}
      />
    </div>
  );
}
