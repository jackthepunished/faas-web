import { useEffect, useState } from 'react';

/**
 * Liveness of the API, for the footer badge.
 *
 * The badge used to be hardcoded to "All systems operational", which is the
 * kind of claim that is worst exactly when it matters — it read green while the
 * box was returning 502.
 *
 * The check is deliberately crude: **any HTTP answer means the API is up.** A
 * 401 from `/v1/apps` is a perfectly healthy response — it means `apid` is
 * running, routing, and enforcing auth. Only a transport failure or a 5xx says
 * otherwise. That keeps this from needing a credential or a dedicated health
 * endpoint, neither of which the public surface offers.
 */

export type ApiStatus = 'checking' | 'operational' | 'degraded' | 'unreachable';

/** Cheapest authenticated route: a signed-out caller gets a small 401 body. */
const PROBE = '/v1/apps';

export function useApiStatus(): ApiStatus {
  const [status, setStatus] = useState<ApiStatus>('checking');

  useEffect(() => {
    // Never blocks paint: the badge renders as "checking" until this settles,
    // and this is a marketing page, not an incident dashboard.
    const controller = new AbortController();

    fetch(PROBE, { method: 'GET', signal: controller.signal, credentials: 'omit' })
      .then((response) => {
        // 5xx is the box failing. Everything else — including 401 and 429 —
        // means it answered, which is what "operational" claims.
        setStatus(response.status >= 500 ? 'degraded' : 'operational');
      })
      .catch((error: unknown) => {
        // An aborted probe is a unmount, not an outage.
        if (error instanceof Error && error.name === 'AbortError') return;
        setStatus('unreachable');
      });

    return () => controller.abort();
  }, []);

  return status;
}

export const STATUS_COPY: Record<ApiStatus, { label: string; token: string }> = {
  checking: { label: 'Checking status', token: 'var(--status-neutral)' },
  operational: { label: 'All systems operational', token: 'var(--status-good)' },
  degraded: { label: 'Degraded performance', token: 'var(--status-warning)' },
  unreachable: { label: 'API unreachable', token: 'var(--status-critical)' },
};
