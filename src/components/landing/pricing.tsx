import { motion } from 'framer-motion';
import { EASE, Reveal } from './reveal';
import { TextReveal } from './text-reveal';
import { PixelBeams } from './shaders/pixel-beams';

const PLANS = [
  { name: 'Free', price: '€0', detail: '1 app · concurrency 1 · scale-to-zero only' },
  { name: 'Hobby', price: '€9/mo', detail: '5 apps · concurrency 2' },
  { name: 'Pro', price: '25 apps', detail: 'concurrency 5 · --min up to 5' },
  { name: 'Scale', price: '100 apps', detail: 'concurrency 20 · --min up to 20' },
];

export function Pricing() {
  return (
    <section id="pricing" className="relative scroll-mt-24 overflow-hidden border-t border-border">
      <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <Reveal y={12}>
          <p className="label-mono mb-5 text-brand">Pricing</p>
        </Reveal>

        <TextReveal
          as="h2"
          className="max-w-3xl text-3xl leading-[1.15] sm:text-4xl"
          delay={0.12}
          segments={[
            { text: 'You only pay for what you use.' },
            {
              text: 'Compute is metered in GB-hours — memory × time while an instance is actually resident. A parked app accrues none: scale-to-zero means idle costs nothing.',
              className: 'text-muted-foreground',
            },
          ]}
        />

        {/* The shader needs room the cards do not cover, so it extends well
            above and below the row. Cards stay translucent with a blur, which
            averages the beams down before they reach the text. */}
        <div className="relative mt-12">
          <PixelBeams className="-inset-x-10 -top-24 -bottom-28" />

          <div className="relative grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.6, delay: i * 0.08, ease: EASE }}
                className="rounded-lg border border-border bg-card/80 p-6 backdrop-blur-lg"
              >
                <p className="label-mono text-muted-foreground">{plan.name}</p>
                <p className="mt-3 font-mono text-2xl font-medium tracking-tight">{plan.price}</p>
                <p className="mt-1 text-xs text-muted-foreground">{plan.detail}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* The "View detailed pricing" link went nowhere — there is no pricing
            page beyond this section, so the sentence stands on its own. */}
        <p className="mt-6 text-sm text-muted-foreground">
          Warm pins (--min N) bill as N × RAM × uptime — the normal resident rate, no premium.
          Overage is per GB-hour, invoiced in EUR.
        </p>
      </div>
    </section>
  );
}
