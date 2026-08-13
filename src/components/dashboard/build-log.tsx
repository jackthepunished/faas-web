import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BuildStage {
  label: string;
  /** Log lines emitted while this stage runs. */
  lines: string[];
  durationMs: number;
}

export const DEPLOY_STAGES: BuildStage[] = [
  {
    label: 'Resolving source',
    lines: ['fetching repository tree', 'detected runtime from manifest', 'lockfile unchanged — reusing cache'],
    durationMs: 1400,
  },
  {
    label: 'Building rootfs',
    lines: ['assembling base image', 'installing dependencies', 'stripping build layers (−184 MB)'],
    durationMs: 2200,
  },
  {
    label: 'Booting microVM',
    lines: ['allocating 512 MB on fra-metal-1', 'kernel handoff complete in 41ms', 'PID1 reported ready'],
    durationMs: 1600,
  },
  {
    label: 'Capturing snapshot',
    lines: ['freezing guest memory', 'snapshot written (38 MB)', 'restore verified in 312ms'],
    durationMs: 1800,
  },
  {
    label: 'Routing traffic',
    lines: ['TLS certificate issued', 'edge routes published', 'health check passed'],
    durationMs: 1200,
  },
];

type StageState = 'pending' | 'active' | 'done';

/**
 * Streams a deploy through its stages, emitting log lines as it goes.
 * Purely presentational — the caller decides what completion means.
 */
export function BuildLog({
  stages = DEPLOY_STAGES,
  onComplete,
}: {
  stages?: BuildStage[];
  onComplete?: () => void;
}) {
  const [current, setCurrent] = useState(0);
  const [lines, setLines] = useState<{ id: number; text: string }[]>([]);
  const scroller = useRef<HTMLDivElement>(null);
  const completed = useRef(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 0;
    let lineId = 0;

    stages.forEach((stage, stageIndex) => {
      const start = elapsed;
      timers.push(setTimeout(() => setCurrent(stageIndex), start));

      stage.lines.forEach((text, i) => {
        const at = start + (stage.durationMs / (stage.lines.length + 1)) * (i + 1);
        timers.push(
          setTimeout(() => {
            setLines((prev) => [...prev, { id: lineId++, text }]);
          }, at)
        );
      });

      elapsed += stage.durationMs;
    });

    timers.push(
      setTimeout(() => {
        setCurrent(stages.length);
        if (!completed.current) {
          completed.current = true;
          onComplete?.();
        }
      }, elapsed)
    );

    return () => timers.forEach(clearTimeout);
    // Stages are static per mount; re-running would restart the deploy.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [lines.length]);

  const stateOf = (i: number): StageState =>
    i < current ? 'done' : i === current ? 'active' : 'pending';

  const progress = Math.min(100, (current / stages.length) * 100);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Progress rail */}
      <div className="h-0.5 w-full bg-muted">
        <motion.div
          className="h-full"
          style={{ background: 'var(--brand)' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      <ol className="flex flex-col gap-0.5 p-4">
        {stages.map((stage, i) => {
          const state = stateOf(i);
          return (
            <li
              key={stage.label}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors',
                state === 'pending' && 'text-muted-foreground/50',
                state === 'active' && 'bg-muted text-foreground',
                state === 'done' && 'text-muted-foreground'
              )}
            >
              <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                {state === 'done' && (
                  <Check className="h-3.5 w-3.5" style={{ color: 'var(--status-good)' }} />
                )}
                {state === 'active' && <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" />}
                {state === 'pending' && (
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40" />
                )}
              </span>
              {stage.label}
            </li>
          );
        })}
      </ol>

      {/* Streaming output */}
      <div
        ref={scroller}
        aria-live="polite"
        className="max-h-44 overflow-y-auto border-t border-border bg-background px-4 py-3 font-mono text-xs"
      >
        {lines.length === 0 ? (
          <p className="text-muted-foreground">Waiting for the builder…</p>
        ) : (
          lines.map((line) => (
            <motion.p
              key={line.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="text-muted-foreground"
            >
              <span className="mr-2 select-none text-brand/60">›</span>
              {line.text}
            </motion.p>
          ))
        )}
      </div>
    </div>
  );
}
