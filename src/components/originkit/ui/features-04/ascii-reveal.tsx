import { useEffect, useRef, type CSSProperties } from 'react';

type ColorMode = 'mono' | 'image';
type Fit = 'cover' | 'contain';

interface RevealOptions {
  size: number;
  softness: number;
}

const DEFAULTS = {
  fit: 'cover' as Fit,
  focusY: 19,
  columns: 200,
  ramp: ' .:-=+*#%@',
  invert: false,
  contrast: 100,
  colorMode: 'mono' as ColorMode,
  inkColor: '#FFFFFF',
  reveal: true,
  revealOptions: { size: 80, softness: 16 } as RevealOptions,
};

const contrastAt = (value: number) => 0.5 + (value / 100) * 2;

const clampFocus = (value: number) =>
  Math.min(100, Math.max(0, typeof value === 'number' ? value : 50));

function placeRect(
  imgW: number,
  imgH: number,
  boxW: number,
  boxH: number,
  fit: Fit,
  focusY: number
) {
  const scale =
    fit === 'contain' ? Math.min(boxW / imgW, boxH / imgH) : Math.max(boxW / imgW, boxH / imgH);
  const dw = imgW * scale;
  const dh = imgH * scale;
  const f = fit === 'cover' ? clampFocus(focusY) / 100 : 0.5;
  return { dx: (boxW - dw) / 2, dy: (boxH - dh) * f, dw, dh };
}

interface AsciiImageProps {
  image?: { src: string; srcSet?: string; alt?: string } | string;
  fit?: Fit;
  focusY?: number;
  columns?: number;
  ramp?: string;
  invert?: boolean;
  contrast?: number;
  colorMode?: ColorMode;
  inkColor?: string;
  reveal?: boolean;
  revealOptions?: RevealOptions;
  style?: CSSProperties;
}

function resolveImageSrc(image: unknown): string | undefined {
  if (!image) return undefined;
  if (typeof image === 'string') return image.trim() || undefined;
  return (image as { src?: string }).src || undefined;
}

