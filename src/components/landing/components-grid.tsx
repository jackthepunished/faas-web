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
import { FlowLines } from './shapes/flow-lines';

const COMPONENTS = [
  { icon: Zap, name: 'Functions', desc: 'Snapshot-backed, sub-350ms cold starts', color: 'text-cat-compute', border: 'hover:border-cat-compute/50' },
  { icon: Container, name: 'Containers', desc: 'Long-running services on microVMs', color: 'text-cat-compute', border: 'hover:border-cat-compute/50' },
  { icon: Database, name: 'Databases', desc: 'Postgres and Redis, wired in automatically', color: 'text-cat-storage', border: 'hover:border-cat-storage/50' },
  { icon: FolderArchive, name: 'Buckets', desc: 'S3-compatible object storage', color: 'text-cat-storage', border: 'hover:border-cat-storage/50' },
  { icon: HardDrive, name: 'Volumes', desc: 'Persistent disks that follow your VMs', color: 'text-cat-storage', border: 'hover:border-cat-storage/50' },
  { icon: Globe, name: 'Domains', desc: 'TLS and routing, managed end to end', color: 'text-cat-network', border: 'hover:border-cat-network/50' },
  { icon: Radio, name: 'CDN', desc: 'Edge caching in front of any component', color: 'text-cat-network', border: 'hover:border-cat-network/50' },
  { icon: KeyRound, name: 'Secrets', desc: 'Scoped credentials, injected at boot', color: 'text-cat-security', border: 'hover:border-cat-security/50' },
];

export function ComponentsGrid() {
  return (
    <section className="relative overflow-hidden border-t border-border">
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
        <Reveal>
          <p className="label-mono mb-5 text-brand">Components</p>
          <h2 className="max-w-3xl text-balance text-3xl leading-[1.15] sm:text-4xl">
            Every building block your product needs.{' '}
            <span className="text-muted-foreground">
              Components find and connect to each other automatically — no glue code, no hand-wired
              networking.
            </span>
          </h2>
        </Reveal>

        <div className="mt-12 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {COMPONENTS.map(({ icon: Icon, name, desc, color, border }, i) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, delay: i * 0.05, ease: EASE }}
              className={`rounded-lg border border-border bg-card p-5 transition-colors ${border}`}
            >
              <Icon className={`h-5 w-5 ${color}`} />
              <h3 className="mt-3 text-sm font-medium">{name}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
