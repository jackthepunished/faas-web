import { useId, useMemo, useState } from 'react';
import {
  formatAxisTime,
  formatCompact,
  formatMs,
  formatNumber,
  type RangeKey,
  type SeriesPoint,
} from '@/lib/mock-data';

/* ------------------------------------------------------------------ *
 * Shared geometry
 * ------------------------------------------------------------------ */

const VB_W = 800;
const PAD = { top: 14, right: 16, bottom: 26, left: 48 };

/** Round a max up to a readable tick value. */
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const exp = Math.floor(Math.log10(value));
  const mag = Math.pow(10, exp);
  const norm = value / mag;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return step * mag;
}

function useHover(length: number) {
  const [index, setIndex] = useState<number | null>(null);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const plotLeft = (PAD.left / VB_W) * rect.width;
    const plotWidth = ((VB_W - PAD.left - PAD.right) / VB_W) * rect.width;
    const frac = (e.clientX - rect.left - plotLeft) / plotWidth;
    setIndex(Math.max(0, Math.min(length - 1, Math.round(frac * (length - 1)))));
  };

  return { index, onMove, onLeave: () => setIndex(null) };
}

interface TooltipProps {
  x: number;
  children: React.ReactNode;
}

/** Positioned by plot fraction, flipped near the right edge so it never clips. */
function Tooltip({ x, children }: TooltipProps) {
  const flip = x > 0.62;
  return (
    <div
      className="pointer-events-none absolute top-2 z-10 whitespace-nowrap rounded-lg border border-border bg-popover/95 px-3 py-2 text-xs shadow-xl backdrop-blur-sm"
      style={{
        left: `${(PAD.left / VB_W) * 100 + x * ((VB_W - PAD.left - PAD.right) / VB_W) * 100}%`,
        transform: flip ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)',
      }}
    >
      {children}
    </div>
  );
}

function GridLines({ ticks, height }: { ticks: number[]; height: number }) {
  const plotH = height - PAD.top - PAD.bottom;
  const max = ticks[ticks.length - 1];
  return (
    <g>
      {ticks.map((t) => {
        const y = PAD.top + plotH - (t / max) * plotH;
        return (
          <line
            key={t}
            x1={PAD.left}
            x2={VB_W - PAD.right}
            y1={y}
            y2={y}
            stroke="var(--chart-grid)"
            strokeWidth={1}
          />
        );
      })}
    </g>
  );
}

function YAxisLabels({
  ticks,
  height,
  format,
}: {
  ticks: number[];
  height: number;
  format: (n: number) => string;
}) {
  const plotH = height - PAD.top - PAD.bottom;
  const max = ticks[ticks.length - 1];
  return (
    <g>
      {ticks.map((t) => (
        <text
          key={t}
          x={PAD.left - 10}
          y={PAD.top + plotH - (t / max) * plotH + 4}
          textAnchor="end"
          className="fill-chart-muted text-[11px] [font-variant-numeric:tabular-nums]"
        >
          {format(t)}
        </text>
      ))}
    </g>
  );
}

function XAxisLabels({
  data,
  range,
  height,
}: {
  data: SeriesPoint[];
  range: RangeKey;
  height: number;
}) {
  const plotW = VB_W - PAD.left - PAD.right;
  const count = Math.min(6, data.length);
  const stride = Math.max(1, Math.floor((data.length - 1) / (count - 1)));
  const indices = [];
  for (let i = 0; i < data.length; i += stride) indices.push(i);

  return (
    <g>
      {indices.map((i) => (
        <text
          key={i}
          x={PAD.left + (i / (data.length - 1)) * plotW}
          y={height - 8}
          textAnchor={i === 0 ? 'start' : i >= data.length - stride ? 'end' : 'middle'}
          className="fill-chart-muted text-[11px] [font-variant-numeric:tabular-nums]"
        >
          {formatAxisTime(data[i].t, range)}
        </text>
      ))}
    </g>
  );
}

/* ------------------------------------------------------------------ *
 * Sparkline — for stat tiles. No axes, no hover; the tile carries the value.
 * ------------------------------------------------------------------ */

