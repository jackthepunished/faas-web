import { useEffect, useRef, useState } from 'react';

/**
 * Log streaming, over Server-Sent Events.
 *
 * `/v1/apps/{slug}/logs` is the one endpoint in the console that is not plain
 * JSON, so it does not go through `openapi-fetch` — it is an SSE stream with
 * `event: log` per line and a terminal `event: end`. That also means TanStack
 * Query is the wrong tool: there is no single response to cache, and the data
 * arrives over minutes.
 *
 * `EventSource` is used rather than a streaming fetch because it reconnects on
 * its own and sends same-origin cookies automatically — and same-origin is the
 * only way this API authenticates at all (see `client.ts`).
 *
 * The server closes the stream after ten minutes idle, when the app parks, or
 * when the connection drops. That is an ordinary end, not a failure, so it is
 * reported as `ended` rather than as an error — a parked app is the platform
 * working correctly.
 */

export interface LogLine {
  id: string;
  ts: number;
  text: string;
}

export type StreamStatus = 'idle' | 'connecting' | 'streaming' | 'ended' | 'error';

/** Ring buffer bound. A console tab left open overnight must not eat the heap. */
const MAX_LINES = 2000;

interface StreamState {
  /** Identifies which stream these lines came from. */
  key: string;
  lines: LogLine[];
  status: StreamStatus;
}

const EMPTY: StreamState = { key: '', lines: [], status: 'idle' };

export function useLogStream(slug: string, { follow, grep }: { follow: boolean; grep: string }) {
  const [state, setState] = useState<StreamState>(EMPTY);
  // Ids only have to be unique within this session; the server does not send one.
  const counter = useRef(0);

  // Changing app, grep, or pausing starts a different stream. Carrying the key
  // in state lets the previous stream's lines be discarded by comparison at
  // render time instead of by a setState in the effect body, which would cost a
  // wasted render on every reconnect.
  const key = follow && slug ? `${slug}|${grep.trim()}` : '';

  useEffect(() => {
    if (!key) return;

    counter.current = 0;
    const params = new URLSearchParams({ follow: '1' });
    if (grep.trim()) params.set('grep', grep.trim());

    const source = new EventSource(`/v1/apps/${encodeURIComponent(slug)}/logs?${params}`, {
      withCredentials: true,
    });

    /** Only ever updates the stream this closure opened. */
    const update = (fn: (prev: StreamState) => StreamState) =>
      setState((prev) => fn(prev.key === key ? prev : { key, lines: [], status: 'connecting' }));

    source.addEventListener('log', (event) => {
      const text = (event as MessageEvent<string>).data ?? '';
      update((prev) => {
        const next = [...prev.lines, { id: `l${counter.current++}`, ts: Date.now(), text }];
        return {
          key,
          status: 'streaming',
          // Drop from the front once past the cap.
          lines: next.length > MAX_LINES ? next.slice(next.length - MAX_LINES) : next,
        };
      });
    });

    // The documented terminal event. Closing here stops EventSource from
    // reconnecting to a stream the server has deliberately finished.
    source.addEventListener('end', () => {
      update((prev) => ({ ...prev, key, status: 'ended' }));
      source.close();
    });

    source.onerror = () => {
      // EventSource reports the normal close as an error too, so a stream that
      // already ended must not be downgraded to a failure.
      update((prev) => ({ ...prev, key, status: prev.status === 'ended' ? 'ended' : 'error' }));
      source.close();
    };

    return () => source.close();
  }, [key, slug, grep]);

  // A stream that should be open but has produced nothing yet is connecting;
  // state left over from a previous key is not this stream's.
  if (!key) return { lines: [], status: 'idle' as StreamStatus };
  if (state.key !== key) return { lines: [], status: 'connecting' as StreamStatus };
  return { lines: state.lines, status: state.status };
}
