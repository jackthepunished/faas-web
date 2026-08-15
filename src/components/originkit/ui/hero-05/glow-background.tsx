/** Public asset URLs — use a function so preview rewriters stay stable. */
function asset(file: string) {
  return `/originkit/hero-05/${file}`;
}

export const GlowBackground = () => {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[1] overflow-hidden mask-b-from-20% mask-b-to-80% mask-alpha"
    >
      {/*
        Figma Group 2147241418 / 2147241419 — two soft color-blend columns per side.
        Mobile 402: overhang left/right (~171×420–504).
        iPad 744: ~176×520, slight overhang.
        Desktop 1440: mirrored pair, ~299×885, inset ~10.7% from each edge.
      */}
      <img
        src={asset("glow-left.svg")}
        alt=""
        className="absolute top-[12.76%] left-[-11%] h-[53.7%] w-[42.5%] max-w-none mix-blend-multiply ipad:top-[12%] ipad:left-[-5.9%] ipad:h-[51.9%] ipad:w-[23.6%] desktop-sm:top-[15.69%] desktop-sm:left-[10.69%] desktop-sm:h-[96.4%] desktop-sm:w-[20.76%]"
        aria-hidden="true"
      />
      <img
        src={asset("glow-right.svg")}
        alt=""
        className="absolute top-[12.76%] right-[-11%] h-[64.4%] w-[42.5%] max-w-none -scale-x-100 mix-blend-multiply ipad:top-[12%] ipad:right-[-5.9%] ipad:h-[51.9%] ipad:w-[23.6%] desktop-sm:top-[15.69%] desktop-sm:right-[10.69%] desktop-sm:h-[96.4%] desktop-sm:w-[20.76%]"
        aria-hidden="true"
      />
    </div>
  );
};
