import { motion, useReducedMotion } from 'framer-motion';
import { EASE } from '../reveal';

/**
 * Truchet Tiles — the classic Smith arc tile, laid on a grid at random
 * rotation (in the spirit of the Truchet pattern work in generative SVG
 * collections). Deterministic: generated once at module scope from a seeded
 * PRNG, so the pattern is identical across renders and between server and
 * client.
 *
 * The tile set is two orientations of the same piece: a pair of quarter arcs
 * struck from opposite corners. Because every arc lands on an edge midpoint,
 * any tile abuts any other tile and the curves always meet — which is the
 * whole reason this pattern belongs under "codify the rules". A small fixed
 * rule set, rotated arbitrarily, cannot produce an invalid arrangement.
 *
 * That property is also what makes the second layer possible. Following an arc
 * out of one tile and into its neighbour traces a continuous route through the
 * lattice, so the highlighted paths here are not drawn by hand — they are
 * walked out of the same rules that drew the background, which is the section's
 * argument about golden paths, stated in the geometry.
 */

const W = 880;
const H = 480;
const CELL = 52;
const COLS = Math.ceil(W / CELL);
const ROWS = Math.ceil(H / CELL);

type Edge = 'N' | 'E' | 'S' | 'W';

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A quarter arc from (sx,sy) to (ex,ey) struck around (cx,cy).
 *
 * The sweep flag is derived rather than hand-set: the cross product of the two
 * radius vectors is positive exactly when the turn reads clockwise on screen,
 * which is what sweep=1 means in SVG's y-down space. Picking it by hand for
 * four different corner arcs is where this kind of tile usually goes wrong.
 */
function arc(cx: number, cy: number, sx: number, sy: number, ex: number, ey: number): string {
  const cross = (sx - cx) * (ey - cy) - (sy - cy) * (ex - cx);
  const sweep = cross > 0 ? 1 : 0;
  const r = CELL / 2;
  return `M${sx},${sy}A${r},${r} 0 0,${sweep} ${ex},${ey}`;
}

/** Edge midpoints of the tile at (col,row). */
function midpoints(col: number, row: number) {
  const x = col * CELL;
  const y = row * CELL;
  const h = CELL / 2;
  return {
    N: [x + h, y] as const,
    E: [x + CELL, y + h] as const,
    S: [x + h, y + CELL] as const,
    W: [x, y + h] as const,
  };
}

/**
 * Which edge each edge is joined to, per orientation.
 *
 * Orientation 0 strikes its arcs from the top-left and bottom-right corners,
 * so it joins N–W and S–E. Orientation 1 uses the other diagonal.
 */
const PARTNER: Record<0 | 1, Record<Edge, Edge>> = {
  0: { N: 'W', W: 'N', S: 'E', E: 'S' },
  1: { N: 'E', E: 'N', W: 'S', S: 'W' },
};

/** The single arc of this tile that carries `edge`, as an SVG path. */
function arcPath(col: number, row: number, o: 0 | 1, edge: Edge): string {
  const x = col * CELL;
  const y = row * CELL;
  const m = midpoints(col, row);
  const other = PARTNER[o][edge];
  const [sx, sy] = m[edge];
  const [ex, ey] = m[other];

  // The arc's centre is the corner the two edges share.
  const pair = [edge, other].sort().join('');
  const centre =
    pair === 'NW'
      ? ([x, y] as const)
      : pair === 'ES'
        ? ([x + CELL, y + CELL] as const)
        : pair === 'EN'
          ? ([x + CELL, y] as const)
          : ([x, y + CELL] as const); // SW

  return arc(centre[0], centre[1], sx, sy, ex, ey);
}

/** Orientation grid — the rule set, fixed once. */
const GRID: (0 | 1)[][] = (() => {
  const rand = mulberry32(1729);
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => (rand() < 0.5 ? 0 : 1) as 0 | 1)
  );
})();

/** Every arc in the lattice — two per tile. */
const LATTICE: string[] = (() => {
  const out: string[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const o = GRID[row][col];
      // N and S sit on different arcs in both orientations, so taking one
      // path from each yields the tile's two arcs exactly once.
      out.push(arcPath(col, row, o, 'N'), arcPath(col, row, o, 'S'));
    }
  }
  return out;
})();

