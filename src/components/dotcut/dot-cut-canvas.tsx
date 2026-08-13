import { useEffect, useRef } from 'react';
import { DotCut } from './engine';

interface DotCutCanvasProps {
  className?: string;
}

export function DotCutCanvas({ className }: DotCutCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const dotcut = new DotCut(host, "'Inter', sans-serif");
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
  }, []);

  return <div ref={hostRef} className={className} aria-hidden="true" />;
}
