import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DotCutCanvas } from '@/components/dotcut/dot-cut-canvas';
import { EASE } from './reveal';

const enter = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, delay, ease: EASE },
});

export function Hero() {
  return (
    <section className="mx-auto max-w-6xl overflow-hidden px-4 pt-32 text-center sm:px-6 sm:pt-40">
      <motion.h1
        {...enter(0)}
        className="mx-auto max-w-3xl text-balance text-4xl font-medium tracking-tight sm:text-5xl md:text-6xl"
      >
        The serverless cloud for humans and <span className="animate-color-cycle">agents</span>
      </motion.h1>

      <motion.p
        {...enter(0.12)}
        className="mx-auto mt-6 max-w-xl text-balance text-base text-muted-foreground sm:text-lg"
      >
        Deploy functions to real microVMs on bare metal. They scale to zero when idle and wake from
        a snapshot in under <span className="text-brand">350ms</span> — you never pay for a warm
        pool again.
      </motion.p>

      <motion.div {...enter(0.24)} className="mt-8 flex items-center justify-center gap-3">
        <Button size="lg" className="gap-2">
          Start deploying
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button size="lg" variant="outline">
          Read the docs
        </Button>
      </motion.div>

      <motion.p {...enter(0.32)} className="mt-4 text-xs text-muted-foreground">
        1M invocations free every month. No credit card required.
      </motion.p>

      {/* Flush with the hero's bottom edge and shifted down by half its height,
          so the lower half is clipped by the section's overflow-hidden. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, delay: 0.45, ease: EASE }}
        className="-mb-32 mt-16 h-64 overflow-hidden rounded-t-xl border border-b-0 border-border sm:-mb-40 sm:h-80 md:-mb-48 md:h-96"
      >
        <DotCutCanvas className="h-full w-full touch-none" />
      </motion.div>
    </section>
  );
}
