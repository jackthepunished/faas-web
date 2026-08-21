import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Check, Copy, NavArrowRight } from 'iconoir-react';
import { INSTALL_COMMAND } from '@/components/landing/install-command';
import { Panel } from './primitives';
import { cn } from '@/lib/utils';

/**
 * What the console says to an account with nothing in it.
 *
 * The alternative — four zeroes and a dash — is technically accurate and
 * tells a new user nothing about what to do next. The landing already sells
 * the product as three commands in a terminal; this continues that same
 * script on the other side of the sign-up, in the same vocabulary.
 *
 * **Every command here is one the CLI documents** (`content/docs/cli.md`,
 * `deploy-from-source.md`). Nothing is invented for the sake of a tidy
 * three-step story.
 *
 * The numbering is information rather than decoration: the steps genuinely
 * have to happen in this order.
 */

const STEPS: { command: string; caption: string }[] = [
  {
    command: INSTALL_COMMAND,
    caption: 'Install the CLI. Homebrew on macOS and Linux.',
  },
  {
    command: 'gregale connect',
    caption: 'Link your GitHub account once, in a browser. CI reuses it after that.',
  },
  {
    command: 'gregale deploy --repo <owner>/<repo> --ref main',
    caption: 'Build and deploy. The app appears here as soon as the build starts.',
  },
];

function CopyButton({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  return (
    <button
      type="button"
      aria-label={`Copy: ${command}`}
      onClick={() => {
        void navigator.clipboard
          .writeText(command)
          .then(() => {
            setCopied(true);
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => setCopied(false), 1800);
          })
          // Clipboard access can be refused; the command is on screen to be
          // read either way, so there is nothing to report.
          .catch(() => {});
      }}
      className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors',
        copied
          ? 'bg-brand-muted text-brand'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      <span aria-live="polite" className="sr-only">
        {copied ? 'Copied' : ''}
      </span>
    </button>
  );
}

export function FirstRun() {
  return (
    <Panel lit padded={false} title="Deploy your first app">
      <ol className="flex flex-col">
        {STEPS.map((step, i) => (
          <li
            key={step.command}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-5 py-4 last:border-0"
          >
            <span
              aria-hidden
              className="label-mono flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground"
            >
              {i + 1}
            </span>

            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-center gap-2">
                <span aria-hidden className="font-mono text-sm text-brand">
                  $
                </span>
                <code className="truncate font-mono text-sm text-foreground">{step.command}</code>
                <CopyButton command={step.command} />
              </div>
              <p className="text-xs text-muted-foreground">{step.caption}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border px-5 py-3.5">
        <p className="text-xs text-muted-foreground">Prefer to stay in the browser?</p>
        <Link
          to="/dashboard/workflows/new"
          className="group inline-flex items-center gap-1 text-xs text-brand transition-colors hover:text-brand-hover"
        >
          Create an app from a repository
          <NavArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
        </Link>
      </div>
    </Panel>
  );
}
