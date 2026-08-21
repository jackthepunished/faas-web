import { useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { WarningTriangle, Copy, Plus, Refresh, Trash } from 'iconoir-react';
import { Button } from '@/components/ui/button';
import { PageHeader, Panel } from '@/components/dashboard/primitives';
import { Pill, ResourceTable, type Column } from '@/components/dashboard/resource-table';
import { useToast } from '@/components/ui/toast';
import { useApiKeys, useCreateApiKey, useDeleteApiKey, useRotateApiKey } from '@/lib/api/queries';
import { errorMessage } from '@/lib/api/errors';
import { consoleHead } from '@/lib/seo';

export const Route = createFileRoute('/dashboard/keys')({
  component: KeysPage,
  head: () => consoleHead('keys'),
});

/**
 * API keys, from `/v1/keys`.
 *
 * **The plaintext is returned exactly once**, on create and on rotate. After
 * that the API only ever surfaces the prefix, and there is no recovery path —
 * so the reveal panel below is not a nicety, it is the only chance the customer
 * gets. It stays until dismissed rather than auto-hiding.
 *
 * Rotation is not deletion: the old key keeps working for a grace window
 * (`/v1/account/keys/grace_window_days`) so a deploy mid-rotation does not fail.
 */
interface KeyRow {
  id: string;
  label: string;
  prefix: string;
  scopes: string;
  lastUsedAt: string | null;
}

function formatWhen(value: string | null | undefined): string {
  if (!value) return 'Never';
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? 'Never' : new Date(ms).toLocaleDateString();
}

/** The one-time reveal. Dismissing it is the only way out, on purpose. */
function PlaintextPanel({ value, onDismiss }: { value: string; onDismiss: () => void }) {
  const { toast } = useToast();

  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-xl border p-5"
      style={{ borderColor: 'color-mix(in oklab, var(--status-warning) 45%, transparent)' }}
    >
      <span className="flex items-center gap-2 text-sm font-medium">
        <WarningTriangle className="h-4 w-4" style={{ color: 'var(--status-warning)' }} />
        Copy this key now — it will not be shown again
      </span>
      <code className="select-all break-all rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs">
        {value}
      </code>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => {
            void navigator.clipboard
              .writeText(value)
              .then(() => toast({ kind: 'success', title: 'Copied to clipboard' }))
              .catch(() => toast({ kind: 'error', title: 'Could not copy' }));
          }}
        >
          <Copy className="h-3.5 w-3.5" />
          Copy
        </Button>
        <Button size="sm" variant="ghost" onClick={onDismiss}>
          I have saved it
        </Button>
      </div>
    </div>
  );
}

function KeysPage() {
  const { toast } = useToast();
  const { data, isPending, error, refetch } = useApiKeys();
  const createKey = useCreateApiKey();
  const deleteKey = useDeleteApiKey();
  const rotateKey = useRotateApiKey();

  const [label, setLabel] = useState('');
  const [plaintext, setPlaintext] = useState<string | null>(null);

  const rows = useMemo<KeyRow[]>(
    () =>
      (data ?? []).map((k) => ({
        id: k.id,
        label: k.label ?? '—',
        prefix: k.prefix,
        scopes: k.scopes.join(', '),
        lastUsedAt: k.last_used_at ?? null,
      })),
    [data]
  );

  const columns: Column<KeyRow>[] = [
    { key: 'label', label: 'Label' },
    {
      key: 'prefix',
      label: 'Key',
      render: (k) => <span className="font-mono text-xs">{k.prefix}…</span>,
    },
    {
      key: 'scopes',
      label: 'Scopes',
      render: (k) => (
        <span className="flex flex-wrap gap-1">
          {k.scopes ? (
            k.scopes.split(', ').map((s) => <Pill key={s} label={s} />)
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </span>
      ),
    },
    {
      key: 'lastUsedAt',
      label: 'Last used',
      numeric: true,
      render: (k) => (
        <span className="text-xs text-muted-foreground">{formatWhen(k.lastUsedAt)}</span>
      ),
    },
    {
      key: 'id',
      label: '',
      width: 'w-20',
      render: (k) => (
        <span className="flex items-center gap-3">
          <button
            type="button"
            aria-label={`Rotate ${k.label}`}
            onClick={() => {
              void rotateKey
                .mutateAsync(k.id)
                .then((result) => {
                  setPlaintext(result.key_plaintext);
                  toast({
                    kind: 'success',
                    title: 'Key rotated',
                    description: 'The previous key keeps working for its grace window.',
                  });
                })
                .catch((err: unknown) =>
                  toast({
                    kind: 'error',
                    title: 'Could not rotate',
                    description: errorMessage(err),
                  })
                );
            }}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <Refresh className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label={`Revoke ${k.label}`}
            onClick={() => {
              void deleteKey
                .mutateAsync(k.id)
                .then(() => toast({ kind: 'success', title: 'Key revoked' }))
                .catch((err: unknown) =>
                  toast({
                    kind: 'error',
                    title: 'Could not revoke',
                    description: errorMessage(err),
                  })
                );
            }}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <Trash className="h-3.5 w-3.5" />
          </button>
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="API Keys"
        description="Bearer keys for the CLI and the API. Revoking is immediate; rotating leaves the old key valid for its grace window."
      />

      {plaintext && <PlaintextPanel value={plaintext} onDismiss={() => setPlaintext(null)} />}

      <Panel lit title="Create a key">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (createKey.isPending) return;
            void createKey
              .mutateAsync({ label: label.trim() || undefined })
              .then((result) => {
                setLabel('');
                // `plaintext` on create; the rotate response calls the same
                // thing `key_plaintext`. Both are the only copy that exists.
                setPlaintext(result.plaintext ?? null);
              })
              .catch((err: unknown) =>
                toast({
                  kind: 'error',
                  title: 'Could not create key',
                  description: errorMessage(err),
                })
              );
          }}
        >
          <label className="flex min-w-56 flex-1 flex-col gap-1.5">
            <span className="label-mono text-muted-foreground">Label</span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="ci-deploy"
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-brand"
            />
          </label>
          <Button type="submit" size="sm" className="gap-1.5" disabled={createKey.isPending}>
            <Plus className="h-3.5 w-3.5" />
            {createKey.isPending ? 'Creating…' : 'Create key'}
          </Button>
        </form>
      </Panel>

      <ResourceTable
        rows={rows}
        columns={columns}
        initialSort={{ key: 'label', dir: 'asc' }}
        searchKeys={['label', 'prefix']}
        searchPlaceholder="Filter by label…"
        emptyMessage="No API keys yet."
        minWidth="min-w-[820px]"
        loading={isPending}
        error={error}
        onRetry={() => void refetch()}
      />
    </div>
  );
}
