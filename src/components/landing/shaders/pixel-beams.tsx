import { useRef } from 'react';
import { DitherGlow } from '../dither-glow';
import { GLSL_PRELUDE, useShaderCanvas } from './use-shader-canvas';

/**
 * Vertical shafts of light drifting across a chunky pixel grid.
 *
 * Each beam carries its own vertical gradient (bright at the base, dissolved
 * by the top), and the field runs through a four-stop colour ramp quantized
 * by the ordered Bayer dither, so the gradient steps rather than blends.
 *
 * Falls back to the CSS DitherGlow when WebGL or compilation fails.
 */

const FRAG = `${GLSL_PRELUDE}

uniform float u_intensity;

const float CELLS = 58.0;   // horizontal pixel cells
const float LEVELS = 6.0;   // colour quantization steps

float hash11(float n) {
  return fract(sin(n * 12.9898) * 43758.5453);
}

// Deep -> mid blue -> brand sky -> hot core. Piecewise so the ramp has a
// definite shoulder instead of washing out to a single tint.
vec3 ramp(float x) {
  vec3 c0 = vec3(0.035, 0.047, 0.094);
  vec3 c1 = vec3(0.145, 0.290, 0.640);
  vec3 c2 = vec3(0.408, 0.588, 0.949);
  vec3 c3 = vec3(0.780, 0.867, 1.000);
  vec3 col = mix(c0, c1, smoothstep(0.00, 0.38, x));
  col = mix(col, c2, smoothstep(0.34, 0.72, x));
  col = mix(col, c3, smoothstep(0.70, 1.00, x));
  return col;
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = frag / u_res;

  // Snap to a chunky grid so everything below resolves as pixel blocks.
  vec2 grid = vec2(CELLS, max(floor(CELLS * u_res.y / max(u_res.x, 1.0)), 6.0));
  vec2 cell = (floor(uv * grid) + 0.5) / grid;

  float t = u_time * 0.16;

  float energy = 0.0;
  for (int i = 0; i < 9; i++) {
    float fi = float(i);
    float seed = hash11(fi * 3.17 + 1.0);
    float wSeed = hash11(fi * 7.31 + 5.0);
    float pSeed = hash11(fi * 11.7 + 9.0);

    // Alternate travel direction so the field never reads as one slide.
    float dir = mix(-1.0, 1.0, step(0.5, pSeed));
    float x = fract(seed + t * (0.05 + seed * 0.11) * dir);

    // Wrapped horizontal distance to this beam's centre.
    float dx = abs(cell.x - x);
    dx = min(dx, 1.0 - dx);

    // Wide enough to span several cells — narrower than a cell just aliases
    // down to a single flickering column.
    float width = 0.030 + wSeed * 0.070;
    float core = smoothstep(width, 0.0, dx);
    float halo = smoothstep(width * 3.0, 0.0, dx) * 0.45;

    // Each beam is a gradient: bright at the base, gone by the top.
    float rise = smoothstep(1.15, 0.0, cell.y);
    // Slow breathing, out of phase per beam.
    float pulse = 0.66 + 0.34 * sin(u_time * (0.5 + wSeed * 0.7) + fi * 2.1);

    // Brightest beam wins. Summing and then dividing by the beam count
    // crushes the signal, since only one or two overlap any given pixel.
    energy = max(energy, (core + halo) * rise * pulse);
  }
  energy = clamp(energy, 0.0, 1.0);

  // Cursor lifts the beams it passes over.
  float pd = distance(frag, u_pointer) / max(min(u_res.x, u_res.y), 1.0);
  energy += exp(-pd * pd * 10.0) * 0.35;

  // Horizontal scanlines on the cell grid keep the pixel read explicit.
  float scan = 0.90 + 0.10 * step(0.5, fract(cell.y * grid.y * 0.5));
  energy *= scan;

  // Dissolve at the edges so the layer never fights the section border.
  float edge =
      smoothstep(0.0, 0.16, uv.x) * smoothstep(1.0, 0.84, uv.x)
    * smoothstep(0.0, 0.10, uv.y) * smoothstep(1.0, 0.88, uv.y);
  energy = clamp(energy, 0.0, 1.0) * edge;

  // Quantize through the dither matrix — this is what makes the gradient
  // step rather than blend.
  float threshold = bayer8(mod(frag, 8.0));
  float stepped = clamp(floor(energy * LEVELS + threshold) / LEVELS, 0.0, 1.0);

  vec3 col = ramp(stepped);

  // Alpha ceiling protects text contrast; instances over copy dim further.
  float alpha = stepped * 0.88 * u_intensity;
  gl_FragColor = vec4(col * alpha, alpha);   // premultiplied
}
`;

export function PixelBeams({
  className = '',
  intensity = 1,
}: {
  className?: string;
  /** Scales output alpha. Dim this where copy sits directly on the layer. */
  intensity?: number;
}) {
  const intensityRef = useRef(intensity);
  intensityRef.current = intensity;

  const { hostRef, canvasRef, supported } = useShaderCanvas({
    frag: FRAG,
    label: 'pixel-beams',
    renderScale: 0.55,
    uniformNames: ['u_intensity'],
    onFrame: (gl, u) => gl.uniform1f(u.u_intensity, intensityRef.current),
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
