import createClient, { type Middleware } from 'openapi-fetch';
import type { paths } from './schema';
import { ApiError, toApiError } from './errors';

/**
 * The one HTTP client. Typed end to end against `api/openapi.yaml`, so a
 * renamed field or a dropped endpoint upstream fails `tsc` rather than
 * production.
 *
 * **Base URL is empty on purpose.** `apid` is served from the same origin as
 * this app (gregale.dev answers both `/` and `/v1/*`), so every request is
 * relative. That is what makes the session cookie work at all: `faas_sid` is
 * `HttpOnly; SameSite=Lax`, and the API sends no CORS headers — a cross-origin
 * console could not authenticate against it even with `credentials`. In dev the
 * Vite proxy reproduces that same-origin shape (see `vite.config.ts`).
 *
 * `VITE_API_URL` exists only for pointing a local console at some other box; it
 * requires that box to send CORS headers, which the production one does not.
 */
const BASE_URL = import.meta.env.VITE_API_URL ?? '';

/**
 * Called when the API rejects the session. Set by `AuthProvider` so a cookie
 * that expired mid-session drops the user to the sign-in screen instead of
 * leaving every panel showing an unexplained error.
 *
 * A module-level slot rather than context: middleware runs outside React, and
 * there is exactly one session per document.
 */
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

/** Paths where a 401 is the answer to the question, not an expired session. */
const AUTH_ROUTES = ['/login', '/signup', '/v1/auth/'];

const sessionMiddleware: Middleware = {
  async onRequest({ request }) {
    // Successful POSTs are replay-safe for 24h if they carry a key, and the
    // server echoes `Idempotent-Replayed: true`. Costs nothing to always send
    // one, and turns a double-click or a retry into a no-op rather than a
    // second deployment.
    if (request.method === 'POST' && !request.headers.has('Idempotency-Key')) {
      request.headers.set('Idempotency-Key', crypto.randomUUID());
    }
    return request;
  },

  async onResponse({ request, response }) {
    if (
      response.status === 401 &&
      !AUTH_ROUTES.some((p) => new URL(request.url).pathname.startsWith(p))
    ) {
      onUnauthorized?.();
    }
    return response;
  },
};

export const api = createClient<paths>({
  baseUrl: BASE_URL,
  // Sends and accepts `faas_sid`. Same-origin, so this is a formality in
  // production and load-bearing behind the dev proxy.
  credentials: 'include',
  headers: { Accept: 'application/json' },
});

api.use(sessionMiddleware);

/**
 * The dashboard CSRF token, for the endpoints that demand it in the body.
 *
 * Double-submit: the server sets a `faas_csrf` cookie on every authenticated
 * response and expects the same value echoed in the JSON body, so
 * `VerifyAuthenticated` can compare the two. Unlike `faas_sid` this cookie is
 * deliberately *not* `HttpOnly` — it has to be readable here for the pattern to
 * work at all, and it is useless without the session cookie riding alongside.
 *
 * Returns an empty string when it is missing, which the server rejects with
 * `csrf_mismatch` — the correct outcome, and better than guessing a value.
 */
export function csrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)faas_csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

/**
 * Narrows an `openapi-fetch` result to its data, throwing `ApiError` otherwise.
 *
 * The raw result is a `{ data?, error?, response }` union, which is honest but
 * unusable inside TanStack Query — Query decides success by whether the promise
 * rejects. Everything in `lib/queries.ts` goes through here.
 */
export async function unwrap<T>(
  result: Promise<{ data?: T; error?: unknown; response: Response }>
): Promise<T> {
  const { data, error, response } = await result;
  if (error !== undefined || !response.ok) {
    throw await toApiError(response, error);
  }
  // A 204 has no body, and its callers want the absence, not a fabricated value.
  return data as T;
}

export { ApiError };
