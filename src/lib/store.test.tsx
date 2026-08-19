import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './auth';
import { DataProvider, useData } from './store';

/**
 * `DataProvider` wraps the whole app, sign-in screen included.
 *
 * Before the session gate it read `/v1/apps`, `/v1/deployments`, and
 * `/v1/apps/metrics` unconditionally, so landing on `/login` fired three
 * requests that could only ever answer 401 — and a 401 outside `AUTH_ROUTES`
 * clears the session hint, so one arriving just after a sign-in signed the user
 * straight back out.
 */

/**
 * Both of these have to happen before `api/client` is imported, hence `hoisted`.
 *
 * - The client reads `globalThis.fetch` when `createClient` runs, so a stub
 *   installed in `beforeEach` arrives too late and the real one is kept —
 *   which would make "no requests were made" pass for the wrong reason.
 * - The client's base URL is empty in the browser, where relative URLs resolve
 *   against the document. Node has no document and `new Request('/v1/apps')`
 *   throws, so the request would die before reaching `fetch` — again passing a
 *   negative assertion for the wrong reason. An absolute base restores the
 *   same-origin shape the app actually runs in.
 */
const fetchMock = vi.hoisted(() => {
  vi.stubEnv('VITE_API_URL', 'http://localhost');
  const fn = vi.fn();
  globalThis.fetch = fn as unknown as typeof fetch;
  return fn;
});

function paths(): string[] {
  return fetchMock.mock.calls.map((call) => {
    const first = call[0] as Request | string;
    return new URL(typeof first === 'string' ? first : first.url, 'http://localhost').pathname;
  });
}

function Probe() {
  const { loading } = useData();
  return <span data-testid="loading">{String(loading)}</span>;
}

function renderProviders() {
  // No retries and no cache carry-over, so each test sees only its own calls.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <DataProvider>
          <Probe />
        </DataProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

/** Empty but correctly *shaped* bodies — the adapters read these directly. */
const BODIES: Record<string, unknown> = {
  '/v1/account': { email: 'ada@example.com', plan: 'hobby' },
  '/v1/apps': [],
  '/v1/deployments': { items: [] },
  '/v1/apps/metrics': { apps: [] },
};

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (input: Request | string) => {
    const { pathname } = new URL(typeof input === 'string' ? input : input.url, 'http://localhost');
    return new Response(JSON.stringify(BODIES[pathname] ?? {}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
});

describe('DataProvider', () => {
  it('reads nothing while signed out', async () => {
    const { getByTestId } = renderProviders();

    // `loading` must settle false rather than hang: a disabled query reports
    // `pending` forever, which would spin every signed-out consumer.
    await waitFor(() => expect(getByTestId('loading')).toHaveTextContent('false'));

    expect(paths()).not.toContain('/v1/apps');
    expect(paths()).not.toContain('/v1/deployments');
    expect(paths()).not.toContain('/v1/apps/metrics');
  });

  it('reads the workspace once a session hint exists', async () => {
    window.localStorage.setItem('gregale.session', JSON.stringify({ email: 'ada@example.com' }));

    renderProviders();

    await waitFor(() => expect(paths()).toContain('/v1/apps'));
    expect(paths()).toContain('/v1/deployments');
  });
});
