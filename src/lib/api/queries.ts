import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { api, csrfToken, unwrap } from './client';
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

/* ------------------------------------------------------------------ *
 * Per-app configuration
 *
 * Secrets and env vars are the same shape with a crucial difference: a secret's
 * value is never echoed back. Both write with PUT keyed by name, so "create"
 * and "update" are one operation.
 * ------------------------------------------------------------------ */

export function useAppSecrets(slug: string) {
  return useQuery({
    queryKey: keys.appSecrets(slug),
    queryFn: () => unwrap(api.GET('/v1/apps/{slug}/secrets', { params: { path: { slug } } })),
    enabled: Boolean(slug),
  });
}

export function useSetSecret(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      unwrap(
        api.PUT('/v1/apps/{slug}/secrets/{key}', {
          params: { path: { slug, key } },
          body: { value },
        })
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.appSecrets(slug) }),
  });
}

export function useDeleteSecret(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (key: string) =>
      unwrap(api.DELETE('/v1/apps/{slug}/secrets/{key}', { params: { path: { slug, key } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.appSecrets(slug) }),
  });
}

export function useAppEnv(slug: string) {
  return useQuery({
    queryKey: keys.appEnv(slug),
    queryFn: () => unwrap(api.GET('/v1/apps/{slug}/env', { params: { path: { slug } } })),
    enabled: Boolean(slug),
  });
}

export function useSetEnv(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      unwrap(
        api.PUT('/v1/apps/{slug}/env/{key}', { params: { path: { slug, key } }, body: { value } })
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.appEnv(slug) }),
  });
}

export function useDeleteEnv(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (key: string) =>
      unwrap(api.DELETE('/v1/apps/{slug}/env/{key}', { params: { path: { slug, key } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.appEnv(slug) }),
  });
}

/* ------------------------------------------------------------------ *
 * Domains, crons, keys — account-level CRUD
 * ------------------------------------------------------------------ */

export function useAddDomain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: components['schemas']['CreateCustomDomainRequest']) =>
      unwrap(api.POST('/v1/domains', { body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.domains }),
  });
}

export function useDeleteDomain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (domain: string) =>
      unwrap(api.DELETE('/v1/domains/{domain}', { params: { path: { domain } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.domains }),
  });
}

export function useCronRuns(id: string) {
  return useQuery({
    queryKey: ['crons', id, 'runs'],
    queryFn: () => unwrap(api.GET('/v1/crons/{id}/runs', { params: { path: { id } } })),
    enabled: Boolean(id),
  });
}

export function useDeleteCron() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap(api.DELETE('/v1/crons/{id}', { params: { path: { id } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.crons }),
  });
}

/** Fires a scheduled job now, out of band. */
export function useRunCron() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap(api.POST('/v1/crons/{id}/run', { params: { path: { id } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.crons }),
  });
}

/**
 * The plaintext key comes back exactly once, on create. The UI has to show it
 * immediately and warn that it will not be shown again — there is no recovery.
 */
export function useCreateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: components['schemas']['CreateKeyRequest']) =>
      unwrap(api.POST('/v1/keys', { body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.keys }),
  });
}

export function useDeleteApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap(api.DELETE('/v1/keys/{id}', { params: { path: { id } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.keys }),
  });
}

export function useRotateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(api.POST('/v1/keys/{id}/rotate', { params: { path: { id } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.keys }),
  });
}

/* ------------------------------------------------------------------ *
 * Observability
 * ------------------------------------------------------------------ */

export function useInvocations(limit = 50) {
  return useQuery({
    queryKey: [...keys.invocations, limit],
    queryFn: () => unwrap(api.GET('/v1/invocations', { params: { query: { limit } } })),
  });
}

export function useInvocation(id: string) {
  return useQuery({
    queryKey: ['invocations', id],
    queryFn: () => unwrap(api.GET('/v1/invocations/{id}', { params: { path: { id } } })),
    enabled: Boolean(id),
  });
}

export function useReplayInvocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(api.POST('/v1/invocations/{id}/replay', { params: { path: { id } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.invocations }),
  });
}

export function useTrace(traceId: string) {
  return useQuery({
    queryKey: ['traces', traceId],
    queryFn: () => unwrap(api.GET('/v1/traces/{trace_id}', { params: { path: { trace_id: traceId } } })),
    enabled: Boolean(traceId),
  });
}

export function useAuditLog() {
  return useQuery({
    queryKey: keys.auditLog,
    queryFn: () => unwrap(api.GET('/v1/audit-log', {})),
  });
}

/* ------------------------------------------------------------------ *
 * Alerts and webhooks — both per-app, both signed-payload dispatchers
 * ------------------------------------------------------------------ */

export function useAlerts(slug: string) {
  return useQuery({
    queryKey: keys.appAlerts(slug),
    queryFn: () => unwrap(api.GET('/v1/apps/{slug}/alerts', { params: { path: { slug } } })),
    enabled: Boolean(slug),
  });
}

export function useDeleteAlert(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(api.DELETE('/v1/apps/{slug}/alerts/{id}', { params: { path: { slug, id } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.appAlerts(slug) }),
  });
}

export function useWebhooks(slug: string) {
  return useQuery({
    queryKey: ['apps', slug, 'webhooks'],
    queryFn: () => unwrap(api.GET('/v1/apps/{slug}/webhooks', { params: { path: { slug } } })),
    enabled: Boolean(slug),
  });
}

export function useWebhookDeliveries(slug: string, id: string) {
  return useQuery({
    queryKey: ['apps', slug, 'webhooks', id, 'deliveries'],
    queryFn: () =>
      unwrap(
        api.GET('/v1/apps/{slug}/webhooks/{id}/deliveries', { params: { path: { slug, id } } })
      ),
    enabled: Boolean(slug && id),
  });
}

