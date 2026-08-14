import {
  ChevronsLeft,
  GitBranch,
  Layers,
  Lock,
  Search,
  Settings,
  SlidersHorizontal,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DitherGlow } from './dither-glow';
import { Reveal } from './reveal';

const SIDEBAR_ITEMS = [
  { label: 'Infrastructure', icon: Layers, active: true },
  { label: 'Versions', icon: GitBranch },
  { label: 'Usage', icon: SlidersHorizontal },
  { label: 'Security', icon: Lock },
  { label: 'Settings', icon: Settings },
];

const PROJECTS = [
  { name: 'image-resize', status: 'Running', components: '4/4', updated: '2h ago' },
  { name: 'webhook-router', status: 'Idle', components: '2/2', updated: '1d ago' },
  { name: 'nightly-etl', status: 'Running', components: '6/6', updated: '3d ago' },
];

/**
 * The dashboard mock as a standalone card, reusable inside other sections.
 *
 * Carries `console`, so it renders in the dark palette even though it now sits
 * on a white page. That is the point: the console really is dark, and a product
 * shot that recoloured itself to match the marketing site would be a lie. The
 * inset dark plate also gives the light hero its one high-contrast anchor.
 */
export function DashboardCard() {
  return (
    <div className="console overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-2xl shadow-mint-12/15">
      {/* Window top bar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-border-secondary" />
            <span className="h-2.5 w-2.5 rounded-full bg-border-secondary" />
            <span className="h-2.5 w-2.5 rounded-full bg-border-secondary" />
          </div>
          <span className="text-xs text-muted-foreground">
            main · Gregale — agentic serverless infrastructure · v0.8.2
          </span>
        </div>
        <div className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
          <Search className="h-3 w-3" />
          <span>Press ? for shortcuts</span>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden w-48 shrink-0 flex-col border-r border-border p-3 md:flex">
          <p className="mb-3 px-2 text-xs font-medium">my-app</p>
          <nav className="flex flex-col gap-0.5">
            {SIDEBAR_ITEMS.map(({ label, icon: Icon, active }) => (
              <span
                key={label}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs ${
                  active ? 'bg-muted text-foreground' : 'text-muted-foreground'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </span>
            ))}
          </nav>
          <span className="mt-16 flex items-center gap-2 px-2 text-xs text-muted-foreground">
            <ChevronsLeft className="h-3.5 w-3.5" />
            Collapse
          </span>
        </aside>

        {/* Main panel */}
        <div className="flex-1 p-6 sm:p-8">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
            A Vercel for your own metal.
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Every project, function, and version — one surface.
          </p>

          <div className="relative mt-6">
            <DitherGlow className="-inset-x-10 -inset-y-8" />
            <div className="relative grid gap-3 sm:grid-cols-3">
              {PROJECTS.map((project) => (
                <div
                  key={project.name}
                  className="rounded-lg border border-border bg-background p-4 transition-colors hover:border-border-secondary"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-mono text-sm">{project.name}</h3>
                    <Badge
                      variant="outline"
                      // Running is a *state*, so it reads from the status
                      // palette rather than the category taxonomy, which no
                      // longer means "healthy" now that security is violet.
                      className={
                        project.status === 'Running'
                          ? 'border-status-good/40 text-status-good'
                          : 'border-border text-muted-foreground'
                      }
                    >
                      {project.status}
                    </Badge>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {project.components} components healthy · Updated {project.updated}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Standalone section wrapper — kept for reuse if the card leaves the hero. */
export function DashboardPreview() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      <Reveal y={40}>
        <DashboardCard />
      </Reveal>
    </section>
  );
}
