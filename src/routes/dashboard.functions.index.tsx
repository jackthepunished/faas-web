import { useMemo, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState, PageHeader, StateBadge } from '@/components/dashboard/primitives';
import {
  FUNCTIONS,
  PROJECTS,
  formatCompact,
  formatMs,
  formatRelative,
  type RunState,
} from '@/lib/mock-data';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/dashboard/functions/')({
  component: FunctionsPage,
});

const STATE_FILTERS: { key: RunState | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'running', label: 'Running' },
  { key: 'idle', label: 'Idle' },
  { key: 'error', label: 'Failing' },
  { key: 'deploying', label: 'Deploying' },
];

function FunctionsPage() {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<RunState | 'all'>('all');
  const [projectId, setProjectId] = useState<string>('all');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FUNCTIONS.filter((fn) => {
      if (state !== 'all' && fn.state !== state) return false;
      if (projectId !== 'all' && fn.projectId !== projectId) return false;
      if (q && !fn.name.includes(q) && !fn.runtime.includes(q)) return false;
      return true;
    });
  }, [query, state, projectId]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Functions"
        description="Every deployed function across this workspace."
        actions={
          <Button asChild size="sm" className="gap-1.5">
            <Link to="/dashboard/functions/new">
              <Plus className="h-3.5 w-3.5" />
              New function
            </Link>
          </Button>
        }
      />

      {/* Filters — one row above the table */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative flex min-w-56 flex-1 items-center sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by name or runtime…"
            className="h-9 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-brand/50"
          />
        </label>

        <div className="flex rounded-md border border-border p-0.5">
          {STATE_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={state === f.key}
              onClick={() => setState(f.key)}
              className={cn(
                'rounded px-2.5 py-1 text-xs transition-colors',
                state === f.key
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          aria-label="Filter by project"
          className="h-9 rounded-md border border-border bg-card px-2.5 text-sm outline-none focus:border-brand/50"
        >
          <option value="all">All projects</option>
          {PROJECTS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <span className="ml-auto text-xs text-muted-foreground [font-variant-numeric:tabular-nums]">
          {rows.length} of {FUNCTIONS.length}
        </span>
      </div>

      {rows.length === 0 ? (
        <EmptyState message="No functions match these filters." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  {['Function', 'State', 'Runtime', 'Invocations 24h', 'Avg duration', 'Errors', 'Deployed'].map(
                    (h, i) => (
                      <th
                        key={h}
                        className={cn(
                          'label-mono px-4 py-3 font-medium text-muted-foreground',
                          i >= 3 && 'text-right'
                        )}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((fn) => (
                  <tr key={fn.id} className="group transition-colors hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <Link
                        to="/dashboard/functions/$functionId"
                        params={{ functionId: fn.id }}
                        className="font-mono group-hover:text-brand"
                      >
                        {fn.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">{fn.region}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StateBadge state={fn.state} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="font-mono text-xs">{fn.runtime}</span>
                      <p className="mt-0.5 text-xs">{fn.memoryMb} MB</p>
                    </td>
                    <td className="px-4 py-3 text-right [font-variant-numeric:tabular-nums]">
                      {formatCompact(fn.invocations24h)}
                    </td>
                    <td className="px-4 py-3 text-right [font-variant-numeric:tabular-nums]">
                      {formatMs(fn.avgDurationMs)}
                    </td>
                    <td
                      className="px-4 py-3 text-right [font-variant-numeric:tabular-nums]"
                      style={{
                        color: fn.errorRatePct > 1 ? 'var(--status-critical)' : undefined,
                      }}
                    >
                      {fn.errorRatePct.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground [font-variant-numeric:tabular-nums]">
                      {formatRelative(fn.lastDeployedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
