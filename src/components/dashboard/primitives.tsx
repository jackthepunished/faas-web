import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, CircleDashed, Loader2, TrendingDown, TrendingUp } from 'lucide-react';
import type { LogLevel, RunState } from '@/lib/mock-data';
import { Sparkline } from './charts';
import {
  DitherButton,
  Sparkline as DitherSparkline,
  type DitherColor,
} from '@/components/dither-kit';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ *
 * Status — color is always paired with an icon and a text label, so state
 * never rests on hue alone.
 * ------------------------------------------------------------------ */

const STATE_CONFIG: Record<
  RunState,
  { label: string; color: string; icon: typeof CheckCircle2 }
> = {
  running: { label: 'Running', color: 'var(--status-good)', icon: CheckCircle2 },
  idle: { label: 'Idle', color: 'var(--chart-muted)', icon: CircleDashed },
  error: { label: 'Error', color: 'var(--status-critical)', icon: AlertTriangle },
  deploying: { label: 'Deploying', color: 'var(--status-warning)', icon: Loader2 },
};

export function StateBadge({ state, className }: { state: RunState; className?: string }) {
  const cfg = STATE_CONFIG[state];
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs',
        className
      )}
      style={{ borderColor: `color-mix(in oklab, ${cfg.color} 35%, transparent)`, color: cfg.color }}
    >
      <Icon className={cn('h-3 w-3', state === 'deploying' && 'animate-spin')} />
      {cfg.label}
    </span>
  );
}

const LEVEL_COLOR: Record<LogLevel, string> = {
  info: 'var(--chart-muted)',
  debug: 'var(--chart-muted)',
  warn: 'var(--status-warning)',
  error: 'var(--status-critical)',
};

export function LevelTag({ level }: { level: LogLevel }) {
  return (
    <span
      className="label-mono inline-flex w-14 shrink-0 items-center gap-1"
      style={{ color: LEVEL_COLOR[level] }}
    >
      {level === 'error' && <AlertTriangle className="h-3 w-3" />}
      {level}
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Stat tile — a single current value with a delta and a sparkline. The
 * right form for one headline number; never a one-bar bar chart.
 * ------------------------------------------------------------------ */

export function StatTile({
  label,
  value,
  unit,
  delta,
  deltaGood = true,
  series,
  color = 'var(--chart-1)',
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  delta?: number;
  /** Whether a rising delta is a good thing (invocations) or bad (errors). */
  deltaGood?: boolean;
  series?: number[];
  color?: string;
  /** Set to render the sparkline with Dither Kit in this palette colour
   * instead of the flat SVG spark. */
  tone?: DitherColor;
}) {
  const positive = (delta ?? 0) >= 0;
  const good = positive === deltaGood;
  const Arrow = positive ? TrendingUp : TrendingDown;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="label-mono text-muted-foreground">{label}</p>

      <div className="mt-3 flex items-end justify-between gap-4">
        <div>
          <p className="text-3xl leading-none font-semibold tracking-tight">
            {value}
            {unit && <span className="ml-1 text-base text-muted-foreground">{unit}</span>}
          </p>

          {delta !== undefined && (
            <p
              className="mt-2 flex items-center gap-1 text-xs [font-variant-numeric:tabular-nums]"
              style={{ color: good ? 'var(--status-good)' : 'var(--status-critical)' }}
            >
              <Arrow className="h-3 w-3" />
              {positive ? '+' : ''}
              {delta.toFixed(1)}%
              <span className="text-muted-foreground">vs prev period</span>
            </p>
          )}
        </div>

        {series &&
          series.length > 1 &&
          (tone ? (
            <DitherSparkline
              data={series}
              color={tone}
              bloom="low"
              bloomOnHover
              className="h-9 w-24 shrink-0"
            />
          ) : (
            <Sparkline values={series} color={color} className="h-9 w-24 shrink-0" />
          ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Layout helpers
 * ------------------------------------------------------------------ */

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-xl border border-border bg-card', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            {title && <h2 className="text-sm font-semibold tracking-tight">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

/** Segmented time-range control — filters sit in one row above the charts. */
export function RangeSelector<T extends string>({
  value,
  options,
  onChange,
  dither = false,
}: {
  value: T;
  options: { key: T; label: string }[];
  onChange: (key: T) => void;
  /** Render the segments as Dither Kit buttons — solid mint for the active
   * range, a quiet dotted grey for the rest. */
  dither?: boolean;
}) {
  if (dither) {
    return (
      <div role="group" aria-label="Time range" className="flex gap-1">
        {options.map((opt) => {
          const active = value === opt.key;
          return (
            <DitherButton
              key={opt.key}
              aria-pressed={active}
              onClick={() => onChange(opt.key)}
              color={active ? 'green' : 'grey'}
              variant={active ? 'solid' : 'dotted'}
              className={cn(
                'h-8 px-2.5 py-0 text-xs',
                active ? 'text-background' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {opt.label}
            </DitherButton>
          );
        })}
      </div>
    );
  }

  return (
    <div role="group" aria-label="Time range" className="flex rounded-md border border-border p-0.5">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          aria-pressed={value === opt.key}
          onClick={() => onChange(opt.key)}
          className={cn(
            'rounded px-2.5 py-1 text-xs transition-colors',
            value === opt.key
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-6 py-14 text-center">
      <CircleDashed className="h-5 w-5 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
