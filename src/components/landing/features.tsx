import { motion } from 'framer-motion';
import { Boxes, FileDown, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { EASE } from './reveal';

const FEATURES = [
  {
    icon: Boxes,
    color: 'text-cat-compute',
    title: 'Deploy anything, anywhere',
    body: 'Ship functions, containers, and full-stack apps to Gregale-managed bare metal or hardware you already own. Infrastructure is derived from your code — any stack, zero extra dependencies.',
  },
  {
    icon: FileDown,
    color: 'text-cat-storage',
    title: 'Own your infrastructure',
    body: 'Everything runs as real disk images and microVMs you can export at any time. You stay because Gregale is the easiest way to run serverless — not because leaving is hard.',
  },
  {
    icon: LayoutDashboard,
    color: 'text-cat-network',
    title: 'Everything in one place',
    body: 'Deployments, environments, logs, and billing live in a single operational surface instead of a maze of consoles. Resources are grouped by project and fully versioned, so you always know exactly what is running.',
  },
  {
    icon: ShieldCheck,
    color: 'text-cat-security',
    title: 'Enterprise-grade by default',
    body: 'Hand an agent raw cloud credentials and it will eventually open the wrong port. Gregale is declarative: every change an agent proposes resolves to a hardware-isolated microVM with locked-down defaults.',
  },
];

export function Features() {
  return (
    <section id="deploy" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, color, title, body }, i) => (
            // Opacity-only: a translate would drag cells out of the hairline grid.
            <motion.div
              key={title}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: EASE }}
              className="bg-background p-8 sm:p-10"
            >
              <Icon className={`h-5 w-5 ${color}`} />
              <h3 className="mt-4 text-lg font-medium">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
