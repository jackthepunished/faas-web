/**
 * Mock fixtures for the resources beyond the core workflow/deployment/log
 * set in `mock-data.ts`.
 *
 * Same contract as that module: seeded at import time so every value is
 * stable across renders and reloads. Each exported array is what a real list
 * endpoint would return.
 */

import { NOW, WORKFLOWS } from './mock-data';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(rand: () => number, arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];

export const REGIONS = ['fra-metal-1', 'iad-metal-1', 'sin-metal-1'] as const;

/* ------------------------------------------------------------------ *
 * Build
 * ------------------------------------------------------------------ */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiRoute {
  id: string;
  path: string;
  method: HttpMethod;
  workflowId: string;
  auth: 'public' | 'api-key' | 'jwt';
  rateLimitPerMin: number;
  requests24h: number;
  p95Ms: number;
  state: 'live' | 'draft';
}

export const API_ROUTES: ApiRoute[] = (() => {
  const rand = mulberry32(2201);
  const paths = [
    ['/v1/checkout', 'POST'],
    ['/v1/catalog/search', 'GET'],
    ['/v1/media/resize', 'POST'],
    ['/v1/webhooks/stripe', 'POST'],
    ['/v1/orders/:id', 'GET'],
    ['/v1/orders/:id', 'PATCH'],
    ['/v1/auth/callback', 'GET'],
    ['/v1/reports/nightly', 'GET'],
    ['/v1/documents/render', 'POST'],
    ['/v1/sessions/:id', 'DELETE'],
  ] as const;

  return paths.map(([path, method], i) => ({
    id: `api_${i}`,
    path,
    method: method as HttpMethod,
    workflowId: WORKFLOWS[i % WORKFLOWS.length].id,
    auth: pick(rand, ['public', 'api-key', 'jwt'] as const),
    rateLimitPerMin: pick(rand, [60, 120, 600, 1200, 6000]),
    requests24h: Math.round(400 + rand() * 190_000),
    p95Ms: Math.round(28 + rand() * 340),
    state: rand() > 0.15 ? 'live' : 'draft',
  }));
})();

export interface CronJob {
  id: string;
  name: string;
  schedule: string;
  workflowId: string;
  timezone: string;
  state: 'active' | 'paused';
  lastRunAt: number;
  nextRunAt: number;
  lastDurationMs: number;
  successRatePct: number;
}

export const CRON_JOBS: CronJob[] = (() => {
  const rand = mulberry32(3312);
  const defs = [
    ['nightly-rollup', '0 2 * * *'],
    ['warehouse-sync', '*/15 * * * *'],
    ['invoice-sweep', '0 6 1 * *'],
    ['snapshot-prune', '30 4 * * 0'],
    ['session-expiry', '*/5 * * * *'],
    ['digest-email', '0 9 * * 1-5'],
  ] as const;

  return defs.map(([name, schedule], i) => ({
    id: `cron_${name.replace(/-/g, '_')}`,
    name,
    schedule,
    workflowId: WORKFLOWS[i % WORKFLOWS.length].id,
    timezone: 'UTC',
    state: rand() > 0.2 ? 'active' : 'paused',
    lastRunAt: NOW - Math.round(rand() * 12 * HOUR),
    nextRunAt: NOW + Math.round(rand() * 12 * HOUR),
    lastDurationMs: Math.round(400 + rand() * 90_000),
    successRatePct: Number((92 + rand() * 8).toFixed(1)),
  }));
})();

export interface Queue {
  id: string;
  name: string;
  depth: number;
  inFlight: number;
  dlqDepth: number;
  consumers: number;
  throughputPerMin: number;
  oldestMessageAgeSec: number;
  state: 'draining' | 'healthy' | 'backed-up';
}

export const QUEUES: Queue[] = (() => {
  const rand = mulberry32(4423);
  const names = ['orders', 'media-jobs', 'emails', 'webhooks-out', 'reindex'];
  return names.map((name) => {
    const depth = Math.round(rand() * 24_000);
    const dlqDepth = Math.round(rand() * 90);
    return {
      id: `q_${name.replace(/-/g, '_')}`,
      name,
      depth,
      inFlight: Math.round(rand() * 400),
      dlqDepth,
      consumers: 1 + Math.floor(rand() * 12),
      throughputPerMin: Math.round(20 + rand() * 4_200),
      oldestMessageAgeSec: Math.round(rand() * 900),
      state: depth > 15_000 ? 'backed-up' : dlqDepth > 50 ? 'draining' : 'healthy',
    };
  });
})();

