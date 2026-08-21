import { useEffect, useRef } from 'react';
import { GLSL_PRELUDE, useShaderCanvas } from './use-shader-canvas';

/**
 * The pricing figure: four slatted bars stepping up the mint ramp, drawn in a
 * fragment shader so the surface can carry what CSS gradients cannot — film
 * grain, a travelling sheen, a lit rim on every slat, and a pointer light.
 *
 * Everything tweakable is a prop, eased per-frame rather than snapped, so the
 * knobs can be driven from state without the surface jumping. The entrance
 * (bars growing from the baseline, staggered left to right) also lives in the
 * shader: `u_grow` eases 0 -> 1 once the canvas first becomes visible.
 *
 * Falls back to plain CSS gradient bars when WebGL is unavailable — same
 * geometry, none of the light.
 */

const FRAG = `${GLSL_PRELUDE}

uniform float u_grow;    // 0 -> 1 entrance
uniform float u_noise;   // grain amount
uniform float u_sheen;   // travelling highlight strength
uniform float u_slats;   // slat count per unit height
uniform float u_light;   // pointer light strength

const float BARS = 4.0;
const float GAP  = 0.012;  // gap between bars, in bar-width units

// Ascending step heights, as fractions of the canvas.
float barHeight(float i) {
  if (i < 0.5) return 0.32;
  if (i < 1.5) return 0.54;
  if (i < 2.5) return 0.76;
  return 1.0;
}

float hash21(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

// The mint ramp, pale -> deep. Same steps the CSS tokens carry.
vec3 ramp(float x) {
  vec3 c0 = vec3(0.906, 0.973, 0.937);   // mint-3
  vec3 c1 = vec3(0.502, 0.914, 0.745);   // mint-6
  vec3 c2 = vec3(0.000, 0.808, 0.569);   // mint-8
  vec3 c3 = vec3(0.000, 0.435, 0.251);   // mint-11
  vec3 col = mix(c0, c1, smoothstep(0.00, 0.40, x));
  col = mix(col, c2, smoothstep(0.36, 0.74, x));
  col = mix(col, c3, smoothstep(0.70, 1.00, x));
  return col;
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = frag / u_res;

  float bar = floor(uv.x * BARS);
  float bx  = fract(uv.x * BARS);           // 0..1 across this bar

  // Staggered entrance: each bar starts a beat after its neighbour.
  float grow = clamp(u_grow * 1.6 - bar * 0.18, 0.0, 1.0);
  grow = 1.0 - pow(1.0 - grow, 3.0);        // ease-out cubic

  float h = barHeight(bar) * grow;

  // Outside the bar body: gap columns and everything above the top.
  float inGap = step(bx, GAP) + step(1.0 - GAP, bx);
  float inBar = (1.0 - inGap) * step(uv.y, h);

  // Depth along the ramp: later bars start deeper, and every bar darkens
  // toward its base, so the whole figure reads as one climbing gradient.
  float depth = bar / (BARS - 1.0);
  float vert  = 1.0 - uv.y / max(h, 0.001); // 0 at the top, 1 at the base
  float t = clamp(depth * 0.72 + vert * 0.30, 0.0, 1.0);
  vec3 col = ramp(t);

  // Louvre slats: a lit top edge and a shadowed seat on a repeating band.
  float band = fract(uv.y * u_slats);
  float lit  = smoothstep(0.55, 0.95, band);          // upper face catches light
  float seam = smoothstep(0.10, 0.0, band) * 0.5;     // thin dark seat line
  col *= 1.0 - 0.16 * seam;
  col += lit * 0.14;

  // Travelling sheen: a soft diagonal band drifting across the figure.
  float sweep = fract(u_time * 0.06);
  float sd = uv.x * 0.8 + uv.y * 0.35 - sweep * 2.3 + 0.55;
  float sheen = exp(-sd * sd * 42.0) * u_sheen;
  col += sheen * vec3(0.9, 1.0, 0.96);

  // Rim light on each bar's top edge — one crisp bright line.
  float rim = smoothstep(0.012, 0.0, abs(uv.y - h)) * (1.0 - inGap) * grow;
  col += rim * 0.35;

  // Pointer light: a soft lamp that lifts the slats it hovers over.
  float pd = distance(frag, u_pointer) / max(min(u_res.x, u_res.y), 1.0);
  col += exp(-pd * pd * 7.0) * u_light * (0.10 + lit * 0.22);

  // Film grain, animated. Both signs, so it textures without brightening.
  float g = hash21(frag + fract(u_time) * 61.7) - 0.5;
  col += g * u_noise;

  // A breath of glow just above each top edge, so the steps feel lit.
  float halo = smoothstep(0.10, 0.0, uv.y - h) * step(h, uv.y) * (1.0 - inGap);
  vec3 haloCol = ramp(clamp(depth * 0.72, 0.0, 1.0));
  float alpha = inBar + halo * 0.18 * grow;

  gl_FragColor = vec4(mix(haloCol, col, inBar) * alpha, alpha); // premultiplied
}
`;

