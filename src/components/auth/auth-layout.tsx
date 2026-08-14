import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { Wind } from 'lucide-react';
import { DotCutCanvas } from '@/components/dotcut/dot-cut-canvas';

const PROOF_POINTS = [
  ['Cold start p50', 'under 350ms'],
  ['Idle cost', 'zero'],
  ['Isolation', 'hardware microVM'],
];

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="theme-teal flex min-h-screen bg-background text-foreground">
      {/* Form side */}
      <div className="flex w-full flex-col px-5 py-8 sm:px-10 lg:w-[52%] lg:px-16">
        <Link to="/" className="inline-flex w-fit items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-gradient-to-b from-white/10 to-transparent">
            <Wind className="h-3.5 w-3.5 text-brand" />
          </span>
          <span className="text-sm font-semibold tracking-tight">Gregale</span>
        </Link>

        <div className="flex flex-1 items-center py-10">
          <div className="mx-auto w-full max-w-sm">{children}</div>
        </div>

        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Gregale ·{' '}
          <a href="#" className="hover:text-foreground">
            Privacy
          </a>{' '}
          ·{' '}
          <a href="#" className="hover:text-foreground">
            Terms
          </a>
        </p>
      </div>

      {/* Visual side */}
      <aside className="relative hidden overflow-hidden border-l border-border lg:block lg:w-[48%]">
        <DotCutCanvas className="absolute inset-0 h-full w-full" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-12">
          <p className="max-w-sm text-2xl leading-[1.2] font-semibold tracking-tight">
            Functions that sleep at zero and wake in a blink.
          </p>
          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
            {PROOF_POINTS.map(([label, value]) => (
              <div key={label}>
                <dt className="label-mono text-muted-foreground">{label}</dt>
                <dd className="mt-1 text-sm font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </aside>
    </div>
  );
}
