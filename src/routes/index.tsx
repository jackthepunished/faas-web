import { createFileRoute } from '@tanstack/react-router';
import { MotionConfig } from 'framer-motion';
import { Nav } from '@/components/landing/nav';
import { Hero } from '@/components/landing/hero';
import { HowItWorks } from '@/components/landing/how-it-works';
import { ComponentsGrid } from '@/components/landing/components-grid';
import { ApiFirst } from '@/components/landing/api-first';
import { Pricing } from '@/components/landing/pricing';
import { Footer } from '@/components/landing/footer';

export const Route = createFileRoute('/')({
  component: LandingPage,
});

function LandingPage() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-background text-foreground">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Nav />
        <main id="main">
          <Hero />
          <HowItWorks />
          <ComponentsGrid />
          <ApiFirst />
          <Pricing />
        </main>
        <Footer />
      </div>
    </MotionConfig>
  );
}
