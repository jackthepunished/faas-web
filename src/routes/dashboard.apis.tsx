import { createFileRoute } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/dashboard/primitives';
import { Pill, ResourceTable, type Column } from '@/components/dashboard/resource-table';
import { API_ROUTES, type ApiRoute } from '@/lib/mock-resources';
import { formatCompact, formatMs, getWorkflow } from '@/lib/mock-data';
import { consoleHead } from '@/lib/seo';

export const Route = createFileRoute('/dashboard/apis')({
  component: ApisPage,
  head: () => consoleHead('apis'),
});

const METHOD_COLOR: Record<string, string> = {
  GET: 'var(--chart-1)',
  POST: 'var(--status-good)',
  PUT: 'var(--status-warning)',
  PATCH: 'var(--status-warning)',
  DELETE: 'var(--status-critical)',
};

const COLUMNS: Column<ApiRoute>[] = [
  {
    key: 'method',
    label: 'Method',
    width: 'w-24',
    render: (r) => <Pill label={r.method} color={METHOD_COLOR[r.method]} />,
  },
  { key: 'path', label: 'Path', render: (r) => <span className="font-mono">{r.path}</span> },
  {
    key: 'workflowId',
    label: 'Workflow',
    render: (r) => (
      <span className="font-mono text-xs text-muted-foreground">
        {getWorkflow(r.workflowId)?.name ?? '—'}
      </span>
    ),
  },
  { key: 'auth', label: 'Auth', render: (r) => <Pill label={r.auth} /> },
  {
    key: 'rateLimitPerMin',
    label: 'Rate limit',
    numeric: true,
    render: (r) => `${formatCompact(r.rateLimitPerMin)}/min`,
  },
  {
    key: 'requests24h',
    label: 'Requests 24h',
    numeric: true,
    render: (r) => formatCompact(r.requests24h),
  },
  { key: 'p95Ms', label: 'p95', numeric: true, render: (r) => formatMs(r.p95Ms) },
];

function ApisPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="APIs"
        description="HTTP routes mapped to workflows, with auth and rate limits."
        actions={
          <Button size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            New route
          </Button>
        }
      />
      <ResourceTable
        rows={API_ROUTES}
        columns={COLUMNS}
        initialSort={{ key: 'requests24h', dir: 'desc' }}
        searchKeys={['path', 'method']}
        searchPlaceholder="Filter by path or method…"
        emptyMessage="No API routes match these filters."
      />
    </div>
  );
}
