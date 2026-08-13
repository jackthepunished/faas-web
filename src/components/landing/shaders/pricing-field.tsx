import { useEffect, useRef, useState } from 'react';
import { DitherGlow } from '../dither-glow';

/**
 * WebGL background for the pricing card grid.
 *
 * A domain-warped fBm field in the brand hue, quantized through an ordered
 * Bayer dither so it lands in the same visual family as the CSS DitherGlow
 * used elsewhere on the site — the shader just gives it motion and depth the
 * CSS version cannot do.
 *
 * Renders at a fraction of device resolution: the output is deliberately
 * low-frequency, the dither reads better with chunkier cells, and it keeps a
 * five-octave-per-sample shader cheap. Falls back to the CSS effect when WebGL
 * is unavailable.
 */

const VERT = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAG = `
// The hash folds values into the high hundreds before fract(), which mediump
// (10-bit mantissa, ±16384 guaranteed range) cannot hold without visible
// artifacts on mobile GPUs. Ask for highp where the hardware advertises it.
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2  u_res;
uniform float u_time;
uniform vec2  u_pointer;   // pixels; far offscreen when absent

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);          // smoothstep interpolant
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    v += amp * vnoise(p);
    p = p * 2.02 + 17.3;                      // rotate-ish to hide tiling
    amp *= 0.5;
  }
  return v;
}

// Ordered Bayer thresholds, built by recursion from the 2x2 base pattern.
// Each level is periodic, so callers wrap the coordinate to the 8x8 tile
// first — squaring a raw fragment coordinate here would overflow mediump.
float bayer2(vec2 a) { a = floor(a); return fract(a.x * 0.5 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(a * 0.5) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(a * 0.5) * 0.25 + bayer2(a); }

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = frag / u_res;
  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 p = vec2(uv.x * aspect, uv.y);

  float t = u_time * 0.045;                   // slow — this is ambience

  // Two rounds of domain warping give the field its drifting, folded look.
  vec2 q = vec2(
    fbm(p * 2.2 + vec2(0.0, t)),
    fbm(p * 2.2 + vec2(5.2, -t))
  );
  vec2 r = vec2(
    fbm(p * 2.6 + 3.4 * q + vec2(1.7, 9.2) + t * 0.6),
    fbm(p * 2.6 + 3.4 * q + vec2(8.3, 2.8) - t * 0.5)
  );
  float f = fbm(p * 2.4 + 3.0 * r);

  // Pointer bloom, normalised by the short edge so it stays round.
  float pd = distance(frag, u_pointer) / max(min(u_res.x, u_res.y), 1.0);
  float bloom = exp(-pd * pd * 14.0);

  float energy = smoothstep(0.25, 0.95, f) + bloom * 0.35;

  // Fade to nothing at the edges so the layer never collides with the border.
  float edge =
      smoothstep(0.0, 0.26, uv.x) * smoothstep(1.0, 0.74, uv.x)
    * smoothstep(0.0, 0.28, uv.y) * smoothstep(1.0, 0.72, uv.y);
  energy *= edge;

  // Quantize through the dither matrix — this is what makes it read as
  // stepped dots rather than a smooth gradient.
  float threshold = bayer8(mod(frag, 8.0));   // exact: the matrix has period 8
  float levels = 5.0;
  float stepped = clamp(floor(energy * levels + threshold) / levels, 0.0, 1.0);

  vec3 deep  = vec3(0.043, 0.055, 0.086);
  vec3 brand = vec3(0.659, 0.776, 0.996);     // #a8c6fe
  vec3 col = mix(deep, brand, stepped);

  // Ceiling on alpha keeps card text contrast intact.
  float alpha = stepped * 0.46;
  gl_FragColor = vec4(col * alpha, alpha);    // premultiplied
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('[pricing-field] shader compile failed:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/** Internal render scale — below 1 for cost and for chunkier dither cells. */
const RENDER_SCALE = 0.55;

export function PricingField({ className = '' }: { className?: string }) {
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
      console.warn('[pricing-field] link failed:', gl.getProgramInfoLog(program));
      setSupported(false);
      return;
    }
    gl.useProgram(program);

    // One oversized triangle covers the clip volume — cheaper than a quad
    // and avoids the diagonal seam two triangles can produce.
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
      // GL origin is bottom-left; the DOM's is top-left.
      pointer.x = e.clientX - rect.left;
      pointer.y = rect.height - (e.clientY - rect.top);
    };
    const onPointerLeave = () => {
      pointer.x = -9999;
      pointer.y = -9999;
    };
    host.addEventListener('pointermove', onPointerMove);
    host.addEventListener('pointerleave', onPointerLeave);

    // A lost context cannot be drawn to; stop rather than spew GL errors.
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
