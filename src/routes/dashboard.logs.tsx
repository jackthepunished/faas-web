import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { ArrowDown, Check, Copy, Download, Pause, Play, Search, Xmark } from 'iconoir-react';
import { Button } from '@/components/ui/button';
import { EmptyState, LevelTag, PageHeader } from '@/components/dashboard/primitives';
import { Pill } from '@/components/dashboard/resource-table';
import { AppScope, AppSelect, useSelectedApp } from '@/components/dashboard/app-select';
import { LOG_LEVELS, MAX_LINES, useLogStream, type LogLevelFilter } from '@/lib/api/logs';
import { cn } from '@/lib/utils';
import { consoleHead } from '@/lib/seo';

export const Route = createFileRoute('/dashboard/logs')({
  component: LogsPage,
  head: () => consoleHead('logs'),
});

const STATUS_LABEL: Record<string, { label: string; color?: string }> = {
  idle: { label: 'idle' },
  connecting: { label: 'connecting', color: 'var(--status-warning)' },
  streaming: { label: 'live', color: 'var(--status-good)' },
  paused: { label: 'paused', color: 'var(--status-warning)' },
  ended: { label: 'ended' },
  error: { label: 'disconnected', color: 'var(--status-critical)' },
};

const WRAP_KEY = 'gregale.logs.wrap';

/**
 * The live log view, without the page chrome around it.
 *
 * Rendered both by this route and as a tab on the app detail page.
 */
export function LogsBody({ slug }: { slug: string }) {
  const [connected, setConnected] = useState(true);
  const [grepInput, setGrepInput] = useState('');
  const [grep, setGrep] = useState('');
  const [level, setLevel] = useState<LogLevelFilter | ''>('');
  const [wrap, setWrap] = useState(() => localStorage.getItem(WRAP_KEY) !== '0');
  const [copied, setCopied] = useState(false);

  const source = useMemo(() => ({ kind: 'live' as const, slug, grep, level }), [slug, grep, level]);
  const { lines, status, reason, truncated, clear } = useLogStream(source, connected);

  const viewportRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [unseen, setUnseen] = useState(0);
  const lastCount = useRef(0);

  // Scrolling up detaches the tail; a position check rather than a wheel
  // listener, so keyboard and touch behave the same as the mouse.
  const onScroll = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    setAtBottom(bottom);
    if (bottom) setUnseen(0);
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const added = lines.length - lastCount.current;
    lastCount.current = lines.length;
    if (added <= 0) return;
    if (atBottom) el.scrollTop = el.scrollHeight;
    else setUnseen((n) => n + added);
  }, [lines, atBottom]);

  const jumpToLive = () => {
    const el = viewportRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    setAtBottom(true);
    setUnseen(0);
  };

  const asText = () => lines.map((l) => `${new Date(l.ts).toISOString()} ${l.raw}`).join('\n');

  const copy = () => {
    void navigator.clipboard
      .writeText(asText())
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      })
      .catch(() => {});
  };

  const download = () => {
    const blob = new Blob([asText()], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}-${new Date().toISOString().replace(/[:.]/g, '-')}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const badge = STATUS_LABEL[status] ?? STATUS_LABEL.idle;

  return (
    <div className="flex flex-col gap-4">
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

        {/* Filtered server-side, so a narrower level is less traffic, not just
            less on screen. */}
        <div role="group" aria-label="Level" className="flex rounded-md border border-border p-0.5">
          {(['', ...LOG_LEVELS] as const).map((value) => (
            <button
              key={value || 'all'}
              type="button"
              aria-pressed={level === value}
              onClick={() => setLevel(value)}
              className={cn(
                'rounded px-2.5 py-1 text-xs transition-colors',
                level === value
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {value || 'all'}
            </button>
          ))}
        </div>

        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => setConnected((c) => !c)}
        >
          {connected ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {connected ? 'Pause' : 'Resume'}
        </Button>

        <Pill label={badge.label} color={badge.color} />

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            aria-label="Wrap long lines"
            aria-pressed={wrap}
            onClick={() => {
              setWrap((w) => {
                localStorage.setItem(WRAP_KEY, w ? '0' : '1');
                return !w;
              });
            }}
            className={cn(
              'rounded-md px-2 py-1.5 font-mono text-xs transition-colors',
              wrap ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            wrap
          </button>
          <button
            type="button"
            aria-label="Copy the buffer"
            disabled={!lines.length}
            onClick={copy}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            aria-label="Download the buffer"
            disabled={!lines.length}
            onClick={download}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Clear the buffer"
            disabled={!lines.length}
            onClick={() => {
              clear();
              lastCount.current = 0;
              setUnseen(0);
            }}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
          >
            <Xmark className="h-3.5 w-3.5" />
          </button>
          <span className="ml-2 text-xs text-muted-foreground [font-variant-numeric:tabular-nums]">
            {lines.length} lines
          </span>
        </div>
      </div>

      {/* An unknown `level` comes back as an SSE error frame with a code, which
          is worth more than a generic disconnect. */}
      {status === 'error' && reason && (
        <p role="alert" className="text-xs text-muted-foreground">
          The stream stopped: <span className="font-mono">{reason}</span>
        </p>
      )}
      {truncated && (
        <p className="text-xs text-muted-foreground">
          Showing the last {MAX_LINES.toLocaleString()} lines. Earlier output has scrolled out of
          the buffer — download before clearing if you need it.
        </p>
      )}

      {lines.length === 0 ? (
        <EmptyState
          message={
            connected
              ? 'Waiting for output. A parked app produces nothing until it wakes.'
              : 'Paused. Resume to stream logs.'
          }
        />
      ) : (
        <div className="relative overflow-hidden rounded-xl border border-border bg-card">
          <div
            ref={viewportRef}
            onScroll={onScroll}
            role="log"
            aria-label="Log output"
            className="max-h-[60vh] overflow-y-auto p-4"
          >
            {lines.map((line) => (
              <p
                key={line.id}
                className={cn(
                  'flex gap-3 font-mono text-xs leading-relaxed',
                  wrap ? 'break-all' : 'whitespace-nowrap'
                )}
              >
                <span className="shrink-0 select-none text-muted-foreground">
                  {new Date(line.ts).toLocaleTimeString()}
                </span>
                {line.level ? (
                  <LevelTag level={line.level} />
                ) : (
                  <span aria-hidden className="w-14 shrink-0" />
                )}
                <span className={cn('min-w-0', wrap && 'whitespace-pre-wrap')}>{line.text}</span>
              </p>
            ))}
          </div>

          {/* Detached from the tail: say how much was missed, and offer the way
              back rather than yanking the viewport. */}
          {!atBottom && (
            <button
              type="button"
              onClick={jumpToLive}
              className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border bg-popover px-3 py-1.5 text-xs shadow-lg transition-colors hover:border-border-secondary"
            >
              <ArrowDown className="h-3.5 w-3.5" />
              {unseen > 0 ? `${unseen} new ${unseen === 1 ? 'line' : 'lines'}` : 'Jump to live'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function LogsPage() {
  const appState = useSelectedApp();
  const { slug, select, apps } = appState;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Logs"
        description="Live output from this app's instances. The stream ends on its own when the app parks."
        actions={<AppSelect slug={slug} onSelect={select} apps={apps} />}
      />
      <AppScope state={appState} resource="logs">
        <LogsBody slug={slug} />
      </AppScope>
    </div>
  );
}
