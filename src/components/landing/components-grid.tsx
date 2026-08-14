import { motion } from 'framer-motion';
import {
  Container,
  Database,
  FolderArchive,
  Globe,
  HardDrive,
  KeyRound,
  Radio,
  Zap,
} from 'lucide-react';
import { EASE, Reveal } from './reveal';
import { TextReveal } from './text-reveal';
import { FlowLines } from './shapes/flow-lines';

/**
 * The four-colour category taxonomy is console wayfinding — it earns its keep
 * across 21 sidebar routes. Eight tiles in a row on a white page is not
 * wayfinding, it is confetti, so the grid runs on the single brand accent and
 * lets the icon and label carry the category.
 */
const COMPONENTS = [
  { icon: Zap, name: 'Functions', desc: 'Snapshot-backed, sub-350ms cold starts' },
  { icon: Container, name: 'Containers', desc: 'Long-running services on microVMs' },
  { icon: Database, name: 'Databases', desc: 'Postgres and Redis, wired in automatically' },
  { icon: FolderArchive, name: 'Buckets', desc: 'S3-compatible object storage' },
  { icon: HardDrive, name: 'Volumes', desc: 'Persistent disks that follow your VMs' },
  { icon: Globe, name: 'Domains', desc: 'TLS and routing, managed end to end' },
  { icon: Radio, name: 'CDN', desc: 'Edge caching in front of any component' },
  { icon: KeyRound, name: 'Secrets', desc: 'Scoped credentials, injected at boot' },
];

export function ComponentsGrid() {
  return (
    <section id="deploy" className="relative scroll-mt-24 overflow-hidden border-t border-border">
      {/* Flow Lines: streamlines echo components finding routes to each other. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          WebkitMaskImage: 'radial-gradient(80% 70% at 50% 40%, black, transparent 75%)',
          maskImage: 'radial-gradient(80% 70% at 50% 40%, black, transparent 75%)',
        }}
      >
        <FlowLines />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <Reveal y={12}>
          <p className="label-mono mb-5 text-brand">Components</p>
        </Reveal>

        {/* text-balance is dropped here: it needs a single text node to
            measure, and the reveal splits the line into per-word spans.
            max-w does the line-length work instead. */}
        <TextReveal
          as="h2"
          className="max-w-3xl text-3xl leading-[1.15] sm:text-4xl"
          delay={0.12}
          segments={[
            { text: 'Every building block your product needs.' },
            {
              text: 'Components find and connect to each other automatically — no glue code, no hand-wired networking.',
              className: 'text-muted-foreground',
            },
          ]}
        />

        <div className="mt-12 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {COMPONENTS.map(({ icon: Icon, name, desc }, i) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, delay: i * 0.05, ease: EASE }}
              className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-brand/50"
            >
              <Icon className="h-5 w-5 text-brand" />
              <h3 className="mt-3 text-sm font-medium">{name}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