export interface Worker {
  id: string;
  name: string;
  region: string;
  state: 'online' | 'draining' | 'offline';
  concurrency: number;
  activeTasks: number;
  cpuPct: number;
  memPct: number;
  uptimeSec: number;
}

export const WORKERS: Worker[] = (() => {
  const rand = mulberry32(5534);
  return Array.from({ length: 8 }, (_, i) => {
    const concurrency = pick(rand, [8, 16, 32, 64]);
    return {
      id: `wrk_${i}`,
      name: `worker-${String(i + 1).padStart(2, '0')}`,
      region: REGIONS[i % REGIONS.length],
      state: rand() > 0.12 ? ('online' as const) : rand() > 0.5 ? ('draining' as const) : ('offline' as const),
      concurrency,
      activeTasks: Math.round(rand() * concurrency),
      cpuPct: Number((rand() * 92).toFixed(1)),
      memPct: Number((22 + rand() * 66).toFixed(1)),
      uptimeSec: Math.round(rand() * 40 * DAY) / 1000,
    };
  });
})();

/* ------------------------------------------------------------------ *
 * Manage
 * ------------------------------------------------------------------ */

export interface Domain {
  id: string;
  host: string;
  workflowId: string;
  tls: 'active' | 'pending' | 'error';
  certExpiresAt: number;
  primary: boolean;
  verifiedAt: number | null;
}

export const DOMAINS: Domain[] = (() => {
  const rand = mulberry32(6645);
  const hosts = [
    'acme.dev',
    'www.acme.dev',
    'api.acme.dev',
    'cdn.acme.dev',
    'staging.acme.dev',
    'checkout.acme.dev',
  ];
  return hosts.map((host, i) => {
    const tls = i === 4 ? ('pending' as const) : i === 5 ? ('error' as const) : ('active' as const);
    return {
      id: `dom_${i}`,
      host,
      workflowId: WORKFLOWS[i % WORKFLOWS.length].id,
      tls,
      certExpiresAt: NOW + Math.round((20 + rand() * 70) * DAY),
      primary: i === 0,
      verifiedAt: tls === 'active' ? NOW - Math.round(rand() * 200 * DAY) : null,
    };
  });
})();

export interface Secret {
  id: string;
  key: string;
  scope: 'workspace' | 'workflow';
  workflowId: string | null;
  version: number;
  updatedAt: number;
  lastAccessedAt: number;
}

export const SECRETS: Secret[] = (() => {
  const rand = mulberry32(7756);
  const keys = [
    'STRIPE_SECRET_KEY',
    'DATABASE_URL',
    'JWT_SIGNING_KEY',
    'S3_ACCESS_KEY',
    'S3_SECRET_KEY',
    'SENTRY_DSN',
    'SMTP_PASSWORD',
    'OPENAI_API_KEY',
  ];
  return keys.map((key, i) => {
    const scoped = rand() > 0.6;
    return {
      id: `sec_${i}`,
      key,
      scope: scoped ? ('workflow' as const) : ('workspace' as const),
      workflowId: scoped ? WORKFLOWS[i % WORKFLOWS.length].id : null,
      version: 1 + Math.floor(rand() * 6),
      updatedAt: NOW - Math.round(rand() * 120 * DAY),
      lastAccessedAt: NOW - Math.round(rand() * 6 * HOUR),
    };
  });
})();

export interface EnvVar {
  id: string;
  key: string;
  value: string;
  environment: 'production' | 'preview' | 'development';
  workflowId: string | null;
  updatedAt: number;
}

export const ENV_VARS: EnvVar[] = (() => {
  const rand = mulberry32(8867);
  const defs = [
    ['NODE_ENV', 'production'],
    ['LOG_LEVEL', 'info'],
    ['REGION', 'fra-metal-1'],
    ['FEATURE_CHECKOUT_V2', 'true'],
    ['MAX_UPLOAD_MB', '25'],
    ['CACHE_TTL_SECONDS', '300'],
    ['WAREHOUSE_HOST', 'warehouse.internal'],
    ['RETRY_BUDGET', '3'],
  ];
  return defs.map(([key, value], i) => ({
    id: `env_${i}`,
    key,
    value,
    environment: pick(rand, ['production', 'preview', 'development'] as const),
    workflowId: rand() > 0.5 ? WORKFLOWS[i % WORKFLOWS.length].id : null,
    updatedAt: NOW - Math.round(rand() * 60 * DAY),
  }));
})();

