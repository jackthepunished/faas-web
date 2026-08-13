/**
 * Scattered iso-cube grid — wireframe isometric cubes dropped onto a lattice
 * with seeded randomness (in the spirit of scattered-cube-grid generative
 * patterns). Deterministic: built once at module scope.
 */

const W = 700;
const H = 380;
const EDGE = 20;
const COS30 = Math.cos(Math.PI / 6);
const SIN30 = 0.5;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Project cube-local (x, y, z) in edge units to screen space. */
function project(ox: number, oy: number, x: number, y: number, z: number): [number, number] {
  return [ox + (x - y) * COS30 * EDGE, oy + (x + y) * SIN30 * EDGE - z * EDGE];
}

/** All 12 edges of a unit cube, as pairs of corner coordinates. */
const CUBE_EDGES: [number[], number[]][] = [
  // bottom face
  [[0, 0, 0], [1, 0, 0]],
  [[1, 0, 0], [1, 1, 0]],
  [[1, 1, 0], [0, 1, 0]],
  [[0, 1, 0], [0, 0, 0]],
  // top face
  [[0, 0, 1], [1, 0, 1]],
  [[1, 0, 1], [1, 1, 1]],
  [[1, 1, 1], [0, 1, 1]],
  [[0, 1, 1], [0, 0, 1]],
  // verticals
  [[0, 0, 0], [0, 0, 1]],
  [[1, 0, 0], [1, 0, 1]],
  [[1, 1, 0], [1, 1, 1]],
  [[0, 1, 0], [0, 1, 1]],
];

function cubePath(ox: number, oy: number): string {
  return CUBE_EDGES.map(([a, b]) => {
    const [x1, y1] = project(ox, oy, a[0], a[1], a[2]);
    const [x2, y2] = project(ox, oy, b[0], b[1], b[2]);
    return `M${Math.round(x1 * 10) / 10},${Math.round(y1 * 10) / 10}L${Math.round(x2 * 10) / 10},${Math.round(y2 * 10) / 10}`;
  }).join('');
}

const CUBES: string[] = (() => {
  const rand = mulberry32(7);
  const paths: string[] = [];
  const pitchX = COS30 * EDGE * 2 + 18;
  const pitchY = EDGE * 2 + 14;
  for (let gy = 0; gy < H / pitchY; gy++) {
    for (let gx = 0; gx < W / pitchX; gx++) {
      if (rand() < 0.55) continue; // scatter: skip most lattice sites
      const ox = gx * pitchX + (gy % 2 === 0 ? 0 : pitchX / 2) + 10;
      const oy = gy * pitchY + EDGE * 1.5 + (rand() - 0.5) * 8;
      paths.push(cubePath(ox, oy));
    }
  }
  return paths;
})();

export function IsoCubes({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    >
      {CUBES.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="var(--muted-foreground)"
          strokeOpacity={0.22}
          strokeWidth={1}
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
