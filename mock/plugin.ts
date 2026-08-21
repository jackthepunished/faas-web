import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import * as db from './data';

/**
 * Dev-only mock of `apid`, as a Vite middleware.
 *
 * Registered by `vite.config.ts` only when `MOCK_API=1` (`npm run dev:mock`).
 * It answers the same paths the proxy would otherwise forward — `/v1/*`,
 * `POST /login`, `POST /signup` — with real HTTP on the dev origin, so the
 * app's fetch client, its cookies, and the `EventSource` log stream all run
 * unchanged. Nothing here is reachable from a production build: Vite plugins
 * do not ship, and `src/` never imports this directory.
 *
 * Coverage is the set of operations the console actually calls (see the
 * inventory in the PR that added this). Anything else under `/v1` gets a
 * `not_mocked` problem+json and a line on the dev-server console, so a gap
 * announces itself rather than hanging a spinner.
 */

type Handler = (ctx: {
  params: Record<string, string>;
  query: URLSearchParams;
  body: Record<string, unknown>;
  req: IncomingMessage;
  res: ServerResponse;
}) => unknown | Promise<unknown>;

interface Route {
  method: string;
  pattern: RegExp;
  keys: string[];
  handler: Handler;
}

const routes: Route[] = [];

function route(method: string, template: string, handler: Handler) {
  const keys: string[] = [];
  const source = template
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\\\{(\w+)\\\}/g, (_, k: string) => {
      keys.push(k);
      return '([^/]+)';
    });
  routes.push({ method, pattern: new RegExp(`^${source}$`), keys, handler });
}

/** Thrown by a handler to answer with an RFC 7807 problem. */
class Problem extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly detail?: string
  ) {
    super(detail ?? code);
  }
}

/** Signals "204 No Content". */
const NO_CONTENT = Symbol('no-content');
/** Wraps a body with a non-200 status. */
const status = (code: number, body: unknown) => ({ __status: code, body });

const latency = () => Number(process.env.MOCK_LATENCY ?? 180) + Math.random() * 160;

// --- Auth --------------------------------------------------------------------

const SESSION_COOKIE = 'faas_sid=mock-session; Path=/; HttpOnly; SameSite=Lax';
const CSRF_COOKIE = 'faas_csrf=mock-csrf; Path=/; SameSite=Lax';

const login: Handler = ({ body, res }) => {
  const email = String(body.email ?? '');
  const password = String(body.password ?? '');
  if (!email.includes('@'))
    throw new Problem(400, 'invalid_email', 'That does not look like an email address.');
  if (password.length < 12)
    throw new Problem(401, 'invalid_credentials', 'Email or password is incorrect.');
  res.setHeader('Set-Cookie', [SESSION_COOKIE, CSRF_COOKIE]);
  return { account_id: db.ACCOUNT_ID, plan: db.account.plan };
};
route('POST', '/login', login);
route('POST', '/signup', login);
route('POST', '/login/forgot', () => ({}));
route('POST', '/v1/auth/logout', ({ res }) => {
  res.setHeader('Set-Cookie', ['faas_sid=; Path=/; Max-Age=0', 'faas_csrf=; Path=/; Max-Age=0']);
  return NO_CONTENT;
});

route('GET', '/v1/account', () => ({ ...db.account, app_count: db.apps.length }));
route('PATCH', '/v1/account/plan', ({ body }) => {
  const plan = String(body.plan ?? '') as typeof db.account.plan;
  if (!['free', 'hobby', 'pro', 'scale'].includes(plan)) throw new Problem(400, 'invalid_plan');
  db.account.plan = plan;
  db.account.limits.plan = plan;
  return db.account;
});

route('GET', '/v1/auth/sessions', () => ({ sessions: db.sessions }));
route('DELETE', '/v1/auth/sessions/{id}', ({ params }) => {
  const i = db.sessions.findIndex((s) => s.id === params.id);
  if (i < 0) throw new Problem(404, 'session_not_found');
  if (db.sessions[i].current_session) throw new Problem(409, 'cannot_revoke_current_session');
  db.sessions.splice(i, 1);
  return NO_CONTENT;
});
route('POST', '/v1/auth/sessions/revoke_all', () => {
  const others = db.sessions.filter((s) => !s.current_session).length;
  db.sessions.splice(0, db.sessions.length, ...db.sessions.filter((s) => s.current_session));
  return { revoked: others };
});