export interface Bucket {
  id: string;
  name: string;
  region: string;
  objects: number;
  sizeBytes: number;
  visibility: 'private' | 'public';
  createdAt: number;
}

export const BUCKETS: Bucket[] = (() => {
  const rand = mulberry32(9978);
  const names = ['product-media', 'user-uploads', 'invoices-pdf', 'build-cache', 'backups'];
  return names.map((name, i) => ({
    id: `buk_${name.replace(/-/g, '_')}`,
    name,
    region: REGIONS[i % REGIONS.length],
    objects: Math.round(200 + rand() * 1_400_000),
    sizeBytes: Math.round(rand() * 820_000_000_000),
    visibility: name === 'product-media' ? 'public' : 'private',
    createdAt: NOW - Math.round(rand() * 300 * DAY),
  }));
})();

export interface Database {
  id: string;
  name: string;
  engine: 'postgres' | 'redis';
  version: string;
  region: string;
  sizeBytes: number;
  connections: number;
  maxConnections: number;
  state: 'available' | 'migrating' | 'degraded';
}

export const DATABASES: Database[] = (() => {
  const rand = mulberry32(10089);
  const defs: [string, Database['engine'], string][] = [
    ['orders-primary', 'postgres', '16.3'],
    ['analytics', 'postgres', '16.3'],
    ['sessions', 'redis', '7.2'],
    ['rate-limits', 'redis', '7.2'],
  ];
  return defs.map(([name, engine, version], i) => {
    const maxConnections = engine === 'postgres' ? 200 : 10_000;
    return {
      id: `db_${name.replace(/-/g, '_')}`,
      name,
      engine,
      version,
      region: REGIONS[i % REGIONS.length],
      sizeBytes: Math.round(rand() * 240_000_000_000),
      connections: Math.round(rand() * maxConnections * 0.6),
      maxConnections,
      state: rand() > 0.85 ? 'degraded' : rand() > 0.9 ? 'migrating' : 'available',
    };
  });
})();

/* ------------------------------------------------------------------ *
 * Observability
 * ------------------------------------------------------------------ */

export interface Trace {
  id: string;
  traceId: string;
  rootWorkflowId: string;
  operation: string;
  spans: number;
  durationMs: number;
  status: 'ok' | 'error';
  ts: number;
}

export const TRACES: Trace[] = (() => {
  const rand = mulberry32(11190);
  const ops = [
    'POST /v1/checkout',
    'GET /v1/catalog/search',
    'cron nightly-rollup',
    'queue orders#consume',
    'POST /v1/media/resize',
  ];
  return Array.from({ length: 60 }, (_, i) => {
    const error = rand() > 0.88;
    return {
      id: `trc_${i}`,
      traceId: Math.floor(rand() * 0xffffffffffff)
        .toString(16)
        .padStart(16, '0')
        .slice(0, 16),
      rootWorkflowId: WORKFLOWS[Math.floor(rand() * WORKFLOWS.length)].id,
      operation: pick(rand, ops),
      spans: 3 + Math.floor(rand() * 40),
      durationMs: Math.round(12 + rand() * 4_200),
      status: error ? ('error' as const) : ('ok' as const),
      ts: NOW - Math.round(rand() * 4 * HOUR),
    };
  }).sort((a, b) => b.ts - a.ts);
})();

export interface AlertRule {
  id: string;
  name: string;
  metric: 'error_rate' | 'p95_latency' | 'queue_depth' | 'cold_start' | 'spend';
  comparator: '>' | '<';
  threshold: number;
  unit: string;
  windowMinutes: number;
  channel: 'email' | 'slack' | 'webhook';
  state: 'ok' | 'firing' | 'paused';
  lastTriggeredAt: number | null;
}

