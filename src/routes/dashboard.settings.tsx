import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Check, Copy, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader, Panel } from '@/components/dashboard/primitives';
import { NOW, formatRelative } from '@/lib/mock-data';

export const Route = createFileRoute('/dashboard/settings')({
  component: SettingsPage,
});

const API_KEYS = [
  { id: 'key_prod', label: 'Production', value: 'grg_live_7f2a91c4e8b34d05a6f1', createdAt: NOW - 86_400_000 * 86 },
  { id: 'key_ci', label: 'CI pipeline', value: 'grg_live_2c8d40fa19be7c63d902', createdAt: NOW - 86_400_000 * 23 },
];

const TOGGLES = [
  {
    id: 'scale-to-zero',
    label: 'Scale to zero',
    description: 'Suspend microVMs to snapshot after 60s idle. Disable to keep instances warm.',
    on: true,
  },
  {
    id: 'deploy-alerts',
    label: 'Deployment alerts',
    description: 'Email the workspace when a deployment fails.',
    on: true,
  },
  {
    id: 'agent-access',
    label: 'Agent API access',
    description: 'Allow agents to propose deployments through the declarative API.',
    on: false,
  },
];

function KeyRow({ apiKey }: { apiKey: (typeof API_KEYS)[number] }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(apiKey.value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard unavailable — the value stays selectable when revealed.
    }
  };

  return (
    <li className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{apiKey.label}</p>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          {revealed ? apiKey.value : `${apiKey.value.slice(0, 9)}${'•'.repeat(16)}`}
        </p>
      </div>
      <span className="text-xs text-muted-foreground">
        Created {formatRelative(apiKey.createdAt)}
      </span>
      <button
        type="button"
        onClick={() => setRevealed((v) => !v)}
        aria-label={revealed ? 'Hide key' : 'Reveal key'}
        className="rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:text-foreground"
      >
        {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy key"
        className="rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:text-foreground"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" style={{ color: 'var(--status-good)' }} />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </li>
  );
}

function SettingsPage() {
  const [toggles, setToggles] = useState(() =>
    Object.fromEntries(TOGGLES.map((t) => [t.id, t.on]))
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description="Workspace configuration and credentials." />

      <Panel title="Workspace">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="label-mono text-muted-foreground">Workspace name</span>
            <input
              defaultValue="acme-corp"
              className="h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-brand/50"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="label-mono text-muted-foreground">Default region</span>
            <select
              defaultValue="fra-metal-1"
              className="h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-brand/50"
            >
              <option value="fra-metal-1">fra-metal-1</option>
              <option value="iad-metal-1">iad-metal-1</option>
              <option value="sin-metal-1">sin-metal-1</option>
            </select>
          </label>
        </div>
        <div className="mt-5 flex justify-end">
          <Button size="sm">Save changes</Button>
        </div>
      </Panel>

      <Panel title="Runtime behavior">
        <ul className="flex flex-col divide-y divide-border">
          {TOGGLES.map((t) => (
            <li key={t.id} className="flex items-start justify-between gap-6 py-4 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium">{t.label}</p>
                <p className="mt-1 max-w-lg text-xs leading-relaxed text-muted-foreground">
                  {t.description}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={toggles[t.id]}
                aria-label={t.label}
                onClick={() => setToggles((prev) => ({ ...prev, [t.id]: !prev[t.id] }))}
                className="relative mt-1 h-5 w-9 shrink-0 rounded-full border border-border transition-colors"
                style={{ background: toggles[t.id] ? 'var(--brand)' : 'var(--muted)' }}
              >
                <span
                  className="absolute top-0.5 h-3.5 w-3.5 rounded-full bg-background transition-transform"
                  style={{ transform: toggles[t.id] ? 'translateX(18px)' : 'translateX(3px)' }}
                />
              </button>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel
        title="API keys"
        description="Used by the CLI and the deployment API"
        actions={
          <Button variant="outline" size="sm">
            Create key
          </Button>
        }
      >
        <ul className="flex flex-col divide-y divide-border">
          {API_KEYS.map((k) => (
            <KeyRow key={k.id} apiKey={k} />
          ))}
        </ul>
      </Panel>

      <Panel title="Danger zone" className="border-destructive/30">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Delete workspace</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Permanently destroys every function, snapshot, and volume. This cannot be undone.
            </p>
          </div>
          <Button variant="destructive" size="sm">
            Delete workspace
          </Button>
        </div>
      </Panel>
    </div>
  );
}