export default function AsciiImage(props: AsciiImageProps) {
  const {
    image,
    fit = DEFAULTS.fit,
    focusY = DEFAULTS.focusY,
    columns = DEFAULTS.columns,
    ramp = DEFAULTS.ramp,
    invert = DEFAULTS.invert,
    contrast = DEFAULTS.contrast,
    colorMode = DEFAULTS.colorMode,
    inkColor = DEFAULTS.inkColor,
    reveal = DEFAULTS.reveal,
    revealOptions = DEFAULTS.revealOptions,
    style,
  } = props;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offRef = useRef<HTMLCanvasElement | null>(null);
  const samplerRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const revealRef = useRef<HTMLCanvasElement | null>(null);
  const maskRef = useRef<HTMLCanvasElement | null>(null);
  const blobsRef = useRef<Array<{ x: number; y: number }>>([]);
  const seededRef = useRef(false);
  const pointer = useRef({ x: -9999, y: -9999, inside: false });

  // No image → nothing to draw. Every caller passes one.
  const src = resolveImageSrc(image);
  const revealSize = revealOptions?.size ?? DEFAULTS.revealOptions.size;
  const revealSoftness = revealOptions?.softness ?? DEFAULTS.revealOptions.softness;

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const context = canvasEl.getContext('2d');
    if (!context) return;
    const canvas: HTMLCanvasElement = canvasEl;
    const ctx: CanvasRenderingContext2D = context;

    const chars = ramp && ramp.length > 0 ? ramp : DEFAULTS.ramp;
    const punch = contrastAt(contrast);

    let raf = 0;
    let alive = true;
    let coverRect = { dx: 0, dy: 0, dw: 0, dh: 0 };

    const BLOB_COUNT = 5;
    blobsRef.current = Array.from({ length: BLOB_COUNT }, () => ({
      x: 0,
      y: 0,
    }));
    seededRef.current = false;

    function getSize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth || 600;
      const h = canvas.clientHeight || 600;
      return { w, h, dpr };
    }

    function buildAscii() {
      const img = imgRef.current;
      if (!img) return;
      const { w, h, dpr } = getSize();
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));

      const cols = Math.max(8, Math.round(columns));
      const cellW = (w * dpr) / cols;
      const fontPx = cellW * 1.7;
      const cellH = fontPx;
      const rows = Math.max(1, Math.floor((h * dpr) / cellH));

      let sampler = samplerRef.current;
      if (!sampler) {
        sampler = document.createElement('canvas');
        samplerRef.current = sampler;
      }
      sampler.width = cols;
      sampler.height = rows;
      const sctx = sampler.getContext('2d', { willReadFrequently: true });
      if (!sctx) return;

      const place = placeRect(img.width, img.height, canvas.width, canvas.height, fit, focusY);
      sctx.clearRect(0, 0, cols, rows);
      sctx.drawImage(img, place.dx / cellW, place.dy / cellH, place.dw / cellW, place.dh / cellH);

      let data: Uint8ClampedArray;
      try {
        data = sctx.getImageData(0, 0, cols, rows).data;
      } catch {
        imgRef.current = null;
        return;
      }

      let off = offRef.current;
      if (!off) {
        off = document.createElement('canvas');
        offRef.current = off;
      }
      off.width = canvas.width;
      off.height = canvas.height;
      const octx = off.getContext('2d');
      if (!octx) return;
      octx.clearRect(0, 0, off.width, off.height);
      octx.font = fontPx.toFixed(2) + 'px ui-monospace, monospace';
      octx.textBaseline = 'top';

      const last = chars.length - 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = (r * cols + c) * 4;
          const rr = data[i];
          const gg = data[i + 1];
          const bb = data[i + 2];
          let lum = (0.299 * rr + 0.587 * gg + 0.114 * bb) / 255;
          lum = (lum - 0.5) * punch + 0.5;
          if (invert) lum = 1 - lum;
          lum = lum < 0 ? 0 : lum > 1 ? 1 : lum;
          const ch = chars[Math.round(lum * last)];
          if (ch === ' ') continue;
          octx.fillStyle =
            colorMode === 'image'
              ? `rgb(${Math.min(255, rr + 30)}, ${Math.min(
                  255,
                  gg + 30
                )}, ${Math.min(255, bb + 30)})`
              : inkColor;
          octx.fillText(ch, c * cellW, r * cellH);
        }
      }

      coverRect = place;
    }

    function ensureLayer(ref: { current: HTMLCanvasElement | null }) {
      let layer = ref.current;
      if (!layer) {
        layer = document.createElement('canvas');
        ref.current = layer;
      }
      if (layer.width !== canvas.width || layer.height !== canvas.height) {
        layer.width = canvas.width;
        layer.height = canvas.height;
      }
      return layer;
    }

    // Returns true when a blob is still easing towards the pointer, so
    // the caller knows another frame is worth painting.
    function updateBlobs(): boolean {
      const blobs = blobsRef.current;
      if (blobs.length === 0) return false;
      const { dpr } = getSize();
      const tx = pointer.current.x * dpr;
      const ty = pointer.current.y * dpr;
      if (!seededRef.current) {
        for (const blob of blobs) {
          blob.x = tx;
          blob.y = ty;
        }
        seededRef.current = true;
        return true;
      }
      let moved = 0;
      const step = (blob: { x: number; y: number }, gx: number, gy: number) => {
        const dx = (gx - blob.x) * 0.35;
        const dy = (gy - blob.y) * 0.35;
        blob.x += dx;
        blob.y += dy;
        moved = Math.max(moved, Math.abs(dx), Math.abs(dy));
      };
      step(blobs[0], tx, ty);
      for (let i = 1; i < blobs.length; i++) {
        step(blobs[i], blobs[i - 1].x, blobs[i - 1].y);
      }
      return moved > 0.05;
    }

    function paint() {
      const off = offRef.current;
      if (!off) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(off, 0, 0);

      const img = imgRef.current;
      if (!reveal || reduced.matches || !pointer.current.inside || !img) return;

      const { dpr } = getSize();
      const blobs = blobsRef.current;
      const photo = ensureLayer(revealRef);
      const pctx = photo.getContext('2d');
      const mask = ensureLayer(maskRef);
      const mctx = mask.getContext('2d');
      if (!pctx || !mctx) return;

      pctx.globalCompositeOperation = 'source-over';
      pctx.clearRect(0, 0, photo.width, photo.height);
      pctx.drawImage(img, coverRect.dx, coverRect.dy, coverRect.dw, coverRect.dh);

      mctx.clearRect(0, 0, mask.width, mask.height);
      mctx.save();
      mctx.filter = `blur(${(revealSoftness * dpr).toFixed(1)}px)`;
      mctx.fillStyle = '#FFFFFF';
      for (let i = 0; i < blobs.length; i++) {
        const t = blobs.length <= 1 ? 0 : i / (blobs.length - 1);
        const radius = revealSize * dpr * (1 - t * 0.5);
        mctx.beginPath();
        mctx.arc(blobs[i].x, blobs[i].y, radius, 0, Math.PI * 2);
        mctx.fill();
      }
      mctx.restore();

      pctx.globalCompositeOperation = 'destination-in';
      pctx.drawImage(mask, 0, 0);
      pctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(photo, 0, 0);
    }

    // --- Frame scheduling -------------------------------------------
    // The loop only runs while the canvas is on screen, the tab is
    // visible, and the user has not asked for reduced motion; and it only
    // paints while something is actually changing (pointer moved, blobs
    // still easing, or a rebuild). Once the blobs settle it goes idle
    // until the next pointer event. Mirrors use-shader-canvas.ts.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let onscreen = true;
    let pageVisible = document.visibilityState !== 'hidden';
    let running = false;
    let dirty = true;

    const canAnimate = () =>
      reveal && !reduced.matches && onscreen && pageVisible && !!imgRef.current;

    function loop() {
      raf = 0;
      if (!alive || !running) return;
      const easing = pointer.current.inside && updateBlobs();
      if (dirty || easing) {
        paint();
        dirty = false;
      }
      if (easing || pointer.current.inside) {
        raf = requestAnimationFrame(loop);
      } else {
        running = false; // idle until the next pointer event
      }
    }

    function stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    function kick() {
      if (!canAnimate()) return;
      if (!running) {
        running = true;
        if (!raf) raf = requestAnimationFrame(loop);
      }
    }

    function sync() {
      if (!canAnimate()) {
        stop();
        if (imgRef.current) paint(); // one static frame
        return;
      }
      dirty = true;
      kick();
    }

    function onMove(event: PointerEvent) {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      pointer.current.x = x;
      pointer.current.y = y;
      pointer.current.inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
      dirty = true;
      kick();
    }
    function onLeave() {
      pointer.current.inside = false;
      seededRef.current = false;
      dirty = true;
      kick();
      // The loop may already be idle; paint the cleared frame directly.
      if (!running) paint();
    }

    let img: HTMLImageElement | null = null;
    if (src) {
      img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (!alive || !img) return;
        imgRef.current = img;
        buildAscii();
        paint();
        dirty = true;
        sync();
      };
      img.src = src;
    }

    // Rebuilds coalesce onto one animation frame.
    let ro: ResizeObserver | null = null;
    let resizeRaf = 0;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        if (resizeRaf) return;
        resizeRaf = requestAnimationFrame(() => {
          resizeRaf = 0;
          if (!alive) return;
          buildAscii();
          paint();
          dirty = true;
        });
      });
      ro.observe(canvas);
    }

    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(([entry]) => {
        onscreen = entry.isIntersecting;
        sync();
      });
      io.observe(canvas);
    }
    const onVisibility = () => {
      pageVisible = document.visibilityState !== 'hidden';
      sync();
    };
    document.addEventListener('visibilitychange', onVisibility);
    reduced.addEventListener('change', sync);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', onLeave);

    return () => {
      alive = false;
      stop();
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      if (img) img.onload = null;
      ro?.disconnect();
      io?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      reduced.removeEventListener('change', sync);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
    };
  }, [
    src,
    fit,
    focusY,
    columns,
    ramp,
    invert,
    contrast,
    colorMode,
    inkColor,
    reveal,
    revealSize,
    revealSoftness,
  ]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={typeof image === 'object' ? (image?.alt ?? 'ASCII art') : 'ASCII art'}
      style={{
        ...style,
        display: 'block',
        width: '100%',
        height: '100%',
        cursor: reveal ? 'crosshair' : 'default',
      }}
    />
  );
}