export function Sparkline({
  values,
  className = '',
  color = 'var(--chart-1)',
}: {
  values: number[];
  className?: string;
  color?: string;
}) {
  const { line, area } = useMemo(() => {
    const w = 120;
    const h = 32;
    const max = Math.max(...values);
    const min = Math.min(...values);
    const span = max - min || 1;
    const pts = values.map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - 2 - ((v - min) / span) * (h - 4);
      return [x, y] as const;
    });
    const d = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
    return { line: d, area: `${d}L${w},${h}L0,${h}Z` };
  }, [values]);

  const gid = useId();

  return (
    <svg viewBox="0 0 120 32" preserveAspectRatio="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * Area chart — one series over time. Single series, so no legend: the
 * surrounding card title names it.
 * ------------------------------------------------------------------ */

export function AreaChart({
  data,
  range,
  metric,
  label,
  height = 240,
  color = 'var(--chart-1)',
}: {
  data: SeriesPoint[];
  range: RangeKey;
  metric: keyof Omit<SeriesPoint, 't'>;
  label: string;
  height?: number;
  color?: string;
}) {
  const hover = useHover(data.length);
  const gid = useId();
  const plotH = height - PAD.top - PAD.bottom;

  // Geometry only depends on the data, so pointer moves reuse it.
  const { values, ticks, pts, line, area } = useMemo(() => {
    const values = data.map((d) => d[metric]);
    const max = niceMax(Math.max(...values));
    const plotW = VB_W - PAD.left - PAD.right;
    const pts = values.map((v, i) => {
      const x = PAD.left + (i / (values.length - 1)) * plotW;
      const y = PAD.top + plotH - (v / max) * plotH;
      return [x, y] as const;
    });
    const line = pts
      .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
      .join('');
    const area = `${line}L${PAD.left + plotW},${PAD.top + plotH}L${PAD.left},${PAD.top + plotH}Z`;
    return { values, max, ticks: [0, max / 2, max], pts, line, area };
  }, [data, metric, plotH]);

  const active = hover.index !== null ? data[hover.index] : null;

  return (
    <div
      className="relative touch-pan-y"
      onPointerMove={hover.onMove}
      onPointerLeave={hover.onLeave}
    >
      <svg
        viewBox={`0 0 ${VB_W} ${height}`}
        className="w-full"
        role="img"
        aria-label={`${label} over ${range}. Peak ${formatNumber(Math.max(...values))}.`}
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>

        <GridLines ticks={ticks} height={height} />
        <YAxisLabels ticks={ticks} height={height} format={formatCompact} />
        <XAxisLabels data={data} range={range} height={height} />

        <path d={area} fill={`url(#${gid})`} />
        <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />

        {hover.index !== null && (
          <g>
            <line
              x1={pts[hover.index][0]}
              x2={pts[hover.index][0]}
              y1={PAD.top}
              y2={PAD.top + plotH}
              stroke="var(--chart-axis)"
              strokeWidth={1}
            />
            {/* 2px surface ring keeps the marker legible over the fill */}
            <circle
              cx={pts[hover.index][0]}
              cy={pts[hover.index][1]}
              r={5}
              fill={color}
              stroke="var(--card)"
              strokeWidth={2}
            />
          </g>
        )}
      </svg>

      {active && hover.index !== null && (
        <Tooltip x={hover.index / (data.length - 1)}>
          <p className="mb-1 text-muted-foreground">{formatAxisTime(active.t, range)}</p>
          <p className="flex items-center gap-2 font-medium">
            <span className="h-2 w-2 rounded-full" style={{ background: color }} />
            {formatNumber(active[metric])}
            <span className="text-muted-foreground">{label}</span>
          </p>
        </Tooltip>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Percentile chart — p50/p95/p99 are ORDERED magnitude, not identity, so
 * they take a single-hue ordinal ramp rather than categorical hues.
 * Direct labels at the line ends mean identity never rests on color.
 * ------------------------------------------------------------------ */

const PERCENTILES = [
  { key: 'p99' as const, label: 'p99', color: 'var(--chart-ord-1)' },
  { key: 'p95' as const, label: 'p95', color: 'var(--chart-ord-2)' },
  { key: 'p50' as const, label: 'p50', color: 'var(--chart-ord-3)' },
];

export function PercentileChart({
  data,
  range,
  height = 240,
}: {
  data: SeriesPoint[];
  range: RangeKey;
  height?: number;
}) {
  const hover = useHover(data.length);
  const max = niceMax(Math.max(...data.map((d) => d.p99)));
  const ticks = [0, max / 2, max];
  const plotW = VB_W - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;

  const xOf = (i: number) => PAD.left + (i / (data.length - 1)) * plotW;
  const yOf = (v: number) => PAD.top + plotH - (v / max) * plotH;

  const active = hover.index !== null ? data[hover.index] : null;

  return (
    <div>
      <div
        className="relative touch-pan-y"
        onPointerMove={hover.onMove}
        onPointerLeave={hover.onLeave}
      >
        <svg
          viewBox={`0 0 ${VB_W} ${height}`}
          className="w-full"
          role="img"
          aria-label={`Response latency percentiles over ${range}.`}
        >
          <GridLines ticks={ticks} height={height} />
          <YAxisLabels ticks={ticks} height={height} format={(n) => `${Math.round(n)}ms`} />
          <XAxisLabels data={data} range={range} height={height} />

          {PERCENTILES.map((p) => {
            const d = data
              .map((pt, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(pt[p.key]).toFixed(1)}`)
              .join('');
            return (
              <path
                key={p.key}
                d={d}
                fill="none"
                stroke={p.color}
                strokeWidth={2}
                strokeLinejoin="round"
              />
            );
          })}

          {hover.index !== null && (
            <g>
              <line
                x1={xOf(hover.index)}
                x2={xOf(hover.index)}
                y1={PAD.top}
                y2={PAD.top + plotH}
                stroke="var(--chart-axis)"
                strokeWidth={1}
              />
              {PERCENTILES.map((p) => (
                <circle
                  key={p.key}
                  cx={xOf(hover.index!)}
                  cy={yOf(data[hover.index!][p.key])}
                  r={5}
                  fill={p.color}
                  stroke="var(--card)"
                  strokeWidth={2}
                />
              ))}
            </g>
          )}

          {/* Direct labels — secondary encoding so the ramp needn't carry identity */}
          {PERCENTILES.map((p) => (
            <text
              key={p.key}
              x={VB_W - PAD.right - 2}
              y={yOf(data[data.length - 1][p.key]) - 7}
              textAnchor="end"
              className="fill-muted-foreground text-[11px] font-medium"
            >
              {p.label}
            </text>
          ))}
        </svg>

        {active && hover.index !== null && (
          <Tooltip x={hover.index / (data.length - 1)}>
            <p className="mb-1.5 text-muted-foreground">{formatAxisTime(active.t, range)}</p>
            <div className="flex flex-col gap-1">
              {PERCENTILES.map((p) => (
                <p key={p.key} className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                    <span className="text-muted-foreground">{p.label}</span>
                  </span>
                  <span className="font-medium [font-variant-numeric:tabular-nums]">
                    {formatMs(active[p.key])}
                  </span>
                </p>
              ))}
            </div>
          </Tooltip>
        )}
      </div>

      {/* Legend — always present for ≥2 series */}
      <ul className="mt-3 flex flex-wrap items-center gap-4">
        {PERCENTILES.map((p) => (
          <li key={p.key} className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-0.5 w-4 rounded-full" style={{ background: p.color }} />
            {p.label} latency
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Bar chart — compute consumption per bucket. 4px rounded data-ends
 * anchored to the baseline, 2px gap between adjacent bars.
 * ------------------------------------------------------------------ */

export function UsageBars({
  data,
  range,
  height = 220,
}: {
  data: SeriesPoint[];
  range: RangeKey;
  height?: number;
}) {
  const hover = useHover(data.length);
  const values = data.map((d) => d.gbSeconds);
  const max = niceMax(Math.max(...values));
  const ticks = [0, max / 2, max];
  const plotW = VB_W - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;
  const slot = plotW / data.length;
  const barW = Math.max(2, slot - 2);

  const active = hover.index !== null ? data[hover.index] : null;

  return (
    <div
      className="relative touch-pan-y"
      onPointerMove={hover.onMove}
      onPointerLeave={hover.onLeave}
    >
      <svg
        viewBox={`0 0 ${VB_W} ${height}`}
        className="w-full"
        role="img"
        aria-label={`Compute consumption in GB-seconds over ${range}.`}
      >
        <GridLines ticks={ticks} height={height} />
        <YAxisLabels ticks={ticks} height={height} format={formatCompact} />
        <XAxisLabels data={data} range={range} height={height} />

        {values.map((v, i) => {
          const h = (v / max) * plotH;
          return (
            <rect
              key={i}
              x={PAD.left + i * slot + (slot - barW) / 2}
              y={PAD.top + plotH - h}
              width={barW}
              height={Math.max(1, h)}
              rx={Math.min(4, barW / 2)}
              fill="var(--chart-1)"
              opacity={hover.index === null || hover.index === i ? 1 : 0.45}
            />
          );
        })}
      </svg>

      {active && hover.index !== null && (
        <Tooltip x={hover.index / (data.length - 1)}>
          <p className="mb-1 text-muted-foreground">{formatAxisTime(active.t, range)}</p>
          <p className="font-medium [font-variant-numeric:tabular-nums]">
            {formatNumber(Math.round(active.gbSeconds))}{' '}
            <span className="text-muted-foreground">GB-seconds</span>
          </p>
        </Tooltip>
      )}
    </div>
  );
}
