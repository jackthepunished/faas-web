import { useEffect, useRef, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Pause, Play, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState, PageHeader } from '@/components/dashboard/primitives';
import { Pill } from '@/components/dashboard/resource-table';
import { AppScope, AppSelect, useSelectedApp } from '@/components/dashboard/app-select';
import { useLogStream } from '@/lib/api/logs';
import { consoleHead } from '@/lib/seo';

export const Route = createFileRoute('/dashboard/logs')({
  component: LogsPage,
  head: () => consoleHead('logs'),
});

/**
 * Live logs, over the SSE stream (see `lib/api/logs.ts`).
 *
 * This page used to render a static fixture list with a level filter. Real
 * lines arrive as plain text — the API does not classify them — so there is no
 * level column to filter on, and inventing one by regexing for "ERROR" would
 * be guessing about someone else's log format.
 *
 * `grep` is sent upstream rather than filtered here, so the server does the
 * work and the browser is not handed lines it will immediately discard.
 */
const STATUS_LABEL: Record<string, { label: string; color?: string }> = {
  idle: { label: 'paused' },
  connecting: { label: 'connecting', color: 'var(--status-warning)' },
  streaming: { label: 'live', color: 'var(--status-good)' },
  ended: { label: 'ended' },
  error: { label: 'disconnected', color: 'var(--status-critical)' },
};

function LogsPage() {
  const appState = useSelectedApp();
  const { slug, select, apps } = appState;
  const [follow, setFollow] = useState(true);
  const [grepInput, setGrepInput] = useState('');
  const [grep, setGrep] = useState('');

  const { lines, status } = useLogStream(slug, { follow, grep });

  // Stick to the bottom as lines arrive, which is the only useful default for a
  // live tail. Scrolling up to read something is handled by pausing.
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (follow) endRef.current?.scrollIntoView({ block: 'end' });
  }, [lines, follow]);

  const badge = STATUS_LABEL[status] ?? STATUS_LABEL.idle;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Logs"
        description="Live output from this app's instances. The stream ends on its own when the app parks."
        actions={<AppSelect slug={slug} onSelect={select} apps={apps} />}
      />

      <AppScope state={appState} resource="logs">
        <div className="flex flex-wrap items-center gap-3">
          <form
            className="relative flex min-w-56 flex-1 items-center sm:max-w-xs"
            onSubmit={(e) => {
              e.preventDefault();
              // Applied on submit, not per keystroke: each change restarts the
              // stream, and doing that on every letter would thrash the server.
              setGrep(grepInput);
            }}
          >
            <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={grepInput}
              onChange={(e) => setGrepInput(e.target.value)}
              placeholder="grep… (press Enter)"
              className="h-9 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-brand/50"
            />
          </form>

          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => setFollow((f) => !f)}
          >
            {follow ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {follow ? 'Pause' : 'Resume'}
          </Button>

          <Pill label={badge.label} color={badge.color} />

          <span className="ml-auto text-xs text-muted-foreground [font-variant-numeric:tabular-nums]">
            {lines.length} lines
          </span>
        </div>

        {lines.length === 0 ? (
          <EmptyState
            message={
              !slug
                ? 'Create an app first.'
                : follow
                  ? 'Waiting for output. A parked app produces nothing until it wakes.'
                  : 'Paused. Resume to stream logs.'
            }
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="max-h-[60vh] overflow-y-auto p-4">
              {lines.map((line) => (
                <p
                  key={line.id}
                  className="whitespace-pre-wrap break-all font-mono text-xs leading-relaxed"
                >
                  <span className="mr-3 select-none text-muted-foreground">
                    {new Date(line.ts).toLocaleTimeString()}
                  </span>
                  {line.text}
                </p>
              ))}
              <div ref={endRef} />
            </div>
          </div>
        )}
      </AppScope>
    </div>
  );
}