const OPPOSITE: Record<Edge, Edge> = { N: 'S', S: 'N', E: 'W', W: 'E' };
const STEP: Record<Edge, [number, number]> = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };

/**
 * Walk a route through the lattice from one boundary edge.
 *
 * Enter a tile on an edge, leave by that edge's partner, cross into the
 * neighbour, repeat. Stops at the grid boundary or when the route closes on
 * itself — Truchet routes are either loops or run edge to edge, never dead ends.
 */
function trace(
  startCol: number,
  startRow: number,
  startEdge: Edge
): { d: string; arcs: string[] } {
  const segments: string[] = [];
  const arcs: string[] = [];
  const seen = new Set<string>();
  let col = startCol;
  let row = startRow;
  let edge = startEdge;

  for (let i = 0; i < 240; i++) {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) break;
    const key = `${col},${row},${edge}`;
    if (seen.has(key)) break; // closed loop
    seen.add(key);

    const o = GRID[row][col];
    const exit = PARTNER[o][edge];
    segments.push(arcPath(col, row, o, edge));
    // Direction-free identity for this arc, so the same route walked from the
    // other end produces the same id.
    arcs.push(`${col},${row},${[edge, exit].sort().join('')}`);

    seen.add(`${col},${row},${exit}`);
    const [dx, dy] = STEP[exit];
    col += dx;
    row += dy;
    edge = OPPOSITE[exit];
  }

  return { d: segments.join(''), arcs };
}

/**
 * The golden paths: the longest distinct routes reachable from the boundary.
 *
 * Deduplication is by the direction-free set of arcs, not by the path string —
 * an edge-to-edge route is discovered twice, once from each end, and those two
 * walks emit different `d` strings for the same curve. Keying on the string
 * let a duplicate through, which drew one route twice at double opacity.
 *
 * Longest, because a short stub reads as a smudge rather than a route; the
 * point only lands if the eye can follow one across the section.
 */
const PATHS: string[] = (() => {
  const starts: [number, number, Edge][] = [];
  for (let row = 0; row < ROWS; row++) {
    starts.push([0, row, 'W'], [COLS - 1, row, 'E']);
  }
  for (let col = 0; col < COLS; col++) {
    starts.push([col, 0, 'N'], [col, ROWS - 1, 'S']);
  }

  const unique = new Map<string, { d: string; len: number }>();
  for (const [col, row, edge] of starts) {
    const { d, arcs } = trace(col, row, edge);
    if (arcs.length <= 6) continue;
    const key = [...arcs].sort().join('|');
    if (!unique.has(key)) unique.set(key, { d, len: arcs.length });
  }

  return [...unique.values()]
    .sort((a, b) => b.len - a.len)
    .slice(0, 3)
    .map((c) => c.d);
})();

export function TruchetTiles({ className = '' }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    >
      {/* The rule set. */}
      <g fill="none" stroke="var(--brand)" strokeOpacity={0.09} strokeWidth={1}>
        {LATTICE.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>

      {/* The routes those rules produce. Drawn on scroll-in, staggered, so the
          paths read as being derived from the lattice rather than laid over
          it. Reduced motion keeps the paths and drops the drawing.

          0.30 against the lattice's 0.09 is a ~3x step — enough that the eye
          follows a route across the section, light enough that the paragraph it
          crosses stays readable. Heavier weights were tried and start eating
          the body copy; holding the routes off the text with a second mask was
          worse still, since it pushed them behind the opaque form card and left
          only disconnected arcs, which defeats the point of tracing them. */}
      <g
        fill="none"
        stroke="var(--brand)"
        strokeOpacity={0.3}
        strokeWidth={2}
        strokeLinecap="round"
      >
        {PATHS.map((d, i) => (
          <motion.path
            key={i}
            d={d}
            initial={reduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true, margin: '-100px 0px' }}
            transition={{ duration: 1.9, delay: 0.2 + i * 0.28, ease: EASE }}
          />
        ))}
      </g>
    </svg>
  );
}
