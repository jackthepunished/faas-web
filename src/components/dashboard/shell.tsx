import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import {
  ChevronDown,
  ChevronRight,
  FileText,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Wind,
  X,
} from 'lucide-react';
import { useData } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/toast';
import { CommandPalette } from './command-palette';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
  { to: '/dashboard/functions', label: 'Functions', icon: GitBranch, exact: false },
  { to: '/dashboard/logs', label: 'Logs', icon: FileText, exact: false },
  { to: '/dashboard/usage', label: 'Usage', icon: SlidersHorizontal, exact: false },
  { to: '/dashboard/settings', label: 'Settings', icon: Settings, exact: false },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map(({ to, label, icon: Icon, exact }) => (
        <Link
          key={to}
          to={to}
          activeOptions={{ exact }}
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          activeProps={{ className: 'bg-muted !text-foreground', 'aria-current': 'page' }}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <Link
        to="/"
        className="flex items-center gap-2.5 px-2.5 py-1"
        aria-label="Gregale home"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-gradient-to-b from-white/10 to-transparent">
          <Wind className="h-3.5 w-3.5 text-brand" />
        </span>
        <span className="text-sm font-semibold tracking-tight">Gregale</span>
      </Link>

      {/* Workspace identity lives in the breadcrumb now, so the sidebar is
          purely navigation rather than a second place to look for it. */}
      <div className="mt-7">
        <p className="label-mono px-2.5 pb-2 text-muted-foreground/70">Navigate</p>
        <NavLinks onNavigate={onNavigate} />
      </div>
    </>
  );
}

/** Static dashboard routes a breadcrumb is allowed to link back to. */
type CrumbTo = '/dashboard/functions' | '/dashboard/logs' | '/dashboard/usage' | '/dashboard/settings';

const SECTION_TITLES: Record<string, { label: string; to: CrumbTo }> = {
  functions: { label: 'Functions', to: '/dashboard/functions' },
  logs: { label: 'Logs', to: '/dashboard/logs' },
  usage: { label: 'Usage & billing', to: '/dashboard/usage' },
  settings: { label: 'Settings', to: '/dashboard/settings' },
};

/**
 * Page identity for the top bar. Without this the bar anchors nothing — the
 * sidebar knows where you are but the bar itself never said.
 */
function Breadcrumbs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { functions } = useData();

  const segments = pathname.replace(/^\/dashboard\/?/, '').split('/').filter(Boolean);
  const [section, detail] = segments;
  const known = section ? SECTION_TITLES[section] : undefined;

  const trail: { label: string; to?: CrumbTo }[] = [];
  if (!section) {
    trail.push({ label: 'Overview' });
  } else if (known) {
    // Only the section is a link, and only when something sits below it.
    trail.push(detail ? { label: known.label, to: known.to } : { label: known.label });
  } else {
    trail.push({ label: section });
  }

  if (section === 'functions' && detail) {
    trail.push({
      label:
        detail === 'new'
          ? 'New function'
          : (functions.find((f) => f.id === detail)?.name ?? 'Function'),
    });
  }

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
      <Link
        to="/dashboard"
        className="flex shrink-0 items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-muted"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded bg-brand/20 text-[9px] font-semibold text-brand">
          A
        </span>
        <span className="hidden font-medium sm:inline">acme-corp</span>
      </Link>

      {trail.map((crumb, i) => (
        <span key={crumb.label} className="flex min-w-0 items-center gap-1.5">
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
          {crumb.to ? (
            <Link
              to={crumb.to}
              className="shrink-0 rounded px-1 py-0.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              {crumb.label}
            </Link>
          ) : (
            <span
              aria-current={i === trail.length - 1 ? 'page' : undefined}
              className="truncate px-1 py-0.5 font-medium"
            >
              {crumb.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}

/** Account control — identity and sign-out belong together, in one place. */
function AccountMenu({ onSignOut }: { onSignOut: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg py-1 pl-1 pr-1.5 transition-colors hover:bg-muted"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[11px] font-medium">
          {user?.initials ?? 'GG'}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1.5 w-56 overflow-hidden rounded-lg border border-border bg-popover shadow-2xl"
        >
          <div className="border-b border-border px-3 py-2.5">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <div className="p-1">
            <Link
              to="/dashboard/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Settings className="h-3.5 w-3.5" />
              Workspace settings
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onSignOut();
              }}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // ⌘K / Ctrl+K anywhere in the dashboard; Escape closes the mobile drawer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // The drawer overlays the page, so the page beneath must not scroll.
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  const handleSignOut = () => {
    signOut();
    toast({ kind: 'info', title: 'Signed out' });
    navigate({ to: '/login' });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-card px-3 py-5 lg:flex">
        <SidebarBody />

        {/* Identity and sign-out live in the top bar's account menu, so the
            sidebar footer carries context instead of duplicating them. */}
        <div className="mt-auto">
          <div className="rounded-lg border border-border bg-background p-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-1.5 w-1.5">
                <span
                  className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                  style={{ background: 'var(--status-good)' }}
                />
                <span
                  className="relative inline-flex h-1.5 w-1.5 rounded-full"
                  style={{ background: 'var(--status-good)' }}
                />
              </span>
              <p className="font-mono text-xs">fra-metal-1</p>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Private beta on single-node metal. Multi-node scaling is on the roadmap.
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-border bg-card px-3 py-5">
            <button
              aria-label="Close navigation"
              className="absolute right-3 top-4 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarBody onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-60">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-6">
          <button
            aria-label="Open navigation"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </button>

          <Breadcrumbs />

          <div className="ml-auto flex items-center gap-1.5">
            {/* Compact, so identity owns the left rather than a stretched
                field that only ever opens the palette anyway. */}
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Search or jump to"
              className="flex h-8 items-center gap-2 rounded-lg border border-border bg-card px-2.5 text-sm text-muted-foreground transition-colors hover:border-border-secondary hover:text-foreground"
            >
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden lg:inline">Search</span>
              <kbd className="label-mono hidden rounded border border-border px-1 py-0.5 lg:block">
                ⌘K
              </kbd>
            </button>

            <Link
              to="/dashboard/functions/new"
              className="flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New function</span>
            </Link>

            <span className="mx-1 hidden h-5 w-px bg-border sm:block" />

            <AccountMenu onSignOut={handleSignOut} />
          </div>
        </header>

        <main id="main" className={cn('px-4 py-8 sm:px-6 lg:px-8')}>
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
