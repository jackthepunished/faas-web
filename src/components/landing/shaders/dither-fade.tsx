import { useRef } from 'react';
import { DitherGlow } from '../dither-glow';
import { GLSL_PRELUDE, useShaderCanvas } from './use-shader-canvas';

/**
 * A dithered glow that dissolves rather than blends.
 *
 * A soft field rises from the lower edge and is thresholded through an
 * ordered Bayer matrix at roughly 1-bit, so instead of a smooth gradient you
 * get solid dots in the core thinning to sparse ones as it fades — the
 * classic dither dissolve. Slow noise drifts the boundary so dots flip on and
 * off along the edge, which is where the effect earns being a shader at all.
 *
 * Falls back to the CSS DitherGlow when WebGL or compilation fails.
 */

const FRAG = `${GLSL_PRELUDE}

uniform float u_intensity;

const float CELL = 3.0;   // dot size, in render pixels

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 3; i++) {
    v += amp * vnoise(p);
    p = p * 2.03 + 11.7;
    amp *= 0.5;
  }
  return v;
}

void main() {
  vec2 frag = gl_FragCoord.xy;

  // Quantize to the dot grid first; everything downstream is per-dot.
  vec2 cellId = floor(frag / CELL);
  vec2 uv = (cellId * CELL + CELL * 0.5) / u_res;

  float t = u_time * 0.05;

  // Broad glow anchored low: densest behind the wordmark near the base,
  // dissolving upward past the links and thinning out by the top.
  vec2 c = uv - vec2(0.5, 0.06);
  c.x *= u_res.x / max(u_res.y, 1.0) * 0.34;   // flatten into a wide arc
  float radial = 1.0 - smoothstep(0.04, 0.70, length(c));

  // Slow noise so the dissolve boundary breathes instead of sitting still.
  float n = fbm(uv * 2.6 + vec2(t * 0.6, -t));
  float field = radial * (0.66 + 0.62 * n);

  // Cursor thickens the dots it passes over.
  float pd = distance(frag, u_pointer) / max(min(u_res.x, u_res.y), 1.0);
  field += exp(-pd * pd * 11.0) * 0.32;

  field = clamp(field, 0.0, 1.0);

  // Near 1-bit threshold: this is what makes it dissolve into dots rather
  // than ramp smoothly. Wrapping cellId keeps the squaring inside mediump.
  float threshold = bayer8(mod(cellId, 8.0));
  float on = step(threshold, field);

  // Dots in the dense core read brighter than stragglers at the fringe.
  vec3 dim = vec3(0.000, 0.355, 0.309);
  vec3 hot = vec3(0.716, 0.908, 0.865);
  vec3 col = mix(dim, hot, smoothstep(0.15, 0.95, field));

  float alpha = on * (0.42 + 0.58 * field) * 0.72 * u_intensity;
  gl_FragColor = vec4(col * alpha, alpha);   // premultiplied
}
`;

export function DitherFade({
  className = '',
  intensity = 1,
}: {
  className?: string;
  /** Scales output alpha. Dim this where copy sits directly on the layer. */
  intensity?: number;
}) {
  const targetRef = useRef(intensity);
  targetRef.current = intensity;
  // Eased separately from the target so callers can flip intensity on a state
  // change and have the field glide rather than jump.
  const currentRef = useRef(intensity);

  const { hostRef, canvasRef, supported } = useShaderCanvas({
    frag: FRAG,
    label: 'dither-fade',
    renderScale: 0.6,
    uniformNames: ['u_intensity'],
    onFrame: (gl, u) => {
      currentRef.current += (targetRef.current - currentRef.current) * 0.045;
      gl.uniform1f(u.u_intensity, currentRef.current);
    },
  });

  if (!supported) return <DitherGlow className={className || 'inset-0'} />;

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className={`pointer-events-none absolute ${className || 'inset-0'}`}
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
