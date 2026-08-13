import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { EASE, Reveal } from './reveal';
import { IsoCubes } from './shapes/iso-cubes';

const METERS = [
  { label: 'Compute', value: '$0.000012', unit: 'per GB-second' },
  { label: 'Invocations', value: '$0.20', unit: 'per million' },
  { label: 'Egress', value: '$0.01', unit: 'per GB' },
];

export function Pricing() {
  return (
    <section id="pricing" className="relative scroll-mt-24 overflow-hidden border-t border-border">
      {/* Iso Cubes: scattered wireframe units — one cube per unit of metered compute. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          WebkitMaskImage: 'linear-gradient(to bottom right, black, transparent 65%)',
          maskImage: 'linear-gradient(to bottom right, black, transparent 65%)',
        }}
      >
        <IsoCubes />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <Reveal>
          <p className="label-mono mb-5 text-brand">Pricing</p>
          <h2 className="max-w-3xl text-balance text-3xl leading-[1.15] sm:text-4xl">
            You only pay for what you use.{' '}
            <span className="text-muted-foreground">
              Pricing tied to real compute — the milliseconds, storage, and bandwidth your
              functions actually consume. Scale-to-zero means idle costs nothing.
            </span>
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-3 sm:grid-cols-3">
          {METERS.map((meter, i) => (
            <motion.div
              key={meter.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: EASE }}
              className="rounded-lg border border-border bg-card p-6"
            >
              <p className="label-mono text-muted-foreground">{meter.label}</p>
              <p className="mt-3 font-mono text-2xl font-medium tracking-tight">{meter.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{meter.unit}</p>
            </motion.div>
          ))}
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          1M invocations and 400,000 GB-seconds free every month.{' '}
          <a href="#" className="inline-flex items-center gap-1 text-brand hover:text-brand-hover">
            View detailed pricing
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </p>
      </div>
    </section>
  );
}
