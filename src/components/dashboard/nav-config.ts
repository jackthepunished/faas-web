import {
  Activity,
  AlarmClock,
  Bell,
  CreditCard,
  Database,
  FileText,
  Gauge,
  Globe,
  HardDrive,
  KeyRound,
  Layers,
  LayoutDashboard,
  ListTree,
  type LucideIcon,
  Network,
  Package,
  Receipt,
  Rocket,
  ScrollText,
  Settings,
  ShieldCheck,
  Shuffle,
  SlidersHorizontal,
  Users,
  Variable,
  Webhook,
  Workflow as WorkflowIcon,
} from 'lucide-react';

/**
 * Grouped sidebar navigation.
 *
 * `to` is typed against the router's generated route ids, so a nav entry
 * cannot point at a route that does not exist.
 */

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

export interface NavGroup {
  /** Undefined for the ungrouped lead item. */
  title?: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    items: [{ to: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true }],
  },
  {
    title: 'Build',
    items: [
      { to: '/dashboard/workflows', label: 'Apps', icon: WorkflowIcon },
      { to: '/dashboard/apis', label: 'APIs', icon: Network },
      { to: '/dashboard/crons', label: 'Cron Jobs', icon: AlarmClock },
      { to: '/dashboard/queues', label: 'Queue Jobs', icon: ListTree },
      { to: '/dashboard/workers', label: 'Instances', icon: Layers },
      { to: '/dashboard/deployments', label: 'Deployments', icon: Rocket },
      { to: '/dashboard/builds', label: 'Builds', icon: Package },
    ],
  },
  {
    title: 'Manage',
    items: [
      { to: '/dashboard/domains', label: 'Domains', icon: Globe },
      { to: '/dashboard/edge-rules', label: 'Edge Rules', icon: Shuffle },
      { to: '/dashboard/secrets', label: 'Secrets', icon: KeyRound },
      { to: '/dashboard/env', label: 'Env Vars', icon: Variable },
      { to: '/dashboard/webhooks', label: 'Webhooks', icon: Webhook },
      { to: '/dashboard/storage', label: 'Storage', icon: HardDrive },
      { to: '/dashboard/databases', label: 'Upstreams', icon: Database },
    ],
  },
  {
    title: 'Observability',
    items: [
      { to: '/dashboard/logs', label: 'Logs', icon: FileText },
      { to: '/dashboard/metrics', label: 'Metrics', icon: Gauge },
      { to: '/dashboard/traces', label: 'Invocations', icon: Activity },
      { to: '/dashboard/alerts', label: 'Alerts', icon: Bell },
      { to: '/dashboard/audit', label: 'Audit Log', icon: ScrollText },
    ],
  },
  {
    title: 'Billing',
    items: [
      { to: '/dashboard/usage', label: 'Usage', icon: SlidersHorizontal },
      { to: '/dashboard/invoices', label: 'Invoices', icon: Receipt },
      { to: '/dashboard/plans', label: 'Plans', icon: CreditCard },
    ],
  },
  {
    title: 'Account',
    items: [
      { to: '/dashboard/keys', label: 'API Keys', icon: KeyRound },
      { to: '/dashboard/team', label: 'Team', icon: Users },
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
