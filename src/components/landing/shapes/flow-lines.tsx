/**
 * Flow Lines — streamlines traced through a smooth angle field (in the spirit
 * of classic streamline-placement pattern work). Generated once at module
 * scope with a seeded PRNG, so the pattern is deterministic across renders.
 */

const W = 900;
const H = 420;
const STEP = 4;
const STEPS = 80;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth swirling angle field — reads as wind moving left to right. */
function angleAt(x: number, y: number): number {
  const u = x / 110;
  const v = y / 110;
  return Math.cos(u * 0.7 + Math.sin(v * 1.5)) * 0.9 + Math.sin(v * 1.1 - u * 0.35) * 0.55;
}

function streamline(sx: number, sy: number): string | null {
  const halves: [number, number][][] = [];
  for (const dir of [1, -1] as const) {
    let x = sx;
    let y = sy;
    const seg: [number, number][] = [];
    for (let i = 0; i < STEPS; i++) {
      const a = angleAt(x, y);
      x += Math.cos(a) * STEP * dir;
      y += Math.sin(a) * STEP * dir;
      if (x < -30 || x > W + 30 || y < -30 || y > H + 30) break;
      seg.push([x, y]);
    }
    halves.push(seg);
  }
  const pts = [...halves[1].reverse(), [sx, sy] as [number, number], ...halves[0]];
  if (pts.length < 8) return null;
  return (
    'M' +
    pts.map(([x, y]) => `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`).join('L')
  );
}

const PATHS: string[] = (() => {
  const rand = mulberry32(42);
  const paths: string[] = [];
  for (let gy = 0; gy <= H; gy += 44) {
    for (let gx = 0; gx <= W; gx += 52) {
      const d = streamline(gx + (rand() - 0.5) * 30, gy + (rand() - 0.5) * 30);
      if (d) paths.push(d);
    }
  }
  return paths;
})();

export function FlowLines({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    >
      {PATHS.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="var(--brand)"
          strokeOpacity={0.14}
          strokeWidth={1}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}