// --- Apps --------------------------------------------------------------------

function app(slug: string) {
  const found = db.appBySlug(slug);
  if (!found) throw new Problem(404, 'app_not_found', `No app named "${slug}".`);
  return found;
}

route('GET', '/v1/apps', () => db.apps);
route('GET', '/v1/apps/metrics', ({ query }) => {
  const range = query.get('range') ?? '24h';
  return {
    range,
    source: 'prometheus',
    as_of: db.iso(0),
    apps: Object.fromEntries(db.apps.map((a) => [a.slug, db.metricsFor(a, range)])),
  };
});
route('POST', '/v1/apps', ({ body }) => {
  const slug = String(body.slug ?? '').trim();
  if (!/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(slug))
    throw new Problem(400, 'invalid_slug', 'Slugs are lowercase letters, digits, and dashes.');
  if (db.appBySlug(slug)) throw new Problem(409, 'app_exists', `"${slug}" already exists.`);
  const created: db.App = {
    ...db.apps[0],
    id: db.id(),
    slug,
    type: (body.type as db.App['type']) ?? 'function',
    runtime: (body.runtime as db.App['runtime']) ?? 'node24',
    ram_mb: Number(body.ram_mb ?? 256),
    min_instances: 0,
    status: 'pending',
    url: `https://${slug}.gregale.app`,
  };
  db.apps.push(created);
  return status(201, created);
});
route('GET', '/v1/apps/{slug}', ({ params }) => app(params.slug));
route('DELETE', '/v1/apps/{slug}', ({ params }) => {
  const a = app(params.slug);
  db.apps.splice(db.apps.indexOf(a), 1);
  return NO_CONTENT;
});
route('POST', '/v1/apps/{slug}/wake', ({ params }) => {
  app(params.slug).status = 'active';
  return NO_CONTENT;
});
route('POST', '/v1/apps/{slug}/park', ({ params }) => {
  app(params.slug).status = 'parked';
  return NO_CONTENT;
});
route('POST', '/v1/apps/{slug}/rollback', ({ params }) => {
  const a = app(params.slug);
  const previous = db.deployments.filter((d) => d.app_id === a.id && d.status === 'succeeded')[0];
  if (!previous) throw new Problem(409, 'no_previous_deployment', 'Nothing to roll back to.');
  const dep: db.Deployment = {
    ...previous,
    id: db.id(),
    status: 'active',
    created_at: db.iso(0),
    traffic_percent: 100,
  };
  db.deployments.unshift(dep);
  return status(202, dep);
});
route('GET', '/v1/apps/{slug}/metrics', ({ params, query }) =>
  db.metricsFor(app(params.slug), query.get('range') ?? '24h')
);
route('GET', '/v1/apps/{slug}/routes', ({ params }) => db.routesFor(app(params.slug)));

// Per-app config
const listOf = <T>(map: Map<string, T[]>, slug: string) => map.get(app(slug).slug) ?? [];

route('GET', '/v1/apps/{slug}/secrets', ({ params }) => {
  const secrets = listOf(db.secrets, params.slug);
  return { secrets, quota_max: 64, count: secrets.length };
});
route('PUT', '/v1/apps/{slug}/secrets/{key}', ({ params }) => {
  const list = listOf(db.secrets, params.slug);
  const existing = list.find((s) => s.key === params.key);
  const now = db.iso(0);
  if (existing) {
    existing.updated_at = now;
    return existing;
  }
  const created = { key: params.key, kid: db.id().slice(0, 8), created_at: now, updated_at: now };
  list.push(created);
  db.secrets.set(params.slug, list);
  return created;
});
route('DELETE', '/v1/apps/{slug}/secrets/{key}', ({ params }) => {
  const list = listOf(db.secrets, params.slug);
  const i = list.findIndex((s) => s.key === params.key);
  if (i < 0) throw new Problem(404, 'secret_not_found');
  list.splice(i, 1);
  return NO_CONTENT;
});

