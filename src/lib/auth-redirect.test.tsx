import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const { navigate, fetchMock } = vi.hoisted(() => {
  vi.stubEnv('VITE_API_URL', 'http://localhost');
  const fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal('fetch', fetchMock);
  return { navigate: vi.fn(), fetchMock };
});

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }));

import { AuthProvider, useAuth, useRedirectWhenSignedOut } from './auth';

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

function problem(status: number, code: string) {
  return new Response(JSON.stringify({ code, status, title: code }), {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  });
}

describe('useRedirectWhenSignedOut', () => {
  beforeEach(() => {
    navigate.mockReset();
    fetchMock.mockReset();
  });

  it('leaves a signed-in user alone', async () => {
    window.localStorage.setItem('gregale.session', JSON.stringify({ email: 'a@b.co' }));
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ email: 'a@b.co', plan: 'free' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    renderHook(() => useRedirectWhenSignedOut(), { wrapper });
    await act(async () => {});

    expect(navigate).not.toHaveBeenCalled();
  });

  it('sends the user to /login once the session is rejected mid-page', async () => {
    window.localStorage.setItem('gregale.session', JSON.stringify({ email: 'a@b.co' }));
    // Boot check succeeds; a later request answers 401, as an expired cookie would.
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ email: 'a@b.co', plan: 'free' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(
      () => {
        useRedirectWhenSignedOut();
        return useAuth();
      },
      { wrapper }
    );
    await act(async () => {});
    expect(navigate).not.toHaveBeenCalled();

    fetchMock.mockResolvedValue(problem(401, 'session_expired'));
    await act(() => result.current.refreshAccount().catch(() => {}));

    expect(result.current.user).toBeNull();
    expect(navigate).toHaveBeenCalledWith({ to: '/login', replace: true });
  });
});
