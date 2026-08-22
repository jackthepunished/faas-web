import { useCallback, useEffect, useRef, useState } from 'react';
import type { LogLevel } from '@/lib/mock-data';

/**
 * The console's log streams, over Server-Sent Events.
 *
 * Two endpoints answer in the same SSE shape and so share this hook: an app's
 * logs (`/v1/apps/{slug}/logs`, live or read back from the archive) and a
 * build's (`/v1/deployments/{id}/logs`). Both emit `event: log` per line and a
 * terminal `event: end`; the archive puts a reason on the end frame.
 *
 * Deliberately not `openapi-fetch` and not TanStack Query — this is a held-open
 * connection, not a request.
 */

/** The levels the API filters on. `debug` arrives in frames but is not a filter. */
export const LOG_LEVELS = ['info', 'warn', 'error'] as const;
export type LogLevelFilter = (typeof LOG_LEVELS)[number];

export interface LogLine {
  id: string;
  /** When the console saw it, or the frame's own timestamp when it carries one. */
  ts: number;
  level?: LogLevel;
  instanceId?: string;
  /** The message, once the envelope is off. */
  text: string;
  /** The frame exactly as it arrived, for copy and download. */
  raw: string;
}

export type StreamStatus = 'idle' | 'connecting' | 'streaming' | 'paused' | 'ended' | 'error';

/**
 * Where the lines come from.
 *
 * A discriminated union rather than a pile of optional parameters, because the
 * API's own rules are per mode: archive *requires* an instance and a date,
 * live ignores both, and a build stream has neither.
 */
export type StreamSource =
  | { kind: 'live'; slug: string; grep?: string; level?: LogLevelFilter | ''; since?: string }
  | {
      kind: 'archive';
      slug: string;
      instance: string;
      date: string;
      grep?: string;
      level?: LogLevelFilter | '';
    }
  | { kind: 'build'; deploymentId: string; limit?: number };

/** How many lines are kept. Older ones fall off the top, and the UI says so. */
export const MAX_LINES = 2000;

const LEVELS = new Set<LogLevel>(['info', 'warn', 'error', 'debug']);

function asLevel(value: unknown): LogLevel | undefined {
  if (typeof value !== 'string') return undefined;
  const lower = value.toLowerCase();
  if (LEVELS.has(lower as LogLevel)) return lower as LogLevel;
  // Common aliases from structured loggers.
  if (lower === 'warning') return 'warn';
  if (lower === 'err' || lower === 'fatal' || lower === 'panic') return 'error';
  return undefined;
}

function asTimestamp(value: unknown): number | undefined {
  if (typeof value === 'number') return value > 1e12 ? value : value * 1000;
  if (typeof value === 'string') {
    const ms = Date.parse(value);
    if (!Number.isNaN(ms)) return ms;
  }
  return undefined;
}

/**
 * Turn one SSE frame into a line.
 *
 * The spec documents the stream as *structured* and names a `level` field and
 * an `instance_id` field, but never gives the frame's schema. So this parses
 * defensively: JSON when it is JSON, using whichever of the known fields are
 * present, and the raw string when it is not. A frame this does not understand
 * still renders as a line rather than disappearing.
 */
export function parseFrame(data: string, id: string, receivedAt: number): LogLine {
  const raw = data ?? '';
  const trimmed = raw.trim();

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      const message =
        [parsed.msg, parsed.message, parsed.text, parsed.line, parsed.log].find(
          (v) => typeof v === 'string'
        ) ?? raw;
      return {
        id,
        ts: asTimestamp(parsed.ts ?? parsed.time ?? parsed.timestamp) ?? receivedAt,
        level: asLevel(parsed.level ?? parsed.severity),
        instanceId:
          typeof parsed.instance_id === 'string'
            ? parsed.instance_id
            : typeof parsed.instance === 'string'
              ? parsed.instance
              : undefined,
        text: String(message),
        raw,
      };
    } catch {
      // Structured-looking but not parseable: fall through and show it whole.
    }
  }

  return { id, ts: receivedAt, level: levelFromText(raw), text: raw, raw };
}

/**
 * A last resort for plain-text streams: read the level out of the line when it
 * is written in the usual way. Better than colouring nothing.
 */
function levelFromText(line: string): LogLevel | undefined {
  const m = /\b(INFO|WARN|WARNING|ERROR|DEBUG|FATAL|PANIC)\b/.exec(line);
  return m ? asLevel(m[1]) : undefined;
}