route('GET', '/v1/apps/{slug}/env', ({ params }) => {
  const env = listOf(db.env, params.slug);
  return { env, env_by_scope: { app: env }, quota_max: 128, count: env.length };
});
route('PUT', '/v1/apps/{slug}/env/{key}', ({ params, body }) => {
  const list = listOf(db.env, params.slug);
  const existing = list.find((e) => e.key === params.key);
  const now = db.iso(0);
  if (existing) {
    existing.updated_at = now;
    return existing;
  }
  const created = {
    key: params.key,
    scope: String(body.scope ?? 'app'),
    created_at: now,
    updated_at: now,
  };
  list.push(created);
  db.env.set(params.slug, list);
  return created;
});
route('DELETE', '/v1/apps/{slug}/env/{key}', ({ params }) => {
  const list = listOf(db.env, params.slug);
  const i = list.findIndex((e) => e.key === params.key);
  if (i < 0) throw new Problem(404, 'env_not_found');
  list.splice(i, 1);
  return NO_CONTENT;
});

route('GET', '/v1/apps/{slug}/upstreams', ({ params }) => {
  const upstreams = listOf(db.upstreams, params.slug);
  return { upstreams, quota_max: 16, count: upstreams.length };
});
route('GET', '/v1/apps/{slug}/alerts', ({ params }) => listOf(db.alerts, params.slug));
route('DELETE', '/v1/apps/{slug}/alerts/{id}', ({ params }) => {
  const list = listOf(db.alerts, params.slug);
  const i = list.findIndex((r) => r.id === params.id);
  if (i < 0) throw new Problem(404, 'alert_rule_not_found');
  list.splice(i, 1);
  return NO_CONTENT;
});
route('GET', '/v1/apps/{slug}/webhooks', ({ params }) => listOf(db.webhooks, params.slug));

route('GET', '/v1/apps/{slug}/queues/state', ({ params }) => db.queueState(app(params.slug)));
route('GET', '/v1/apps/{slug}/queues/peek', ({ params }) => db.queuePeek(app(params.slug)));
route('GET', '/v1/apps/{slug}/queues/dead_letter', ({ params }) =>
  db.queueDeadLetter(app(params.slug))
);

// --- Logs (SSE) ---------------------------------------------------------------

route('GET', '/v1/apps/{slug}/logs', ({ params, query, req, res }) => {
  const a = app(params.slug);
  const grep = query.get('grep')?.toLowerCase() ?? '';
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write(': mock log stream\n\n');

  const send = (event: string, data: string) => res.write(`event: ${event}\ndata: ${data}\n\n`);
  // A parked app has nothing to say; the stream ends the way the real one does.
  if (a.status === 'parked') {
    send('log', `${new Date().toISOString()} INFO  ${a.slug} instance parked — no live output`);
    send('end', '');
    res.end();
    return undefined;
  }
  let timer: NodeJS.Timeout | undefined;
  const tick = () => {
    const line = db.logLine(a);
    if (!grep || line.toLowerCase().includes(grep)) send('log', line);
    timer = setTimeout(tick, 250 + Math.random() * 900);
  };
  tick();
  req.on('close', () => clearTimeout(timer));
  return undefined; // the handler owns the response
});

// --- Account-wide lists --------------------------------------------------------

route('GET', '/v1/deployments', ({ query }) => ({
  items: db.deployments.slice(0, Number(query.get('limit') ?? 50)),
  next_before: null,
}));
route('GET', '/v1/deployments/{id}', ({ params }) => {
  const d = db.deployments.find((x) => x.id === params.id);
  if (!d) throw new Problem(404, 'deployment_not_found');
  return d;
});
route('GET', '/v1/builds', () => ({ items: db.builds }));

