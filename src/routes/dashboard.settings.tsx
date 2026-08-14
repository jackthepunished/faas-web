import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { AlertTriangle, Check, Copy, Eye, EyeOff, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { PageHeader, Panel } from '@/components/dashboard/primitives';
import { NOW, formatRelative } from '@/lib/mock-data';
import { useAuth } from '@/lib/auth';

export const Route = createFileRoute('/dashboard/settings')({
  component: SettingsPage,
});

interface ApiKey {
  id: string;
  label: string;
  value: string;
  createdAt: number;
}

const INITIAL_KEYS: ApiKey[] = [
  { id: 'key_prod', label: 'Production', value: 'grg_live_7f2a91c4e8b34d05a6f1', createdAt: NOW - 86_400_000 * 86 },
  { id: 'key_ci', label: 'CI pipeline', value: 'grg_live_2c8d40fa19be7c63d902', createdAt: NOW - 86_400_000 * 23 },
];

/** 20 hex chars, matching the shape of the seeded keys. */
function generateKey(): string {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `grg_live_${hex}`;
}

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

function KeyRow({ apiKey, onRevoke }: { apiKey: ApiKey; onRevoke: (id: string) => void }) {
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
      <button
        type="button"
        onClick={() => onRevoke(apiKey.id)}
        aria-label={`Revoke ${apiKey.label} key`}
        className="rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:border-[color:var(--status-critical)] hover:text-[color:var(--status-critical)]"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}

/** Type-to-confirm dialog for the irreversible action. */
function DeleteWorkspaceDialog({
  workspace,
  onCancel,
  onConfirm,
}: {
  workspace: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [typed, setTyped] = useState('');
  const matches = typed === workspace;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button
        aria-label="Cancel"
        onClick={onCancel}
        className="absolute inset-0 bg-mint-12/50 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-title"
        className="relative w-full max-w-md rounded-xl border border-border bg-popover p-6 shadow-2xl"
      >
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{ background: 'color-mix(in oklab, var(--status-critical) 18%, transparent)' }}
        >
          <AlertTriangle className="h-4 w-4" style={{ color: 'var(--status-critical)' }} />
        </span>

        <h2 id="delete-title" className="mt-4 text-lg font-semibold tracking-tight">
          Delete this workspace?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          This destroys every function, snapshot, and volume in{' '}
          <span className="font-mono text-foreground">{workspace}</span>. It cannot be undone.
        </p>

        <label className="mt-5 block">
          <span className="text-xs text-muted-foreground">
            Type <span className="font-mono text-foreground">{workspace}</span> to confirm
          </span>
          <input
            autoFocus
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 font-mono text-sm outline-none focus:border-[color:var(--status-critical)]"
          />
        </label>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" disabled={!matches} onClick={onConfirm}>
            Delete workspace
          </Button>
        </div>
      </div>
    </div>
  );
}

function SettingsPage() {
  const { toast } = useToast();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const [toggles, setToggles] = useState(() =>
    Object.fromEntries(TOGGLES.map((t) => [t.id, t.on]))
  );
  const [workspace, setWorkspace] = useState('acme-corp');
  const [region, setRegion] = useState('fra-metal-1');
  const [keys, setKeys] = useState<ApiKey[]>(INITIAL_KEYS);
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 700));
    setSaving(false);
    toast({ kind: 'success', title: 'Settings saved', description: `${workspace} · ${region}` });
  };

  const handleCreateKey = () => {
    const created: ApiKey = {
      id: `key_${Date.now()}`,
      label: `Key ${keys.length + 1}`,
      value: generateKey(),
      createdAt: Date.now(),
    };
    setKeys((prev) => [...prev, created]);
    toast({
      kind: 'success',
      title: 'API key created',
      description: 'Copy it now — this is the only time it is shown in full.',
    });
  };

  const handleRevoke = (id: string) => {
    setKeys((prev) => prev.filter((k) => k.id !== id));
    toast({ kind: 'info', title: 'Key revoked' });
  };

  const handleDelete = () => {
    setShowDelete(false);
    signOut();
    toast({ kind: 'info', title: 'Workspace deleted', description: 'You have been signed out.' });
    navigate({ to: '/' });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description="Workspace configuration and credentials." />

      <Panel title="Workspace">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="label-mono text-muted-foreground">Workspace name</span>
            <input
              value={workspace}
              onChange={(e) => setWorkspace(e.target.value)}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-brand/50"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="label-mono text-muted-foreground">Default region</span>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-brand/50"
            >
              <option value="fra-metal-1">fra-metal-1</option>
              <option value="iad-metal-1">iad-metal-1</option>
              <option value="sin-metal-1">sin-metal-1</option>
            </select>
          </label>
        </div>
        <div className="mt-5 flex justify-end">
          <Button size="sm" disabled={saving} onClick={handleSave} className="gap-1.5">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
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
          <Button variant="outline" size="sm" onClick={handleCreateKey}>
            Create key
          </Button>
        }
      >
        <ul className="flex flex-col divide-y divide-border">
          {keys.map((k) => (
            <KeyRow key={k.id} apiKey={k} onRevoke={handleRevoke} />
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
          <Button variant="destructive" size="sm" onClick={() => setShowDelete(true)}>
            Delete workspace
          </Button>
        </div>
      </Panel>

      {showDelete && (
        <DeleteWorkspaceDialog
          workspace={workspace}
          onCancel={() => setShowDelete(false)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
