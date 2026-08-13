import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  ChevronsLeft,
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
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/toast';
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
          className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          activeProps={{ className: 'bg-muted !text-foreground' }}
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

      <div className="mt-6">
        <p className="label-mono px-2.5 pb-2 text-muted-foreground/70">Workspace</p>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-md border border-border bg-background px-2.5 py-2 text-sm transition-colors hover:border-border-secondary"
        >
          <span className="flex items-center gap-2">
            <span className="flex h-4 w-4 items-center justify-center rounded bg-brand/20 text-[9px] font-semibold text-brand">
              A
            </span>
            acme-corp
          </span>
          <ChevronsLeft className="h-3.5 w-3.5 -rotate-90 text-muted-foreground" />
        </button>
      </div>

      <div className="mt-6">
        <p className="label-mono px-2.5 pb-2 text-muted-foreground/70">Navigate</p>
        <NavLinks onNavigate={onNavigate} />
      </div>
    </>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

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

        <div className="mt-auto space-y-3">
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-xs font-medium">Private beta</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Single-node metal. Multi-node scaling is on the roadmap.
            </p>
          </div>
          <div className="flex items-center gap-2.5 px-1">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium">
              {user?.initials ?? 'GG'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{user?.name ?? 'Signed out'}</p>
              <p className="truncate text-[11px] text-muted-foreground">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Sign out"
              className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
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

          <label className="relative flex max-w-sm flex-1 items-center">
            <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search functions, deployments, logs…"
              className="h-9 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-brand/50"
            />
          </label>

          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/dashboard/functions/new"
              className="hidden items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 sm:flex"
            >
              <Plus className="h-3.5 w-3.5" />
              New function
            </Link>
            <span className="hidden items-center gap-2 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground sm:flex">
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
              fra-metal-1
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[11px] font-medium">
              {user?.initials ?? 'GG'}
            </span>
          </div>
        </header>

        <main className={cn('px-4 py-8 sm:px-6 lg:px-8')}>
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