route('GET', '/v1/domains', () => db.domains);
route('POST', '/v1/domains', ({ body }) => {
  const domain = String(body.domain ?? '')
    .toLowerCase()
    .trim();
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) throw new Problem(400, 'invalid_domain');
  if (db.domains.some((d) => d.domain === domain)) throw new Problem(409, 'domain_exists');
  const a = db.appBySlug(String(body.app_slug ?? '')) ?? db.apps[0];
  const created = {
    domain,
    app_id: a.id,
    verified: false,
    challenge_token: db.id().slice(0, 24),
    txt_record: `_gregale-challenge.${domain} TXT "${db.id()}"`,
  };
  db.domains.push(created);
  return status(201, created);
});
route('DELETE', '/v1/domains/{domain}', ({ params }) => {
  const i = db.domains.findIndex((d) => d.domain === params.domain);
  if (i < 0) throw new Problem(404, 'domain_not_found');
  db.domains.splice(i, 1);
  return NO_CONTENT;
});

route('GET', '/v1/crons', () => db.crons);
route('DELETE', '/v1/crons/{id}', ({ params }) => {
  const i = db.crons.findIndex((c) => c.id === params.id);
  if (i < 0) throw new Problem(404, 'cron_not_found');
  db.crons.splice(i, 1);
  return NO_CONTENT;
});
route('POST', '/v1/crons/{id}/run', ({ params }) => {
  const c = db.crons.find((x) => x.id === params.id);
  if (!c) throw new Problem(404, 'cron_not_found');
  c.last_fired_at = db.iso(0);
  return status(202, { request_id: db.id(), cron_id: c.id, status: 'pending' });
});

route('GET', '/v1/keys', () => db.keys.map(({ plaintext: _omit, ...k }) => k));
route('POST', '/v1/keys', ({ body }) => {
  const created: (typeof db.keys)[number] = {
    id: db.id(),
    org_id: db.ORG_ID,
    prefix: `grg_live_${db.id().slice(0, 4)}`,
    label: String(body.label ?? 'Untitled key'),
    scopes: (Array.isArray(body.scopes)
      ? body.scopes
      : ['apps:read']) as (typeof db.keys)[number]['scopes'],
    last_used_at: null,
    created_at: db.iso(0),
    status: 'active',
  };
  db.keys.push(created);
  return status(201, { ...created, plaintext: `${created.prefix}_${db.id()}` });
});
route('DELETE', '/v1/keys/{id}', ({ params }) => {
  const i = db.keys.findIndex((k) => k.id === params.id);
  if (i < 0) throw new Problem(404, 'key_not_found');
  db.keys.splice(i, 1);
  return NO_CONTENT;
});
route('POST', '/v1/keys/{id}/rotate', ({ params }) => {
  const old = db.keys.find((k) => k.id === params.id);
  if (!old) throw new Problem(404, 'key_not_found');
  old.status = 'grace';
  old.expires_at = db.iso(-24 * 3_600_000);
  const key: (typeof db.keys)[number] = {
    ...old,
    id: db.id(),
    prefix: `grg_live_${db.id().slice(0, 4)}`,
    status: 'active',
    expires_at: null,
    created_at: db.iso(0),
    rotated_from_id: old.id,
  };
  db.keys.push(key);
  return {
    key,
    key_plaintext: `${key.prefix}_${db.id()}`,
    old_key_id: old.id,
    old_key_expires_at: old.expires_at,
  };
});

route('GET', '/v1/edge-rules', () => db.edgeRules);
route('DELETE', '/v1/edge-rules/{id}', ({ params }) => {
  const i = db.edgeRules.findIndex((r) => r.id === params.id);
  if (i < 0) throw new Problem(404, 'edge_rule_not_found');
  db.edgeRules.splice(i, 1);
  return NO_CONTENT;
});

route('GET', '/v1/invocations', ({ query }) => ({
  invocations: db.invocations.slice(0, Number(query.get('limit') ?? 50)),
}));
route('GET', '/v1/invocations/{id}', ({ params }) => {
  const inv = db.invocations.find((x) => x.id === params.id);
  if (!inv) throw new Problem(404, 'invocation_not_found');
  return inv;
});
route('POST', '/v1/invocations/{id}/replay', ({ params }) => {
  const inv = db.invocations.find((x) => x.id === params.id);
  if (!inv) throw new Problem(404, 'invocation_not_found');
  const replay = {
    ...inv,
    id: db.id(),
    source: 'replay' as const,
    state: 'pending' as const,
    created_at: db.iso(0),
    completed_at: null,
    last_error: null,
    attempts: 0,
  };
  db.invocations.unshift(replay);
  return status(202, { id: replay.id, status_url: `/v1/invocations/${replay.id}` });
});

