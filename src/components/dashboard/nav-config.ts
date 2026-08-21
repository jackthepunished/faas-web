import type { ComponentType, SVGProps } from 'react';
import {
  Activity,
  Timer,
  Bell,
  CreditCard,
  Database,
  Page,
  DashboardSpeed,
  Globe,
  HardDrive,
  Key,
  Server,
  ViewGrid,
  List,
  Network,
  Package,
  Coins,
  Rocket,
  Journal,
  Settings,
  ShieldCheck,
  Shuffle,
  GraphUp,
  Group,
  Code,
  ShareAndroid,
  GitFork as WorkflowIcon,
} from 'iconoir-react';

/**
 * Grouped sidebar navigation.
 *
 * `to` is typed against the router's generated route ids, so a nav entry
 * cannot point at a route that does not exist.
 */

/** Any Iconoir glyph: they are plain SVG components. */
export type NavIcon = ComponentType<SVGProps<SVGSVGElement>>;

export interface NavItem {
  to: string;
  label: string;
  icon: NavIcon;
  exact?: boolean;
}

export interface NavGroup {
  /** Undefined for the ungrouped lead item. */
  title?: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    items: [{ to: '/dashboard', label: 'Overview', icon: ViewGrid, exact: true }],
  },
  {
    title: 'Build',
    items: [
      { to: '/dashboard/workflows', label: 'Workflows', icon: WorkflowIcon },
      { to: '/dashboard/apis', label: 'APIs', icon: Network },
      { to: '/dashboard/crons', label: 'Cron Jobs', icon: Timer },
      { to: '/dashboard/queues', label: 'Queue Jobs', icon: List },
      { to: '/dashboard/workers', label: 'Instances', icon: Server },
      { to: '/dashboard/deployments', label: 'Deployments', icon: Rocket },
      { to: '/dashboard/builds', label: 'Builds', icon: Package },
    ],
  },
  {
    title: 'Manage',
    items: [
      { to: '/dashboard/domains', label: 'Domains', icon: Globe },
      { to: '/dashboard/edge-rules', label: 'Edge Rules', icon: Shuffle },
      { to: '/dashboard/secrets', label: 'Secrets', icon: Key },
      { to: '/dashboard/env', label: 'Env Vars', icon: Code },
      { to: '/dashboard/webhooks', label: 'Webhooks', icon: ShareAndroid },
      { to: '/dashboard/storage', label: 'Storage', icon: HardDrive },
      { to: '/dashboard/databases', label: 'Upstreams', icon: Database },
    ],
  },
  {
    title: 'Observability',
    items: [
      { to: '/dashboard/logs', label: 'Logs', icon: Page },
      { to: '/dashboard/metrics', label: 'Metrics', icon: DashboardSpeed },
      { to: '/dashboard/traces', label: 'Invocations', icon: Activity },
      { to: '/dashboard/alerts', label: 'Alerts', icon: Bell },
      { to: '/dashboard/audit', label: 'Audit Log', icon: Journal },
    ],
  },
  {
    title: 'Billing',
    items: [
      { to: '/dashboard/usage', label: 'Usage', icon: GraphUp },
      { to: '/dashboard/invoices', label: 'Invoices', icon: Coins },
      { to: '/dashboard/plans', label: 'Plans', icon: CreditCard },
    ],
  },
  {
    title: 'Account',
    items: [
      { to: '/dashboard/keys', label: 'API Keys', icon: Key },
      { to: '/dashboard/team', label: 'Team', icon: Group },
      { to: '/dashboard/security', label: 'Security', icon: ShieldCheck },
      { to: '/dashboard/settings', label: 'Settings', icon: Settings },
    ],
  },
];

/** Flat lookup for breadcrumbs and the command palette. */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

/** Path segment -> label, for breadcrumb section titles. */
export const SECTION_LABELS: Record<string, string> = Object.fromEntries(
  NAV_ITEMS.filter((i) => i.to !== '/dashboard').map((i) => [i.to.split('/').pop()!, i.label])
);
