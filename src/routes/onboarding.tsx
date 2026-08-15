import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { useSweepNavigate } from '@/components/sweep-link';
import { ArrowLeft, ArrowRight, Check, PartyPopper, Wind } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { BuildLog } from '@/components/dashboard/build-log';
import { PixelBeams } from '@/components/landing/shaders/pixel-beams';
import { DEFAULT_WORKSPACE, markOnboarded, readSession, saveWorkspace, useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { pageHead } from '@/lib/seo';

export const Route = createFileRoute('/onboarding')({
  head: () => pageHead({ title: 'Get started' }),
  beforeLoad: () => {
    if (!readSession()) throw redirect({ to: '/login' });
  },
  component: OnboardingPage,
});

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const STEPS = ['Workspace', 'Region', 'First function'] as const;

const REGIONS = [
  { id: 'fra-metal-1', city: 'Frankfurt', note: 'Lowest latency in the EU', latency: '12ms' },
  { id: 'iad-metal-1', city: 'Ashburn', note: 'US East coast', latency: '88ms' },
  { id: 'sin-metal-1', city: 'Singapore', note: 'APAC coverage', latency: '164ms' },
];

const TEMPLATES = [
  {
    id: 'http',
    name: 'HTTP endpoint',
    desc: 'A request handler behind a managed domain.',
    runtime: 'node22',
  },
  {
    id: 'cron',
    name: 'Scheduled job',
    desc: 'Runs on a cron expression, scales to zero between runs.',
    runtime: 'go1.23',
  },
  {
    id: 'queue',
    name: 'Queue consumer',
    desc: 'Drains a queue and wakes only when messages land.',
    runtime: 'python3.12',
  },
  {
    id: 'blank',
    name: 'Empty function',
    desc: 'Start from nothing and wire it up yourself.',
    runtime: 'node22',
  },
];

function StepRail({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full border text-[11px] transition-colors',
                done && 'border-transparent text-black',
                active && 'border-brand text-brand',
                !done && !active && 'border-border text-muted-foreground'
              )}
              style={done ? { background: 'var(--status-good)' } : undefined}
            >
              {done ? <Check className="h-3 w-3" /> : i + 1}
            </span>
            <span
              className={cn(
                'hidden text-sm sm:block',
                active ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-border sm:w-10" />}
          </li>
        );
      })}
    </ol>
  );
}

