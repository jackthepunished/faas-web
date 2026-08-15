import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Reveal } from './reveal';
import { TruchetTiles } from './shapes/truchet-tiles';

export function CustomComponents() {
  return (
    <section className="relative overflow-hidden border-t border-border">
      {/* Truchet tiles: one small rule set, rotated at random, that can never
          produce an invalid join — and the highlighted routes are walked out of
          that same set rather than drawn. The mask keeps the lattice densest
          between the two columns and clears it off the copy. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          // Nudged just right of centre so the densest part falls in the gutter
          // between the copy and the form card rather than on the paragraphs.
          WebkitMaskImage: 'radial-gradient(72% 82% at 52% 50%, black, transparent 78%)',
          maskImage: 'radial-gradient(72% 82% at 52% 50%, black, transparent 78%)',
        }}
      >
        <TruchetTiles />
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-24 sm:px-6 lg:grid-cols-2">
        <Reveal>
          <h2 className="text-balance text-2xl font-medium tracking-tight sm:text-3xl">
            Codify the rules of your organization.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Platform teams define custom components once — golden paths with your policies baked
            in. Every developer gets one-click deploys that enforce those rules automatically,
            right next to the infrastructure you already run.
          </p>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            Connected components emit real, exportable manifests. Nothing is hidden behind a
            proprietary runtime.
          </p>
        </Reveal>

        {/* Form mock — decorative. `inert` keeps its inputs and buttons out
            of the tab order; aria-hidden keeps them out of the a11y tree. */}
        <Reveal delay={0.15}>
          <div
            inert
            aria-hidden="true"
            className="rounded-xl border border-border bg-card p-6"
          >
          <h3 className="text-sm font-medium">New custom component</h3>
          <Separator className="my-4" />

          <p className="mb-3 text-xs font-medium text-muted-foreground">Metadata</p>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="cc-name" className="text-xs">
                Name
              </Label>
              <Input id="cc-name" placeholder="EdgeQueue" className="h-8 font-mono text-xs" />
              <p className="text-[11px] text-muted-foreground">
                PascalCase, no spaces — how projects reference this component.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="cc-category" className="text-xs">
                  Category
                </Label>
                <Input id="cc-category" placeholder="messaging" className="h-8 text-xs" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="cc-icon" className="text-xs">
                  Icon
                </Label>
                <Input id="cc-icon" placeholder="radio" className="h-8 text-xs" />
              </div>
            </div>
          </div>

          <p className="mb-3 mt-5 text-xs font-medium text-muted-foreground">Fields</p>
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <span className="font-mono text-xs text-muted-foreground">
              max_throughput · number
            </span>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
              <Plus className="h-3 w-3" />
              Add field
            </Button>
          </div>

          <p className="mb-3 mt-5 text-xs font-medium text-muted-foreground">Emits</p>
          <div className="rounded-md border border-border bg-background p-3">
            <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-muted-foreground">
{`kind: MicroVM
spec:
  memory: {{ memory_mb }}
  snapshot: warm`}
            </pre>
          </div>
          <Button variant="outline" size="sm" className="mt-3 h-7 gap-1 text-xs">
            <Plus className="h-3 w-3" />
            Add manifest
          </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
