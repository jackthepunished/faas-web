import { motion } from 'framer-motion';
import { EASE, Reveal } from './reveal';
import { TextReveal } from './text-reveal';

/**
 * The life of a request, as a sequence.
 *
 * This is the one place on the page where numbering is information rather
 * than decoration: the four states really do happen in this order, and the
 * glyphs are the ones the console's per-app badge shows (`◌ sleeping`,
 * `⟳ waking`, `● running` — see content/docs/scale-to-zero.md). A reader who
 * later opens the dashboard meets the same vocabulary.
 */
const STEPS = [
  {
    glyph: '◌',
    state: 'sleeping',
    title: 'Parked at zero.',
    body: 'An idle app is a snapshot on disk — no resident RAM, nothing billed. Nothing runs until something asks.',
  },
  {
    glyph: '⟳',
    state: 'waking',
    title: 'A request arrives.',
    body: 'The snapshot restores into a fresh Firecracker microVM: its own kernel, hardware isolation, locked-down defaults. Under 350 ms p50, and the response says so with x-faas-wake: cold.',
    code: 'x-faas-wake: cold',
  },
  {
    glyph: '●',
    state: 'running',
    title: 'Your handler runs.',
    body: 'Warm requests hit the resident instance at normal latency. Your secrets arrived as plain env vars at wake — no SDK, no glue code.',
  },
  {
    glyph: '◌',
    state: 'sleeping',
    title: 'Idle again, parked again.',
    body: 'After the idle window the instance is snapshotted and released. Need it always warm? Pin --min N on Pro and Scale; you pay for exactly N resident.',
    code: '--min N',
  },
] as const;

export function HowItWorks() {
  return (
    <section id="how" className="relative scroll-mt-24 overflow-hidden border-t border-border">
      <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <Reveal y={12}>
          <p className="label-mono mb-5 text-brand">How a request is served</p>
        </Reveal>

        <TextReveal
          as="h2"
          className="max-w-3xl text-3xl leading-[1.15] sm:text-4xl"
          delay={0.12}
          segments={[
            { text: 'Nothing runs until something asks.' },
            {
              text: 'Every app is a snapshot until its first request, and a microVM from then until it is idle again.',
              className: 'text-muted-foreground',
            },
          ]}
        />

        <ol className="relative mt-14 grid gap-10 lg:grid-cols-4 lg:gap-6">
          {/* Connector. Horizontal on desktop, vertical on smaller screens;
              draws itself once the list is in view. */}
          <motion.span
            aria-hidden
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 1.4, ease: EASE, delay: 0.2 }}
            className="pointer-events-none absolute top-[19px] left-5 right-5 hidden h-px origin-left bg-gradient-to-r from-brand-fill via-border-secondary to-border-secondary lg:block"
          />
          <motion.span
            aria-hidden
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 1.4, ease: EASE, delay: 0.2 }}
            className="pointer-events-none absolute top-5 bottom-5 left-[19px] w-px origin-top bg-gradient-to-b from-brand-fill via-border-secondary to-border-secondary lg:hidden"
          />

          {STEPS.map((step, i) => (
            <motion.li
              key={`${step.state}-${i}`}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, delay: 0.25 + i * 0.14, ease: EASE }}
              className="relative flex gap-5 lg:flex-col lg:gap-6"
            >
              {/* State badge — the console's own glyph, on a paper disc so the
                  connector passes behind it. */}
              <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background font-mono text-base text-brand shadow-[0_0_0_6px_var(--background)]">
                <span aria-hidden>{step.glyph}</span>
                <span className="sr-only">{`Step ${i + 1}`}</span>
              </span>

              <div className="min-w-0">
                <p className="label-mono text-muted-foreground">
                  {String(i + 1).padStart(2, '0')} · {step.state}
                </p>
                <h3 className="mt-2 text-lg font-medium tracking-tight">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {'code' in step ? (
                    <>
                      {step.body.split(step.code)[0]}
                      <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em] text-foreground">
                        {step.code}
                      </code>
                      {step.body.split(step.code)[1]}
                    </>
                  ) : (
                    step.body
                  )}
                </p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
