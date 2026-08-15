import { GlowBackground } from '@/components/originkit/ui/hero-05/glow-background';
import { HeroContent } from '@/components/originkit/ui/hero-05/hero-content';
import { PulseStage } from '@/components/originkit/ui/hero-05/pulse-stage';
import { DashboardCard } from '@/components/landing/dashboard-preview';

export const Section14Hero = () => {
  return (
    <section
      aria-label="Gregale serverless platform hero"
      className="relative isolate min-h-screen w-full overflow-hidden bg-background"
    >
      <GlowBackground />

      <div className="relative z-10 mx-auto flex w-full flex-col items-center">
        {/* Site nav is the fixed floating capsule (landing/nav.tsx); the kit's
            in-flow navbar is unused, so the top padding clears the fixed nav. */}
        <div className="flex w-full flex-col items-center gap-8 px-4 pt-28 desktop-sm:pt-[160px]">
          <HeroContent />

          <div className="mt-[31px] mb-[34px] w-full">
            <PulseStage>
              <DashboardCard />
            </PulseStage>
          </div>
        </div>
      </div>
    </section>
  );
};
