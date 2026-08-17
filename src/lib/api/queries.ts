import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { api, unwrap } from './client';
import { ApiError } from './errors';
import type { components } from './schema';

/**
 * Query hooks over the REST surface.
 *
 * Keys are arrays whose first element names the resource, so a mutation can
 * invalidate a whole family (`['apps']`) without enumerating every variant.
 *
 * Nothing here retries a 4xx: a 401, 403, 404, or 422 is a settled answer, and
 * retrying it only delays the error the user needs to see. 429 and 5xx are the
 * retryable cases and `ApiError.isRetryable` is the single place that decides.
 */

export type App = components['schemas']['AppResponse'];
export type Deployment = components['schemas']['DeploymentResponse'];
export type AppMetrics = components['schemas']['AppMetricsResponse'];
export type MetricsRange = AppMetrics['range'];

export const keys = {
  account: ['account'] as const,
  apps: ['apps'] as const,
  app: (slug: string) => ['apps', slug] as const,
  appsMetrics: (range: MetricsRange) => ['apps', 'metrics', range] as const,
  appMetrics: (slug: string, range: MetricsRange) => ['apps', slug, 'metrics', range] as const,
  deployments: ['deployments'] as const,
  appDeployments: (slug: string) => ['apps', slug, 'deployments'] as const,
  domains: ['domains'] as const,
  crons: ['crons'] as const,
  keys: ['keys'] as const,
  invoices: ['invoices'] as const,
  usage: ['usage'] as const,
  usageSummary: ['usage', 'summary'] as const,
  instances: ['instances'] as const,
  invocations: ['invocations'] as const,
  auditLog: ['audit-log'] as const,
  appSecrets: (slug: string) => ['apps', slug, 'secrets'] as const,
  appEnv: (slug: string) => ['apps', slug, 'env'] as const,
  appAlerts: (slug: string) => ['apps', slug, 'alerts'] as const,
};

/** Shared policy: never retry a settled 4xx, retry the rest twice. */
export function retryPolicy(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && !error.isRetryable) return false;
  return failureCount < 2;
}

type Options<T> = Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'>;

/* ------------------------------------------------------------------ *
 * Apps
 * ------------------------------------------------------------------ */

export function useApps(options?: Options<App[]>) {
  return useQuery({
    queryKey: keys.apps,
    queryFn: () => unwrap(api.GET('/v1/apps', {})),
    ...options,
  });
}

export function useApp(slug: string, options?: Options<App>) {
  return useQuery({
    queryKey: keys.app(slug),
    queryFn: () => unwrap(api.GET('/v1/apps/{slug}', { params: { path: { slug } } })),
    enabled: Boolean(slug),
    ...options,
  });
}

/**
 * One call for every app's metrics.
 *
 * The per-app endpoint exists, but the rollup costs 6 PromQL round-trips
 * regardless of app count where a per-app fan-out costs 7N — on a list page
 * that difference is the whole page.
 */
export function useAppsMetrics(range: MetricsRange = '24h', options?: Options<AppsMetrics>) {
  return useQuery({
    queryKey: keys.appsMetrics(range),
    queryFn: () => unwrap(api.GET('/v1/apps/metrics', { params: { query: { range } } })),
    ...options,
  });
}

export type AppsMetrics = components['schemas']['AppsMetricsResponse'];

export function useAppMetrics(slug: string, range: MetricsRange = '24h') {
  return useQuery({
    queryKey: keys.appMetrics(slug, range),
    queryFn: () =>
      unwrap(api.GET('/v1/apps/{slug}/metrics', { params: { path: { slug }, query: { range } } })),
    enabled: Boolean(slug),
  });
}

/* ------------------------------------------------------------------ *
 * Deployments
 * ------------------------------------------------------------------ */

export function useDeployments(limit = 50) {
  return useQuery({
    queryKey: [...keys.deployments, limit],
    queryFn: () => unwrap(api.GET('/v1/deployments', { params: { query: { limit } } })),
  });
}

export function useDeployment(id: string) {
  return useQuery({
    queryKey: ['deployments', id],
    queryFn: () => unwrap(api.GET('/v1/deployments/{id}', { params: { path: { id } } })),
    enabled: Boolean(id),
  });
}

/* ------------------------------------------------------------------ *
 * Mutations
 *
 * Each invalidates the families its write can affect, rather than patching the
 * cache by hand — the server is the authority on what a deploy did, and a
 * hand-patched cache is how a console starts lying about state.
 * ------------------------------------------------------------------ */

export function useCreateApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: components['schemas']['CreateAppRequest']) =>
      unwrap(api.POST('/v1/apps', { body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.apps }),
  });
}

export function useDeleteApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) =>
      unwrap(api.DELETE('/v1/apps/{slug}', { params: { path: { slug } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.apps }),
  });
}

/** Wakes a parked app. The platform scales to zero, so this is a real action. */
export function useWakeApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) =>
      unwrap(api.POST('/v1/apps/{slug}/wake', { params: { path: { slug } } })),
    onSuccess: (_data, slug) => {
      void qc.invalidateQueries({ queryKey: keys.apps });
      void qc.invalidateQueries({ queryKey: keys.app(slug) });
    },
  });
}

export function useParkApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) =>
      unwrap(api.POST('/v1/apps/{slug}/park', { params: { path: { slug } } })),
    onSuccess: (_data, slug) => {
      void qc.invalidateQueries({ queryKey: keys.apps });
      void qc.invalidateQueries({ queryKey: keys.app(slug) });
    },
  });
}

export function useRollback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) =>
      unwrap(api.POST('/v1/apps/{slug}/rollback', { params: { path: { slug } } })),
    onSuccess: (_data, slug) => {
      void qc.invalidateQueries({ queryKey: keys.apps });
      void qc.invalidateQueries({ queryKey: keys.app(slug) });
      void qc.invalidateQueries({ queryKey: keys.deployments });
    },
  });
}

/* ------------------------------------------------------------------ *
 * Account-level reads used by more than one page
 * ------------------------------------------------------------------ */

export function useDomains() {
  return useQuery({
    queryKey: keys.domains,
    queryFn: () => unwrap(api.GET('/v1/domains', {})),
  });
}

export function useCrons() {
  return useQuery({
    queryKey: keys.crons,
    queryFn: () => unwrap(api.GET('/v1/crons', {})),
  });
}

export function useApiKeys() {
  return useQuery({
    queryKey: keys.keys,
    queryFn: () => unwrap(api.GET('/v1/keys', {})),
  });
}

export function useInvoices() {
  return useQuery({
    queryKey: keys.invoices,
    queryFn: () => unwrap(api.GET('/v1/invoices', {})),
  });
}

export function useUsageSummary() {
  return useQuery({
    queryKey: keys.usageSummary,
    queryFn: () => unwrap(api.GET('/v1/usage/summary', {})),
  });
}

export function useInstances() {
  return useQuery({
    queryKey: keys.instances,
    queryFn: () => unwrap(api.GET('/v1/instances', {})),
  });
}
