import { useEffect, useMemo, useRef, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Pause, Play, Search } from 'lucide-react';
import { EmptyState, LevelTag, PageHeader } from '@/components/dashboard/primitives';
import { LOGS, formatClock, type LogEntry, type LogLevel } from '@/lib/mock-data';
import { useData } from '@/lib/store';
import { cn } from '@/lib/utils';
import { consoleHead } from '@/lib/seo';

export const Route = createFileRoute('/dashboard/logs')({
  head: () => consoleHead('logs'),
  component: LogsPage,
});

const LEVELS: { key: LogLevel | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'error', label: 'Error' },
  { key: 'warn', label: 'Warn' },
  { key: 'info', label: 'Info' },
  { key: 'debug', label: 'Debug' },
];

const STREAM_MESSAGES: [LogLevel, string][] = [
  ['info', 'request completed'],
  ['info', 'snapshot restored from warm pool'],
  ['info', 'cache hit for object key'],
  ['debug', 'vsock channel opened'],
  ['warn', 'cold start exceeded target budget'],
  ['error', 'upstream timeout after 30s'],
];

function LogsPage() {
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<LogLevel | 'all'>('all');
  const [workflowId, setFunctionId] = useState('all');
  const [live, setLive] = useState(true);
  const { workflows } = useData();

  // Entries that arrived while the stream was running, newest first.
  const [streamed, setStreamed] = useState<LogEntry[]>([]);
  const counter = useRef(0);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => {
      const fn = workflows[Math.floor(Math.random() * workflows.length)];
      if (!fn) return;
      const [lvl, message] = STREAM_MESSAGES[Math.floor(Math.random() * STREAM_MESSAGES.length)];
      const entry: LogEntry = {
        id: `live_${counter.current++}`,
        ts: Date.now(),
        level: lvl,
        workflowId: fn.id,
        requestId: Math.floor(Math.random() * 0xffffffffff)
          .toString(16)
          .padStart(12, '0')
          .slice(0, 12),
        message,
        durationMs: Math.round(4 + Math.random() * 900),
        statusCode: lvl === 'error' ? 500 : lvl === 'warn' ? 429 : 200,
      };
      // Cap the buffer so a long session cannot grow without bound.
      setStreamed((prev) => [entry, ...prev].slice(0, 200));
    }, 1400);
    return () => clearInterval(id);
  }, [live, workflows]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...streamed, ...LOGS]
      .filter((log) => {
        if (level !== 'all' && log.level !== level) return false;
        if (workflowId !== 'all' && log.workflowId !== workflowId) return false;
        if (q && !log.message.toLowerCase().includes(q) && !log.requestId.includes(q)) return false;
        return true;
      })
      .slice(0, 120);
  }, [streamed, query, level, workflowId]);

  const errorCount = rows.filter((l) => l.level === 'error').length;

  // One lookup table instead of a `.find` per rendered row.
  const workflowById = useMemo(() => new Map(workflows.map((fn) => [fn.id, fn])), [workflows]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Logs"
        description="Streamed from every microVM in this workspace."
        actions={
          <button
            type="button"
            onClick={() => setLive((v) => !v)}
            aria-pressed={live}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors',
              live
                ? 'border-border text-foreground'
                : 'border-border text-muted-foreground hover:text-foreground'
            )}
          >
            {live ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            {live ? 'Pause stream' : 'Resume stream'}
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative flex min-w-56 flex-1 items-center sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages or request IDs…"
            className="h-9 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-brand/50"
          />
        </label>

        <div className="flex rounded-md border border-border p-0.5">
          {LEVELS.map((l) => (
            <button
              key={l.key}
              type="button"
              aria-pressed={level === l.key}
              onClick={() => setLevel(l.key)}
              className={cn(
                'rounded px-2.5 py-1 text-xs transition-colors',
                level === l.key
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {l.label}
            </button>
          ))}
        </div>

        <select
          value={workflowId}
          onChange={(e) => setFunctionId(e.target.value)}
          aria-label="Filter by function"
          className="h-9 rounded-md border border-border bg-card px-2.5 text-sm outline-none focus:border-brand/50"
        >
          <option value="all">All workflows</option>
          {workflows.map((fn) => (
            <option key={fn.id} value={fn.id}>
              {fn.name}
            </option>
          ))}
        </select>

        <span className="ml-auto flex items-center gap-3 text-xs text-muted-foreground [font-variant-numeric:tabular-nums]">
          {errorCount > 0 && (
            <span style={{ color: 'var(--status-critical)' }}>{errorCount} errors</span>
          )}
          {rows.length} entries
        </span>
      </div>

      {rows.length === 0 ? (
        <EmptyState message="No log entries match these filters." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="max-h-[62vh] overflow-y-auto">
            <ul className="flex flex-col divide-y divide-border/60 font-mono text-xs">
              {rows.map((log) => {
                const fn = workflowById.get(log.workflowId);
                return (
                  <li
                    key={log.id}
                    className="flex flex-wrap items-start gap-x-3 gap-y-1 px-4 py-2 transition-colors hover:bg-muted/40"
                  >
                    <span className="shrink-0 text-muted-foreground [font-variant-numeric:tabular-nums]">
                      {formatClock(log.ts)}
                    </span>
                    <LevelTag level={log.level} />
                    <span className="w-32 shrink-0 truncate text-brand/80">{fn?.name}</span>
                    <span className="min-w-0 flex-1">{log.message}</span>
                    <span className="shrink-0 text-muted-foreground">{log.requestId}</span>
                    <span
                      className="w-12 shrink-0 text-right [font-variant-numeric:tabular-nums]"
                      style={{
                        color: log.statusCode >= 500 ? 'var(--status-critical)' : undefined,
                      }}
                    >
                      {log.statusCode}
                    </span>
                    <span className="w-14 shrink-0 text-right text-muted-foreground [font-variant-numeric:tabular-nums]">
                      {log.durationMs}ms
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
