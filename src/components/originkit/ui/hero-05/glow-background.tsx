// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

export const GlowBackground = () => {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[1] overflow-hidden mask-b-from-20% mask-b-to-80% mask-alpha"
    >
      {/* The kit's Figma glow SVGs were near-black color-blend plates tuned
          for a dark stage; on the light theme they read as gray smudges, so
          the same two-column composition is rebuilt as soft teal radial
          tints that stay inside the brand ramp. */}
      <div
        className="absolute top-[12.76%] left-[-11%] h-[53.7%] w-[42.5%] max-w-none ipad:top-[12%] ipad:left-[-5.9%] ipad:h-[51.9%] ipad:w-[23.6%] desktop-sm:top-[15.69%] desktop-sm:left-[10.69%] desktop-sm:h-[96.4%] desktop-sm:w-[20.76%]"
        style={{
          background:
            'radial-gradient(55% 45% at 50% 30%, color-mix(in oklab, #45dfc6 26%, transparent), transparent 72%),' +
            'radial-gradient(45% 40% at 40% 70%, color-mix(in oklab, #9cf1df 30%, transparent), transparent 70%)',
        }}
      />
      <div
        className="absolute top-[12.76%] right-[-11%] h-[64.4%] w-[42.5%] max-w-none ipad:top-[12%] ipad:right-[-5.9%] ipad:h-[51.9%] ipad:w-[23.6%] desktop-sm:top-[15.69%] desktop-sm:right-[10.69%] desktop-sm:h-[96.4%] desktop-sm:w-[20.76%]"
        style={{
          background:
            'radial-gradient(55% 45% at 50% 30%, color-mix(in oklab, #45dfc6 26%, transparent), transparent 72%),' +
            'radial-gradient(45% 40% at 60% 70%, color-mix(in oklab, #9cf1df 30%, transparent), transparent 70%)',
        }}
      />
    </div>
  );
};
