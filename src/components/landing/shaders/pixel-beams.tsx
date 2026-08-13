import { useEffect, useRef, useState } from 'react';
import { DitherGlow } from '../dither-glow';

/**
 * WebGL "pixel beams" background.
 *
 * Vertical shafts of light drifting across a chunky pixel grid. Each beam
 * carries its own vertical gradient (bright at the base, dissolving upward)
 * and the whole field is run through a colour ramp and quantized with an
 * ordered Bayer dither, so the result reads as stepped pixel columns rather
 * than a smooth glow.
 *
 * Falls back to the CSS DitherGlow when WebGL or shader compilation fails.
 */

const VERT = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAG = `
// Hashes fold values into the hundreds before fract(); mediump (10-bit
// mantissa, ±16384 guaranteed) shows visible artifacts there on mobile GPUs.
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2  u_res;
uniform float u_time;
uniform vec2  u_pointer;      // pixels; far offscreen when absent

const float BEAMS = 9.0;
const float CELLS = 58.0;     // horizontal pixel cells
const float LEVELS = 6.0;     // colour quantization steps

float hash11(float n) {
  return fract(sin(n * 12.9898) * 43758.5453);
}

// Ordered Bayer thresholds from the 2x2 base pattern. Each level is
// periodic, so the caller wraps to the 8x8 tile before squaring — a raw
// fragment coordinate would overflow mediump here.
float bayer2(vec2 a) { a = floor(a); return fract(a.x * 0.5 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(a * 0.5) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(a * 0.5) * 0.25 + bayer2(a); }

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

  // Alpha ceiling protects card text contrast.
  float alpha = stepped * 0.88;
  gl_FragColor = vec4(col * alpha, alpha);   // premultiplied
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('[pixel-beams] shader compile failed:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/** Internal render scale — below 1 for cost and for chunkier pixel cells. */
const RENDER_SCALE = 0.55;

export function PixelBeams({ className = '' }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const gl = (canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
    }) ||
      canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;

    if (!gl) {
      setSupported(false);
      return;
    }

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) {
      setSupported(false);
      return;
    }

    const program = gl.createProgram();
    if (!program) {
      setSupported(false);
      return;
    }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('[pixel-beams] link failed:', gl.getProgramInfoLog(program));
      setSupported(false);
      return;
    }
    gl.useProgram(program);

    // One oversized triangle covers the clip volume — cheaper than a quad
    // and free of the diagonal seam two triangles can show.
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, 'u_res');
    const uTime = gl.getUniformLocation(program, 'u_time');
    const uPointer = gl.getUniformLocation(program, 'u_pointer');

    const pointer = { x: -9999, y: -9999 };
    let raf = 0;
    let running = false;
    let start = performance.now();
    let onscreen = true;
    let pageVisible = document.visibilityState === 'visible';
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    const resize = () => {
      const w = Math.max(1, Math.round(host.clientWidth * RENDER_SCALE));
      const h = Math.max(1, Math.round(host.clientHeight * RENDER_SCALE));
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    };

    const draw = (elapsedMs: number) => {
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, elapsedMs / 1000);
      gl.uniform2f(uPointer, pointer.x * RENDER_SCALE, pointer.y * RENDER_SCALE);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const tick = (now: number) => {
      if (!running) return;
      draw(now - start);
      raf = requestAnimationFrame(tick);
    };

    const stop = () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const sync = () => {
      if (reduced.matches) {
        stop();
        resize();
        draw(0); // one static frame
        return;
      }
      if (onscreen && pageVisible) {
        if (!running) {
          running = true;
          start = performance.now() - 1;
          raf = requestAnimationFrame(tick);
        }
      } else {
        stop();
      }
    };

    resize();
    const ro = new ResizeObserver(() => {
      resize();
      if (!running) draw(0);
    });
    ro.observe(host);

    const io = new IntersectionObserver(([entry]) => {
      onscreen = entry.isIntersecting;
      sync();
    });
    io.observe(host);

    const onVisibility = () => {
      pageVisible = document.visibilityState === 'visible';
      sync();
    };
    document.addEventListener('visibilitychange', onVisibility);
    reduced.addEventListener('change', sync);

    const onPointerMove = (e: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      // GL's origin is bottom-left; the DOM's is top-left.
      pointer.x = e.clientX - rect.left;
      pointer.y = rect.height - (e.clientY - rect.top);
    };
    const onPointerLeave = () => {
      pointer.x = -9999;
      pointer.y = -9999;
    };
    host.addEventListener('pointermove', onPointerMove);
    host.addEventListener('pointerleave', onPointerLeave);

    // A lost context cannot be drawn to; stop instead of spewing GL errors.
    const onLost = (e: Event) => {
      e.preventDefault();
      stop();
    };
    canvas.addEventListener('webglcontextlost', onLost);

    sync();

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      reduced.removeEventListener('change', sync);
      host.removeEventListener('pointermove', onPointerMove);
      host.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('webglcontextlost', onLost);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, []);

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