route('GET', '/v1/instances', () => ({ instances: db.instances, next_before: null }));
route('GET', '/v1/audit-log', ({ query }) => {
  const limit = Number(query.get('limit') ?? 50);
  return { entries: db.audit.slice(0, limit), limit };
});

route('GET', '/v1/usage/summary', () => db.usage);
route('GET', '/v1/usage/storage', () => ({ items: db.storage }));
route('GET', '/v1/invoices', () => ({ items: db.invoices, next_before: null }));
route('GET', '/v1/billing/portal', () => db.billingPortal);

route('GET', '/v1/orgs', () => ({ orgs: db.orgs }));
route('GET', '/v1/orgs/{slug}/members', () => ({ members: db.members }));
route('GET', '/v1/orgs/{slug}/invitations', () => ({ invitations: db.invitations }));

// --- Plumbing ------------------------------------------------------------------

function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk: Buffer) => (raw += chunk));
    req.on('end', () => {
      try {
        resolve(raw ? (JSON.parse(raw) as Record<string, unknown>) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function json(res: ServerResponse, code: number, body: unknown) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function problem(res: ServerResponse, p: Problem) {
  res.statusCode = p.status;
  res.setHeader('Content-Type', 'application/problem+json');
  res.end(
    JSON.stringify({
      type: 'about:blank',
      status: p.status,
      code: p.code,
      title: p.code.replace(/_/g, ' '),
      detail: p.detail,
    })
  );
}

const MOCKED_PREFIXES = ['/v1/', '/login', '/signup'];

export function mockApi(): Plugin {
  return {
    name: 'gregale-mock-api',
    apply: 'serve',
    configureServer(server) {
      server.config.logger.info(
        `  ➜  mock api: serving /v1/* from mock/ — no backend needed${db.EMPTY ? ' (empty workspace)' : ''}`
      );
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        const method = req.method ?? 'GET';
        // GET /login and /signup are this app's own pages; only the POSTs are the API's.
        const isApi =
          url.pathname.startsWith('/v1/') ||
          (method !== 'GET' &&
            MOCKED_PREFIXES.some((p) => url.pathname === p || url.pathname.startsWith(p + '/')));
        if (!isApi) return next();

        const match = routes.find((r) => r.method === method && r.pattern.test(url.pathname));
        if (!match) {
          server.config.logger.warn(`  mock api: no handler for ${method} ${url.pathname}`);
          return problem(
            res,
            new Problem(
              404,
              'not_mocked',
              `The mock API has no handler for ${method} ${url.pathname}.`
            )
          );
        }

        const values = url.pathname.match(match.pattern)!.slice(1).map(decodeURIComponent);
        const params = Object.fromEntries(match.keys.map((k, i) => [k, values[i]]));

        void (async () => {
          const body = method === 'GET' ? {} : await readBody(req);
          await new Promise((r) => setTimeout(r, latency()));
          try {
            const out = await match.handler({ params, query: url.searchParams, body, req, res });
            if (res.writableEnded || res.headersSent) return; // streaming handlers own the response
            if (out === NO_CONTENT) {
              res.statusCode = 204;
              res.end();
              return;
            }
            if (out && typeof out === 'object' && '__status' in out) {
              const s = out as { __status: number; body: unknown };
              return json(res, s.__status, s.body);
            }
            json(res, 200, out);
          } catch (err) {
            if (err instanceof Problem) return problem(res, err);
            server.config.logger.error(
              `  mock api: ${method} ${url.pathname} threw: ${String(err)}`
            );
            problem(res, new Problem(500, 'mock_error', String(err)));
          }
        })();
      });
    },
  };
}
