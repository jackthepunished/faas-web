import { createFileRoute } from '@tanstack/react-router';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/dashboard/primitives';
import { PLANS } from '@/lib/mock-resources';
import { cn } from '@/lib/utils';
import { consoleHead } from '@/lib/seo';

export const Route = createFileRoute('/dashboard/plans')({
  component: PlansPage,
  head: () => consoleHead('plans'),
});

function PlansPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Plans"
        description="Every plan is metered the same way — the tier sets included capacity, not the rate."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              'flex flex-col rounded-xl border p-6 transition-colors',
              plan.current ? 'border-brand bg-brand/5' : 'border-border bg-card'
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold tracking-tight">{plan.name}</h2>
              {plan.current && (
                <span className="label-mono rounded-full border border-brand/40 px-2 py-0.5 text-brand">
                  current
                </span>
              )}
            </div>

            <p className="mt-4 text-3xl font-semibold tracking-tight [font-variant-numeric:tabular-nums]">
              ${plan.priceUsd}
              <span className="ml-1 text-sm font-normal text-muted-foreground">/month</span>
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{plan.blurb}</p>

            <ul className="mt-6 flex flex-1 flex-col gap-2.5">
              {plan.includes.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check
                    className="mt-0.5 h-3.5 w-3.5 shrink-0"
                    style={{ color: 'var(--status-good)' }}
                  />
                  <span className="text-sm text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>

            <Button
              variant={plan.current ? 'outline' : 'default'}
              size="sm"
              disabled={plan.current}
              className="mt-6 w-full"
            >
              {plan.current ? 'Current plan' : `Switch to ${plan.name}`}
            </Button>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Usage beyond the included capacity is billed at the standard rate shown on the Usage page.
      </p>
    </div>
  );
}
