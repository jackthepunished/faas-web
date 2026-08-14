// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import WaveBg from "@/components/originkit/ui/hero-05/pulse-line";

/** ease-out-cubic */
const EASE_OUT = [0.215, 0.61, 0.355, 1] as const;

/** Matches `--breakpoint-ipad` in globals.css */
const IPAD_MIN = 768;

/** Tighter + slower on mobile; iPad/desktop keep current values */
const GAP_MOBILE = 18;
const GAP_IPAD_UP = 34;
const SPEED_MOBILE = 28;
const SPEED_IPAD_UP = 14;

const usePulseConfig = () => {
  const [config, setConfig] = useState({
    gap: GAP_MOBILE,
    speed: SPEED_MOBILE,
  });

  useEffect(() => {
    const update = () => {
      const isMobile = window.innerWidth < IPAD_MIN;
      setConfig(
        isMobile
          ? { gap: GAP_MOBILE, speed: SPEED_MOBILE }
          : { gap: GAP_IPAD_UP, speed: SPEED_IPAD_UP },
      );
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return config;
};

export const PulseStage = ({ children }: { children?: ReactNode }) => {
  const reduceMotion = useReducedMotion();
  const { gap, speed } = usePulseConfig();

  const reveal = reduceMotion
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : {
        initial: { opacity: 0, y: 14, filter: "blur(4px)" },
        animate: { opacity: 1, y: 0, filter: "blur(0px)" },
        transition: {
          type: "tween" as const,
          duration: 0.45,
          ease: EASE_OUT,
          delay: 0.4,
        },
      };

  return (
    <motion.div
      {...reveal}
      className="relative mx-auto flex min-h-65 w-full items-center justify-center overflow-hidden rounded-lg border border-solid border-border bg-mint-1 ipad:min-h-93.5 ipad:max-w-162 desktop-sm:min-h-118.5 desktop-sm:max-w-7xl"
    >
      {/* Animation fills the stage as a backdrop layer. The canvas takes colour
          literals rather than tokens: paper ground, mint-5 rules, so the pulse
          reads as mint drawn onto the page instead of light emitted out of a
          dark stage. */}
      <div aria-hidden="true" className="absolute inset-0">
        <WaveBg
          shape="line"
          type="vertical"
          speed={speed}
          gap={gap}
          scale={2}
          backgroundColor="#fbfcfb"
          lineColor="#9ff1cd"
        />
      </div>

      {children ? (
        <div className="relative z-10 w-full p-4 ipad:p-8 desktop-sm:p-12">{children}</div>
      ) : null}
    </motion.div>
  );
};