export const ALERT_RULES: AlertRule[] = (() => {
  const rand = mulberry32(12201);
  const defs: [string, AlertRule['metric'], number, string][] = [
    ['Error rate above 1%', 'error_rate', 1, '%'],
    ['p95 latency over 500ms', 'p95_latency', 500, 'ms'],
    ['Orders queue backing up', 'queue_depth', 10_000, 'msgs'],
    ['Cold starts over 400ms', 'cold_start', 400, 'ms'],
    ['Monthly spend over $500', 'spend', 500, 'USD'],
  ];
  return defs.map(([name, metric, threshold, unit], i) => {
    const state = i === 2 ? ('firing' as const) : rand() > 0.8 ? ('paused' as const) : ('ok' as const);
    return {
      id: `alr_${i}`,
      name,
      metric,
      comparator: '>' as const,
      threshold,
      unit,
      windowMinutes: pick(rand, [5, 15, 30, 60]),
      channel: pick(rand, ['email', 'slack', 'webhook'] as const),
      state,
      lastTriggeredAt: state === 'firing' ? NOW - Math.round(rand() * HOUR) : null,
    };
  });
})();

/* ------------------------------------------------------------------ *
 * Billing & account
 * ------------------------------------------------------------------ */

export interface Invoice {
  id: string;
  number: string;
  periodStart: number;
  periodEnd: number;
  amountUsd: number;
  status: 'paid' | 'open' | 'void';
  issuedAt: number;
}

export const INVOICES: Invoice[] = (() => {
  const rand = mulberry32(13312);
  return Array.from({ length: 8 }, (_, i) => {
    const issuedAt = NOW - i * 30 * DAY;
    return {
      id: `inv_${i}`,
      number: `GRG-2026-${String(120 - i).padStart(4, '0')}`,
      periodStart: issuedAt - 30 * DAY,
      periodEnd: issuedAt,
      amountUsd: Number((38 + rand() * 420).toFixed(2)),
      status: i === 0 ? 'open' : 'paid',
      issuedAt,
    };
  });
})();

export interface Plan {
  id: string;
  name: string;
  priceUsd: number;
  blurb: string;
  includes: string[];
  current: boolean;
}

export const PLANS: Plan[] = [
  {
    id: 'plan_free',
    name: 'Free',
    priceUsd: 0,
    blurb: 'For trying Gregale on real workloads.',
    includes: ['1M invocations', '400,000 GB-seconds', '100 GB egress', 'Community support'],
    current: false,
  },
  {
    id: 'plan_pro',
    name: 'Pro',
    priceUsd: 20,
    blurb: 'For teams shipping to production.',
    includes: [
      '10M invocations',
      '2M GB-seconds',
      '1 TB egress',
      'Custom domains',
      'Email support',
    ],
    current: true,
  },
  {
    id: 'plan_scale',
    name: 'Scale',
    priceUsd: 250,
    blurb: 'Dedicated metal and committed capacity.',
    includes: [
      'Unlimited invocations',
      'Reserved capacity',
      'Multi-region snapshots',
      'SSO and audit log',
      'Priority support',
    ],
    current: false,
  },
];

export interface ApiKeyRecord {
  id: string;
  label: string;
  value: string;
  scopes: string[];
  createdAt: number;
  lastUsedAt: number | null;
}

export const API_KEYS: ApiKeyRecord[] = [
  {
    id: 'key_prod',
    label: 'Production',
    value: 'grg_live_7f2a91c4e8b34d05a6f1',
    scopes: ['deploy', 'read'],
    createdAt: NOW - 86 * DAY,
    lastUsedAt: NOW - 2 * HOUR,
  },
  {
    id: 'key_ci',
    label: 'CI pipeline',
    value: 'grg_live_2c8d40fa19be7c63d902',
    scopes: ['deploy'],
    createdAt: NOW - 23 * DAY,
    lastUsedAt: NOW - 26 * HOUR,
  },
  {
    id: 'key_readonly',
    label: 'Grafana reader',
    value: 'grg_live_9b1e57cc03ad42f8e714',
    scopes: ['read'],
    createdAt: NOW - 5 * DAY,
    lastUsedAt: null,
  },
];

/* ---------- formatting helpers specific to these resources ---------- */

export function formatBytes(bytes: number): string {
  if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(1)} TB`;
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)} kB`;
  return `${bytes} B`;
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