export interface SteppedBarsConfig {
  /** Grain amount. 0 disables; 0.05 is a fine film grain. */
  noise?: number;
  /** Travelling highlight strength. 0 disables the sweep. */
  sheen?: number;
  /** Louvre slats per unit height — the figure's horizontal banding. */
  slats?: number;
  /** Pointer-lamp strength. */
  light?: number;
}

const DEFAULTS: Required<SteppedBarsConfig> = {
  noise: 0.045,
  sheen: 0.28,
  slats: 26,
  light: 0.9,
};

/** Same geometry in CSS for machines without WebGL. */
function BarsFallback() {
  const bars = [
    { h: '32%', from: 'var(--mint-4)', to: 'var(--mint-6)' },
    { h: '54%', from: 'var(--mint-5)', to: 'var(--mint-7)' },
    { h: '76%', from: 'var(--mint-7)', to: 'var(--mint-9)' },
    { h: '100%', from: 'var(--mint-8)', to: 'var(--mint-11)' },
  ];
  return (
    <div className="flex h-full w-full items-end gap-px">
      {bars.map((bar, i) => (
        <div
          key={i}
          className="w-1/4"
          style={{
            height: bar.h,
            backgroundImage: [
              'repeating-linear-gradient(to top, transparent 0 10px, rgba(255, 255, 255, 0.35) 10px 14px)',
              `linear-gradient(to bottom, ${bar.from}, ${bar.to})`,
            ].join(', '),
          }}
        />
      ))}
    </div>
  );
}

export function SteppedBars({
  className = '',
  ...config
}: { className?: string } & SteppedBarsConfig) {
  const { noise, sheen, slats, light } = { ...DEFAULTS, ...config };

  const targetRef = useRef({ noise, sheen, slats, light });
  useEffect(() => {
    targetRef.current = { noise, sheen, slats, light };
  }, [noise, sheen, slats, light]);

  // Entrance: grow eases toward 1 once the figure has been seen. Under
  // reduced motion the hook draws a single frame, so grow starts finished.
  const growRef = useRef(0);
  const seenRef = useRef(false);

  const currentRef = useRef({ ...DEFAULTS });

  const { hostRef, canvasRef, supported } = useShaderCanvas({
    frag: FRAG,
    label: 'stepped-bars',
    renderScale: 1,
    uniformNames: ['u_grow', 'u_noise', 'u_sheen', 'u_slats', 'u_light'],
    onFrame: (gl, u) => {
      if (seenRef.current) growRef.current += (1 - growRef.current) * 0.055;
      const c = currentRef.current;
      const t = targetRef.current;
      c.noise += (t.noise - c.noise) * 0.08;
      c.sheen += (t.sheen - c.sheen) * 0.08;
      c.slats += (t.slats - c.slats) * 0.08;
      c.light += (t.light - c.light) * 0.08;
      gl.uniform1f(u.u_grow, growRef.current);
      gl.uniform1f(u.u_noise, c.noise);
      gl.uniform1f(u.u_sheen, c.sheen);
      gl.uniform1f(u.u_slats, c.slats);
      gl.uniform1f(u.u_light, c.light);
    },
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      growRef.current = 1;
      seenRef.current = true;
      return;
    }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        seenRef.current = true;
        io.disconnect();
      }
    });
    io.observe(host);
    return () => io.disconnect();
  }, [hostRef]);

  if (!supported) {
    return (
      <div aria-hidden className={className}>
        <BarsFallback />
      </div>
    );
  }

  return (
    <div ref={hostRef} aria-hidden className={className}>
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
