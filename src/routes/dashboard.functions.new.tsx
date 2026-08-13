import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, ArrowRight, Check, Github, Package, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { BuildLog } from '@/components/dashboard/build-log';
import { PageHeader, Panel } from '@/components/dashboard/primitives';
import { PROJECTS, type Runtime } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/dashboard/functions/new')({
  component: NewFunctionPage,
});

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const STEPS = ['Source', 'Configure', 'Review'] as const;

const SOURCES = [
  { id: 'git', name: 'Import from Git', desc: 'Connect a repository and deploy on every push.', icon: Github },
  { id: 'template', name: 'Start from a template', desc: 'A working handler you can edit after deploy.', icon: Package },
  { id: 'upload', name: 'Upload a bundle', desc: 'Ship a prebuilt archive straight to metal.', icon: Upload },
];

const RUNTIMES: { id: Runtime; label: string }[] = [
  { id: 'node22', label: 'Node 22' },
  { id: 'python3.12', label: 'Python 3.12' },
  { id: 'go1.23', label: 'Go 1.23' },
  { id: 'rust1.80', label: 'Rust 1.80' },
];

const MEMORY = [128, 256, 512, 1024, 2048];
const REGIONS = ['fra-metal-1', 'iad-metal-1', 'sin-metal-1'];

function NewFunctionPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [source, setSource] = useState('git');
  const [repo, setRepo] = useState('acme-corp/checkout-service');
  const [name, setName] = useState('checkout-service');
  const [projectId, setProjectId] = useState(PROJECTS[0].id);
  const [runtime, setRuntime] = useState<Runtime>('node22');
  const [memoryMb, setMemoryMb] = useState(512);
  const [region, setRegion] = useState(REGIONS[0]);
  const [scaleToZero, setScaleToZero] = useState(true);

  const [deploying, setDeploying] = useState(false);
  const [deployed, setDeployed] = useState(false);

  const nameValid = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(name);

  if (deploying) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <PageHeader
          title={deployed ? 'Deployed' : 'Deploying'}
          description={
            deployed
              ? `${name} is live on ${region} and already scaled to zero.`
              : `Building ${name} and capturing its snapshot.`
          }
        />

        <BuildLog
          onComplete={() => {
            setDeployed(true);
            toast({
              kind: 'success',
              title: 'Deployment succeeded',
              description: `${name} is serving traffic on ${region}.`,
            });
          }}
        />

        {deployed && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
          >
            <a
              href="#"
              className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              https://{name}.gregale.run
            </a>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate({ to: '/dashboard/functions' })}>
                All functions
              </Button>
              <Button
                variant="cta"
                size="sm"
                className="gap-1.5 rounded-md"
                onClick={() => navigate({ to: '/dashboard' })}
              >
                View metrics
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link
        to="/dashboard/functions"
        className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        All functions
      </Link>

      <PageHeader title="New function" description="Deploy a function to bare metal." />

      {/* Step rail */}
      <ol className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full border text-[11px]',
                i < step && 'border-transparent text-black',
                i === step && 'border-brand text-brand',
                i > step && 'border-border text-muted-foreground'
              )}
              style={i < step ? { background: 'var(--status-good)' } : undefined}
            >
              {i < step ? <Check className="h-3 w-3" /> : i + 1}
            </span>
            <span className={cn('text-sm', i === step ? 'text-foreground' : 'text-muted-foreground')}>
              {label}
            </span>
            {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-border sm:w-10" />}
          </li>
        ))}
      </ol>

      <AnimatePresence mode="wait" initial={false}>
        {step === 0 && (
          <motion.div
            key="source"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              {SOURCES.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSource(s.id)}
                    aria-pressed={source === s.id}
                    className={cn(
                      'flex items-start gap-3 rounded-lg border p-4 text-left transition-colors',
                      source === s.id
                        ? 'border-brand bg-brand/5'
                        : 'border-border bg-card hover:border-border-secondary'
                    )}
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{s.name}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{s.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {source === 'git' && (
              <label className="flex flex-col gap-1.5">
                <span className="label-mono text-muted-foreground">Repository</span>
                <input
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  className="h-10 rounded-lg border border-border bg-card px-3 font-mono text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
                />
              </label>
            )}

            <div className="flex justify-end">
              <Button variant="cta" onClick={() => setStep(1)} className="h-10 gap-2 rounded-lg">
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="configure"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="flex flex-col gap-5"
          >
            <Panel>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="label-mono text-muted-foreground">Function name</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value.toLowerCase())}
                    aria-invalid={!nameValid || undefined}
                    className={cn(
                      'h-10 rounded-lg border bg-background px-3 font-mono text-sm outline-none focus:ring-2 focus:ring-brand/25',
                      nameValid ? 'border-border focus:border-brand' : 'border-[color:var(--status-critical)]'
                    )}
                  />
                  {!nameValid && (
                    <span className="text-xs" style={{ color: 'var(--status-critical)' }}>
                      Lowercase letters, numbers, and dashes.
                    </span>
                  )}
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="label-mono text-muted-foreground">Project</span>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-brand"
                  >
                    {PROJECTS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="label-mono text-muted-foreground">Runtime</span>
                  <select
                    value={runtime}
                    onChange={(e) => setRuntime(e.target.value as Runtime)}
                    className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-brand"
                  >
                    {RUNTIMES.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="label-mono text-muted-foreground">Region</span>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-brand"
                  >
                    {REGIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-6">
                <span className="label-mono text-muted-foreground">Memory</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {MEMORY.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMemoryMb(m)}
                      aria-pressed={memoryMb === m}
                      className={cn(
                        'rounded-md border px-3 py-1.5 font-mono text-xs transition-colors',
                        memoryMb === m
                          ? 'border-brand bg-brand/10 text-foreground'
                          : 'border-border text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {m} MB
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex items-start justify-between gap-6 border-t border-border pt-5">
                <div>
                  <p className="text-sm font-medium">Scale to zero</p>
                  <p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
                    Snapshot the microVM after 60s idle. Wakes in under 350ms on the next request.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={scaleToZero}
                  aria-label="Scale to zero"
                  onClick={() => setScaleToZero((v) => !v)}
                  className="relative mt-1 h-5 w-9 shrink-0 rounded-full border border-border transition-colors"
                  style={{ background: scaleToZero ? 'var(--brand)' : 'var(--muted)' }}
                >
                  <span
                    className="absolute top-0.5 h-3.5 w-3.5 rounded-full bg-background transition-transform"
                    style={{ transform: scaleToZero ? 'translateX(18px)' : 'translateX(3px)' }}
                  />
                </button>
              </div>
            </Panel>

            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep(0)} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                variant="cta"
                disabled={!nameValid}
                onClick={() => setStep(2)}
                className="h-10 gap-2 rounded-lg"
              >
                Review
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="flex flex-col gap-5"
          >
            <Panel title="Review">
              <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                {[
                  ['Name', name],
                  ['Project', PROJECTS.find((p) => p.id === projectId)?.name ?? ''],
                  ['Source', source === 'git' ? repo : SOURCES.find((s) => s.id === source)?.name ?? ''],
                  ['Runtime', runtime],
                  ['Memory', `${memoryMb} MB`],
                  ['Region', region],
                  ['Scale to zero', scaleToZero ? 'Enabled' : 'Disabled'],
                  ['Endpoint', `${name}.gregale.run`],
                ].map(([label, value]) => (
                  <div key={label} className="flex flex-col gap-1 border-b border-border pb-3">
                    <dt className="label-mono text-muted-foreground">{label}</dt>
                    <dd className="font-mono text-sm">{value}</dd>
                  </div>
                ))}
              </dl>

              <p className="mt-5 text-xs text-muted-foreground">
                Estimated cost at 100k invocations/month:{' '}
                <span className="text-foreground">
                  ${((memoryMb / 1024) * 0.05 * 100).toFixed(2)}
                </span>{' '}
                — billed only for time spent running.
              </p>
            </Panel>

            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep(1)} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                variant="cta"
                onClick={() => setDeploying(true)}
                className="h-10 gap-2 rounded-lg px-6"
              >
                Deploy function
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
