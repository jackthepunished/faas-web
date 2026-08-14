interface DitherGlowProps {
  className?: string;
}

/**
 * A soft mint glow rendered as a dithered dot field: a blurred color wash
 * underneath, and two dot lattices at different pitches whose radial masks fade
 * at different radii, so dot density falls off from the core the way ordered
 * dithering does. Purely decorative — sits behind solid-surface cards, so
 * foreground text never lands on it.
 *
 * Every colour is derived from `--brand`, which is the whole reason this one
 * component can serve both polarities: inside the dark dashboard mock `--brand`
 * is mint-7 and the dots glow out of the plate, while on the light page it is
 * mint-11 and the same dots settle onto the paper. It is also the fallback for
 * both WebGL shaders, so it has to be right on either ground.
 */
export function DitherGlow({ className = '-inset-8' }: DitherGlowProps) {
  const dot = (pct: number) => `color-mix(in oklab, var(--brand) ${pct}%, transparent)`;

  return (
    <div aria-hidden className={`pointer-events-none absolute ${className}`}>
      {/* Soft color wash */}
      <div
        className="animate-glow-breathe absolute inset-0 blur-3xl"
        style={{
          background:
            `radial-gradient(45% 60% at 32% 45%, ${dot(14)}, transparent 70%),` +
            `radial-gradient(40% 55% at 70% 55%, ${dot(9)}, transparent 70%)`,
        }}
      />
      {/* Dense core dots — tight mask, small pitch */}
      <div
        className="animate-dither-drift-a absolute inset-0 opacity-45"
        style={{
          backgroundImage: `radial-gradient(${dot(65)} 1px, transparent 1.2px)`,
          backgroundSize: '5px 5px',
          WebkitMaskImage: 'radial-gradient(45% 55% at 50% 50%, black, transparent 70%)',
          maskImage: 'radial-gradient(45% 55% at 50% 50%, black, transparent 70%)',
        }}
      />
      {/* Sparse halo dots — wider mask, larger offset pitch */}
      <div
        className="animate-dither-drift-b absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(${dot(55)} 1px, transparent 1.2px)`,
          backgroundSize: '9px 9px',
          backgroundPosition: '4px 4px',
          WebkitMaskImage: 'radial-gradient(70% 85% at 50% 50%, black 20%, transparent 78%)',
          maskImage: 'radial-gradient(70% 85% at 50% 50%, black 20%, transparent 78%)',
        }}
      />
    </div>
  );
}
