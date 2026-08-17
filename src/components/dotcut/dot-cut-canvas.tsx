import { useEffect, useRef } from 'react';
import { DotCut } from './engine';
import type { Scene } from './scenes';

interface DotCutCanvasProps {
  className?: string;
  /**
   * Scene cycle to render. Omit for the stock set in `scenes.ts`.
   *
   * Pass a literal defined at module scope, not an inline array — this is a
   * dependency of the effect that constructs the engine, so a new array every
   * render would tear the canvas down and rebuild it every render.
   */
  scenes?: Scene[];
}

export function DotCutCanvas({ className, scenes }: DotCutCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const dotcut = new DotCut(host, { fontFamily: "'Inter', sans-serif", scenes });
    if (!dotcut.ok) {
      return () => dotcut.destroy();
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let onscreen = true;
    let pageVisible = document.visibilityState === 'visible';

    const sync = () => {
      if (reduced.matches) {
        dotcut.stop();
        dotcut.renderStill();
      } else if (onscreen && pageVisible) {
        dotcut.start();
      } else {
        dotcut.stop();
      }
    };

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
      dotcut.setPointer(dotcut.toCell(e.clientX - rect.left, e.clientY - rect.top));
    };
    const onPointerLeave = () => dotcut.setPointer(null);
    host.addEventListener('pointermove', onPointerMove);
    host.addEventListener('pointerleave', onPointerLeave);

    sync();

    // Unmounting on a route transition tears the whole loop down.
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      reduced.removeEventListener('change', sync);
      host.removeEventListener('pointermove', onPointerMove);
      host.removeEventListener('pointerleave', onPointerLeave);
      dotcut.destroy();
    };
  }, [scenes]);

  return <div ref={hostRef} className={className} aria-hidden="true" />;
}