/** The URL and the identity of a subscription. */
function describe(source: StreamSource): { url: string; key: string } {
  if (source.kind === 'build') {
    const params = new URLSearchParams({ follow: '1' });
    if (source.limit) params.set('limit', String(source.limit));
    return {
      url: `/v1/deployments/${encodeURIComponent(source.deploymentId)}/logs?${params}`,
      key: `build|${source.deploymentId}|${source.limit ?? ''}`,
    };
  }

  const params = new URLSearchParams();
  if (source.grep?.trim()) params.set('grep', source.grep.trim());
  if (source.level) params.set('level', source.level);

  if (source.kind === 'archive') {
    params.set('archive', '1');
    params.set('instance', source.instance);
    params.set('date', source.date);
  } else {
    params.set('follow', '1');
    if (source.since) params.set('since', source.since);
  }

  return {
    url: `/v1/apps/${encodeURIComponent(source.slug)}/logs?${params}`,
    key: `${source.kind}|${source.slug}|${params.toString()}`,
  };
}

function ready(source: StreamSource): boolean {
  if (source.kind === 'build') return Boolean(source.deploymentId);
  if (source.kind === 'archive') return Boolean(source.slug && source.instance && source.date);
  return Boolean(source.slug);
}

interface StreamState {
  key: string;
  lines: LogLine[];
  status: StreamStatus;
  /** `archive_complete`, `archive_missing`, `archive_degraded`, or an error code. */
  reason?: string;
  /** True once the ring buffer has dropped a line, so the UI can say so. */
  truncated: boolean;
}

const EMPTY: StreamState = { key: '', lines: [], status: 'idle', truncated: false };

/**
 * Subscribe to a log stream.
 *
 * `connected` is the pause switch, and it is deliberately *not* part of the
 * subscription key: pausing closes the connection and keeps the buffer, so you
 * can stop on a line and still read it. Keying on it — which this hook used to
 * do — emptied the screen the moment you pressed Pause.
 */
export function useLogStream(source: StreamSource, connected = true) {
  const [state, setState] = useState<StreamState>(EMPTY);
  const counter = useRef(0);

  const enabled = ready(source);
  const { url, key } = enabled ? describe(source) : { url: '', key: '' };

  useEffect(() => {
    if (!key || !connected) return;

    const source = new EventSource(url, { withCredentials: true });

    // A frame for a different subscription than the one on screen replaces the
    // buffer; a frame for the same one appends to it.
    const update = (fn: (prev: StreamState) => StreamState) =>
      setState((prev) =>
        fn(prev.key === key ? prev : { key, lines: [], status: 'connecting', truncated: false })
      );

    source.addEventListener('log', (event) => {
      const data = (event as MessageEvent<string>).data ?? '';
      update((prev) => {
        const line = parseFrame(data, `l${counter.current++}`, Date.now());
        const next = [...prev.lines, line];
        const over = next.length > MAX_LINES;
        return {
          key,
          status: 'streaming',
          reason: undefined,
          truncated: prev.truncated || over,
          lines: over ? next.slice(next.length - MAX_LINES) : next,
        };
      });
    });

    source.addEventListener('end', (event) => {
      const reason = (event as MessageEvent<string>).data?.trim() || undefined;
      update((prev) => ({ ...prev, key, status: 'ended', reason }));
      source.close();
    });

    // The server reports a bad parameter — an unknown `level`, say — as an
    // error frame with a code, which is worth more than "disconnected".
    source.addEventListener('error', (event) => {
      const data = (event as MessageEvent<string>).data;
      if (!data) return;
      update((prev) => ({ ...prev, key, status: 'error', reason: data.trim() }));
      source.close();
    });

    source.onerror = () => {
      update((prev) => ({
        ...prev,
        key,
        status: prev.status === 'ended' ? 'ended' : 'error',
      }));
      source.close();
    };

    return () => source.close();
  }, [key, url, connected]);

  const clear = useCallback(() => {
    setState((prev) => ({ ...prev, lines: [], truncated: false }));
  }, []);

  if (!enabled) return { lines: [], status: 'idle' as StreamStatus, truncated: false, clear };
  if (state.key !== key)
    return {
      lines: [],
      status: (connected ? 'connecting' : 'idle') as StreamStatus,
      truncated: false,
      clear,
    };

  return {
    lines: state.lines,
    // Paused is a state of the viewer, not of the last connection.
    status: connected ? state.status : ('paused' as StreamStatus),
    reason: state.reason,
    truncated: state.truncated,
    clear,
  };
}
