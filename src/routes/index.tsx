import { createFileRoute } from '@tanstack/react-router';
import { MotionConfig } from 'framer-motion';
import { Nav } from '@/components/landing/nav';
import OriginkitHero from '@/components/originkit/hero-05';
import OriginkitFeatures from '@/components/originkit/features-04';
import { ComponentsGrid } from '@/components/landing/components-grid';
import { CustomComponents } from '@/components/landing/custom-components';
import { Pricing } from '@/components/landing/pricing';
import { Footer } from '@/components/landing/footer';

export const Route = createFileRoute('/')({
  component: LandingPage,
});

function LandingPage() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-background text-foreground">
        <Nav />
        <main>
          <OriginkitHero />
          <OriginkitFeatures />
          <ComponentsGrid />
          <CustomComponents />
          <Pricing />
          <Footer />
        </main>
      </div>
    </MotionConfig>
  );
}