/** Clears a delivery out of `dead` back to `pending` for another attempt. */
export function useRetryDelivery(slug: string, id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (did: string) =>
      unwrap(
        api.POST('/v1/apps/{slug}/webhooks/{id}/deliveries/{did}/retry', {
          params: { path: { slug, id, did } },
        })
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['apps', slug, 'webhooks', id, 'deliveries'] }),
  });
}

/* ------------------------------------------------------------------ *
 * Edge rules and queues
 * ------------------------------------------------------------------ */

export function useEdgeRules() {
  return useQuery({
    queryKey: ['edge-rules'],
    queryFn: () => unwrap(api.GET('/v1/edge-rules', {})),
  });
}

export function useDeleteEdgeRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(api.DELETE('/v1/edge-rules/{id}', { params: { path: { id } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['edge-rules'] }),
  });
}

export function useQueueState(slug: string) {
  return useQuery({
    queryKey: ['apps', slug, 'queues', 'state'],
    queryFn: () => unwrap(api.GET('/v1/apps/{slug}/queues/state', { params: { path: { slug } } })),
    enabled: Boolean(slug),
  });
}

/** Non-destructive read of the head of the queue. `receive` would claim it. */
export function useQueuePeek(slug: string) {
  return useQuery({
    queryKey: ['apps', slug, 'queues', 'peek'],
    queryFn: () => unwrap(api.GET('/v1/apps/{slug}/queues/peek', { params: { path: { slug } } })),
    enabled: Boolean(slug),
  });
}

export function useDeadLetter(slug: string) {
  return useQuery({
    queryKey: ['apps', slug, 'queues', 'dead_letter'],
    queryFn: () =>
      unwrap(api.GET('/v1/apps/{slug}/queues/dead_letter', { params: { path: { slug } } })),
    enabled: Boolean(slug),
  });
}

/* ------------------------------------------------------------------ *
 * Builds and supply chain
 * ------------------------------------------------------------------ */

export function useBuilds() {
  return useQuery({
    queryKey: ['builds'],
    queryFn: () => unwrap(api.GET('/v1/builds', {})),
  });
}

export function useBuildSbom(id: string) {
  return useQuery({
    queryKey: ['builds', id, 'sbom'],
    queryFn: () => unwrap(api.GET('/v1/builds/{id}/sbom', { params: { path: { id } } })),
    enabled: Boolean(id),
  });
}

/** Per-deployment CVE scan. A CRITICAL finding does not block a deploy. */
export function useDeploymentScan(id: string) {
  return useQuery({
    queryKey: ['deployments', id, 'scan'],
    queryFn: () => unwrap(api.GET('/v1/deployments/{id}/scan', { params: { path: { id } } })),
    enabled: Boolean(id),
  });
}

/* ------------------------------------------------------------------ *
 * Usage and billing
 * ------------------------------------------------------------------ */

/** Both of these are a single day's snapshot, not a range — `day` is required. */
export function useUsageDaily(day: string) {
  return useQuery({
    queryKey: ['usage', 'daily', day],
    queryFn: () => unwrap(api.GET('/v1/usage/daily', { params: { query: { day } } })),
    enabled: Boolean(day),
  });
}

export function useStorageUsage(day: string) {
  return useQuery({
    queryKey: ['usage', 'storage', day],
    queryFn: () => unwrap(api.GET('/v1/usage/storage', { params: { query: { day } } })),
    enabled: Boolean(day),
  });
}

/**
 * Returns a URL to the provider's hosted portal rather than a page we render —
 * card details never touch this app.
 */
export function useBillingPortal() {
  return useMutation({
    mutationFn: () => unwrap(api.GET('/v1/billing/portal', {})),
  });
}

export function useAccountSlo() {
  return useQuery({
    queryKey: ['account', 'slo'],
    queryFn: () => unwrap(api.GET('/v1/account/slo', {})),
  });
}

/* ------------------------------------------------------------------ *
 * Organisations
 * ------------------------------------------------------------------ */

export function useOrgs() {
  return useQuery({
    queryKey: ['orgs'],
    queryFn: () => unwrap(api.GET('/v1/orgs', {})),
  });
}

export function useOrgMembers(slug: string) {
  return useQuery({
    queryKey: ['orgs', slug, 'members'],
    queryFn: () => unwrap(api.GET('/v1/orgs/{slug}/members', { params: { path: { slug } } })),
    enabled: Boolean(slug),
  });
}

export function useOrgInvitations(slug: string) {
  return useQuery({
    queryKey: ['orgs', slug, 'invitations'],
    queryFn: () => unwrap(api.GET('/v1/orgs/{slug}/invitations', { params: { path: { slug } } })),
    enabled: Boolean(slug),
  });
}

/* ------------------------------------------------------------------ *
 * Sessions — the signed-in devices list, and the panic button
 * ------------------------------------------------------------------ */

export function useSessions() {
  return useQuery({
    queryKey: ['auth', 'sessions'],
    queryFn: () => unwrap(api.GET('/v1/auth/sessions', {})),
  });
}

export function useRevokeSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(
        api.DELETE('/v1/auth/sessions/{id}', {
          params: { path: { id } },
          body: { csrf_token: csrfToken() },
        })
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auth', 'sessions'] }),
  });
}

export function useRevokeAllSessions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      unwrap(api.POST('/v1/auth/sessions/revoke_all', { body: { csrf_token: csrfToken() } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auth', 'sessions'] }),
  });
}
