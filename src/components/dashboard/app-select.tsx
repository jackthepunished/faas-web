import { useState } from 'react';
import { useApps } from '@/lib/api/queries';

/**
 * Scope picker for the resources the API keys by app.
 *
 * Secrets, env vars, alerts, webhooks, and queues are all
 * `/v1/apps/{slug}/…` — there is no account-wide read for any of them. These
 * pages used to show a flat fixture list, which quietly implied a workspace-wide
 * view that the API cannot answer. Every one of them now picks an app first.
 *
 * The choice is remembered across pages and reloads, so moving between Secrets
 * and Env Vars while debugging one app does not mean re-selecting it each time.
 */

const STORAGE_KEY = 'gregale.selectedApp';

function remembered(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(STORAGE_KEY) ?? '';
}

/**
 * Returns the selected app slug, the setter, and the app list state.
 *
 * `slug` is empty until the apps load. Callers pass it straight to a per-app
 * query, which stays disabled while it is empty rather than firing at
 * `/v1/apps//secrets`.
 */
export function useSelectedApp() {
  const { data: apps, isPending, error } = useApps();
  const [chosen, setChosen] = useState<string>(remembered);

  // Derived, not synchronised. The default — the remembered app if it still
  // exists, otherwise the first one — falls out of a computation rather than an
  // effect that writes state, so there is no render where the selection is
  // briefly wrong and no cascading re-render to correct it. A remembered app
  // that has since been deleted simply stops matching.
  const list = apps ?? [];
  const slug = list.some((a) => a.slug === chosen) ? chosen : (list[0]?.slug ?? '');

  const select = (next: string) => {
    setChosen(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  return { slug, select, apps: list, loadingApps: isPending, appsError: error };
}

export function AppSelect({
  slug,
  onSelect,
  apps,
  label = 'App',
}: {
  slug: string;
  onSelect: (slug: string) => void;
  apps: { slug: string }[];
  label?: string;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="label-mono text-muted-foreground">{label}</span>
      <select
        value={slug}
        onChange={(e) => onSelect(e.target.value)}
        aria-label="Select an app"
        className="h-9 rounded-md border border-border bg-card px-2.5 text-sm outline-none focus:border-brand/50"
      >
        {apps.length === 0 && <option value="">No apps</option>}
        {apps.map((a) => (
          <option key={a.slug} value={a.slug}>
            {a.slug}
          </option>
        ))}
      </select>
    </label>
  );
}