function OnboardingPage() {
  const sweepNavigate = useSweepNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [step, setStep] = useState(0);
  const [workspace, setWorkspace] = useState(DEFAULT_WORKSPACE);
  const [region, setRegion] = useState(REGIONS[0].id);
  const [template, setTemplate] = useState(TEMPLATES[0].id);
  const [deploying, setDeploying] = useState(false);
  const [deployed, setDeployed] = useState(false);

  const slugValid = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(workspace);

  const finish = () => {
    saveWorkspace(workspace);
    markOnboarded();
    toast({ kind: 'success', title: 'Workspace ready', description: `${workspace} · ${region}` });
    // The biggest context switch in the product — setup handing off to the app.
    sweepNavigate('/dashboard');
  };

  // The field answers the flow: quiet while the user is deciding, energetic
  // while the build runs, settled once it lands.
  const beamIntensity = deployed ? 0.55 : deploying ? 0.95 : 0.22;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <PixelBeams className="inset-0" intensity={beamIntensity} />

      {/* Veils the centre column the content occupies, leaving the beams
          legible down both margins. Paper rather than ink now that onboarding
          sits on the light side of the split. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(to right, rgba(251,252,251,0.28) 0%, rgba(251,252,251,0.91) 26%, rgba(251,252,251,0.91) 74%, rgba(251,252,251,0.28) 100%)',
        }}
      />

      <header className="relative flex items-center justify-between border-b border-border px-5 py-4 sm:px-8">
        <span className="flex items-center gap-2.5">
          <span className="brand-mark">
            <Wind className="h-3.5 w-3.5" />
          </span>
          <span className="text-sm font-semibold tracking-tight">Gregale</span>
        </span>
        <span className="text-xs text-muted-foreground">{user?.email}</span>
      </header>

      <div className="relative mx-auto max-w-2xl px-5 py-10 sm:py-16">
        <StepRail current={deployed ? STEPS.length : step} />

        <div className="mt-10">
          <AnimatePresence mode="wait" initial={false}>
            {/* ---------- Step 1: workspace ---------- */}
            {step === 0 && (
              <motion.div
                key="workspace"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: EASE }}
              >
                <h1 className="text-2xl font-semibold tracking-tight">Name your workspace</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  This becomes the namespace for every project and function you deploy.
                </p>

                <label htmlFor="workspace" className="label-mono mt-8 block text-muted-foreground">
                  Workspace slug
                </label>
                <div className="mt-2 flex items-center rounded-lg border border-border bg-card focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/25">
                  <span className="pl-3.5 font-mono text-sm text-muted-foreground">
                    gregale.run/
                  </span>
                  <input
                    id="workspace"
                    autoFocus
                    value={workspace}
                    onChange={(e) => setWorkspace(e.target.value.toLowerCase())}
                    className="h-11 flex-1 bg-transparent pr-3.5 font-mono text-sm outline-none"
                  />
                </div>
                <p
                  className="mt-2 text-xs"
                  style={{ color: slugValid ? undefined : 'var(--status-critical)' }}
                >
                  {slugValid
                    ? 'Lowercase letters, numbers, and dashes.'
                    : 'Must be 3–32 characters: lowercase letters, numbers, and dashes.'}
                </p>

                <div className="mt-8 flex justify-end">
                  <Button
                    variant="cta"
                    disabled={!slugValid}
                    onClick={() => setStep(1)}
                    className="h-10 gap-2 rounded-lg"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ---------- Step 2: region ---------- */}
            {step === 1 && (
              <motion.div
                key="region"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: EASE }}
              >
                <h1 className="text-2xl font-semibold tracking-tight">Choose your metal</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Where your snapshots live. You can add regions later.
                </p>

                <div className="mt-8 flex flex-col gap-2">
                  {REGIONS.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRegion(r.id)}
                      aria-pressed={region === r.id}
                      className={cn(
                        'flex items-center justify-between gap-4 rounded-lg border p-4 text-left transition-colors',
                        region === r.id
                          ? 'border-brand bg-brand/5'
                          : 'border-border bg-card hover:border-border-secondary'
                      )}
                    >
                      <span>
                        <span className="block text-sm font-medium">{r.city}</span>
                        <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
                          {r.id} · {r.note}
                        </span>
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground [font-variant-numeric:tabular-nums]">
                          {r.latency}
                        </span>
                        <span
                          className={cn(
                            'flex h-4 w-4 items-center justify-center rounded-full border',
                            region === r.id ? 'border-brand bg-brand' : 'border-border'
                          )}
                        >
                          {region === r.id && <Check className="h-2.5 w-2.5 text-black" />}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>

                <div className="mt-8 flex items-center justify-between">
                  <Button variant="ghost" onClick={() => setStep(0)} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    variant="cta"
                    onClick={() => setStep(2)}
                    className="h-10 gap-2 rounded-lg"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ---------- Step 3: first function ---------- */}
            {step === 2 && !deployed && (
              <motion.div
                key="function"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: EASE }}
              >
                <h1 className="text-2xl font-semibold tracking-tight">
                  Deploy your first function
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Pick a starting point. It deploys to {region} and scales to zero when idle.
                </p>

                {!deploying ? (
                  <>
                    <div className="mt-8 grid gap-2 sm:grid-cols-2">
                      {TEMPLATES.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTemplate(t.id)}
                          aria-pressed={template === t.id}
                          className={cn(
                            'rounded-lg border p-4 text-left transition-colors',
                            template === t.id
                              ? 'border-brand bg-brand/5'
                              : 'border-border bg-card hover:border-border-secondary'
                          )}
                        >
                          <span className="block text-sm font-medium">{t.name}</span>
                          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                            {t.desc}
                          </span>
                          <span className="label-mono mt-3 block text-muted-foreground">
                            {t.runtime}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="mt-8 flex items-center justify-between">
                      <Button variant="ghost" onClick={() => setStep(1)} className="gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back
                      </Button>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" onClick={finish}>
                          Skip for now
                        </Button>
                        <Button
                          variant="cta"
                          onClick={() => setDeploying(true)}
                          className="h-10 gap-2 rounded-lg"
                        >
                          Deploy
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="mt-8">
                    <BuildLog onComplete={() => setDeployed(true)} />
                    <p className="mt-4 text-center text-xs text-muted-foreground">
                      This usually takes about eight seconds.
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* ---------- Success ---------- */}
            {deployed && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, ease: EASE }}
                className="text-center"
              >
                <span
                  className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
                  style={{ background: 'color-mix(in oklab, var(--status-good) 18%, transparent)' }}
                >
                  <PartyPopper className="h-5 w-5" style={{ color: 'var(--status-good)' }} />
                </span>
                <h1 className="mt-5 text-2xl font-semibold tracking-tight">You are live.</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your function is deployed to {region} and already scaled back to zero.
                </p>

                <a
                  href="#"
                  className="mt-6 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 font-mono text-xs text-muted-foreground transition-colors hover:border-brand/40 hover:text-foreground"
                >
                  https://hello-world.{workspace}.gregale.run
                </a>

                <div className="mt-8">
                  <Button variant="cta" onClick={finish} className="h-11 gap-2 rounded-lg px-6">
                    Go to dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
