import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Check, Copy, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { EmptyState, PageHeader, Panel } from '@/components/dashboard/primitives';
import { Pill } from '@/components/dashboard/resource-table';
import { API_KEYS, type ApiKeyRecord } from '@/lib/mock-resources';
import { formatRelative } from '@/lib/mock-data';

export const Route = createFileRoute('/dashboard/keys')({ component: KeysPage });

/** 20 hex chars, matching the shape of the seeded keys. */
function generateKey(): string {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return `grg_live_${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}

function KeyRow({ apiKey, onRevoke }: { apiKey: ApiKeyRecord; onRevoke: (id: string) => void }) {
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
    <li className="flex flex-wrap items-center gap-3 py-3.5 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-medium">
          {apiKey.label}
          {apiKey.scopes.map((s) => (
            <Pill key={s} label={s} />
          ))}
        </p>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          {revealed ? apiKey.value : `${apiKey.value.slice(0, 9)}${'•'.repeat(16)}`}
        </p>
      </div>

      <div className="text-right text-xs text-muted-foreground">
        <p>Created {formatRelative(apiKey.createdAt)}</p>
        <p className="mt-0.5">
          {apiKey.lastUsedAt ? `Used ${formatRelative(apiKey.lastUsedAt)}` : 'Never used'}
        </p>
      </div>

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
        aria-label={`Revoke ${apiKey.label}`}
        className="rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:border-[color:var(--status-critical)] hover:text-[color:var(--status-critical)]"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}

function KeysPage() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKeyRecord[]>(API_KEYS);
  const [pendingRevoke, setPendingRevoke] = useState<ApiKeyRecord | null>(null);

  const createKey = () => {
    const created: ApiKeyRecord = {
      id: `key_${Date.now()}`,
      label: `Key ${keys.length + 1}`,
      value: generateKey(),
      scopes: ['deploy', 'read'],
      createdAt: Date.now(),
      lastUsedAt: null,
    };
    setKeys((prev) => [...prev, created]);
    toast({
      kind: 'success',
      title: 'API key created',
      description: 'Copy it now — this is the only time it is shown in full.',
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="API Keys"
        description="Used by the CLI and the deployment API. Keys are shown in full only once."
        actions={
          <Button size="sm" className="gap-1.5" onClick={createKey}>
            <Plus className="h-3.5 w-3.5" />
            Create key
          </Button>
        }
      />

      <Panel>
        {keys.length === 0 ? (
          <EmptyState message="No API keys yet. Create one to use the CLI." />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {keys.map((k) => (
              <KeyRow key={k.id} apiKey={k} onRevoke={(id) => setPendingRevoke(keys.find((x) => x.id === id) ?? null)} />
            ))}
          </ul>
        )}
      </Panel>

      <ConfirmDialog
        open={pendingRevoke !== null}
        onClose={() => setPendingRevoke(null)}
        onConfirm={() => {
          if (!pendingRevoke) return;
          setKeys((prev) => prev.filter((k) => k.id !== pendingRevoke.id));
          toast({ kind: 'info', title: `Revoked ${pendingRevoke.label}` });
        }}
        title="Revoke this key?"
        description={`Anything using ${pendingRevoke?.label ?? 'this key'} will stop working immediately. This cannot be undone.`}
        confirmLabel="Revoke key"
        destructive
      />
    </div>
  );
}
