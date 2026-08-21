import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

// `openapi-fetch` captures `globalThis.fetch` and the base URL when the client
// is created, which happens on import — so both stubs have to exist before
// `./auth` loads. The base URL matters too: Node's `Request` rejects the
// relative URLs the app uses in production, and that TypeError would be
// swallowed by `signOut` and read as a passing test.
const { fetchMock } = vi.hoisted(() => {
  vi.stubEnv('VITE_API_URL', 'http://localhost');
  const fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock };
});

import { AuthProvider, useAuth } from './auth';

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

function problem(status: number, code: string) {
  return new Response(JSON.stringify({ code, status, title: code }), {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  });
}

function pathOf(input: RequestInfo | URL): string {
  const url = input instanceof Request ? input.url : String(input);
  return new URL(url, 'http://localhost').pathname;
}

function logoutRequest(): Request | undefined {
  return fetchMock.mock.calls
    .map(([input]) => input)
    .find(
      (input): input is Request => input instanceof Request && pathOf(input) === '/v1/auth/logout'
    );
}

describe('AuthProvider.signOut', () => {
  beforeEach(() => fetchMock.mockReset());
  afterEach(() => {
    vi.restoreAllMocks();
    document.cookie = 'faas_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  });

  it('echoes the CSRF cookie so the server actually revokes the session', async () => {
    document.cookie = 'faas_csrf=tok-123';
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(() => result.current.signOut());

    const logout = logoutRequest();
    expect(logout).toBeDefined();
    expect(logout?.method).toBe('POST');
    // Without this header the server answers 400 `csrf_mismatch` and the
    // session cookie stays valid — the bug this test pins.
    expect(logout?.headers.get('X-CSRF-Token')).toBe('tok-123');
  });

  it('still clears the local session when the server rejects the logout', async () => {
    window.localStorage.setItem('gregale.session', JSON.stringify({ email: 'a@b.co' }));
    fetchMock.mockImplementation(async (input) =>
      pathOf(input) === '/v1/auth/logout' ? problem(400, 'csrf_mismatch') : problem(401, 'x')
    );
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(() => result.current.signOut());

    expect(result.current.user).toBeNull();
    expect(window.localStorage.getItem('gregale.session')).toBeNull();
    expect(warn).toHaveBeenCalled();
  });
});
