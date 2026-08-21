import { useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader, Panel } from '@/components/dashboard/primitives';
import { ResourceTable, type Column } from '@/components/dashboard/resource-table';
import { AppScope, AppSelect, useSelectedApp } from '@/components/dashboard/app-select';
import { useToast } from '@/components/ui/toast';
import { useAppEnv, useDeleteEnv, useSetEnv } from '@/lib/api/queries';
import { errorMessage } from '@/lib/api/errors';
import { consoleHead } from '@/lib/seo';

export const Route = createFileRoute('/dashboard/env')({
  component: EnvPage,
  head: () => consoleHead('env'),
});

/**
 * Plain environment variables, from `/v1/apps/{slug}/env`.
 *
 * Note that the API does **not** echo values here either — a row is a key, a
 * scope, and timestamps. The difference from Secrets is not readability, it is
 * that a secret is sealed so the server itself cannot read it, while an env var
 * is stored plainly and injected as-is. Credentials still belong in Secrets.
 *
 * Because values never come back, editing is write-only: submitting a name that
 * already exists overwrites it.
 */
interface EnvRow {
  id: string;
  key: string;
  scope: string;
  updatedAt: string;
}

function formatWhen(value: string | undefined): string {
  if (!value) return '—';
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? '—' : new Date(ms).toLocaleString();
}

function EnvPage() {
  const { toast } = useToast();
  const appState = useSelectedApp();
  const { slug, select, apps } = appState;
  const { data, isPending, error, refetch } = useAppEnv(slug);
  const setEnv = useSetEnv(slug);
  const deleteEnv = useDeleteEnv(slug);

  const [key, setKey] = useState('');
  const [value, setValue] = useState('');

  const rows = useMemo<EnvRow[]>(
    () =>
      (data?.env ?? []).map((v) => ({
        id: v.key,
        key: v.key,
        scope: v.scope,
        updatedAt: v.updated_at,
      })),
    [data]
  );

  const columns: Column<EnvRow>[] = [
    {
      key: 'key',
      label: 'Name',
      render: (v) => <span className="font-mono text-xs">{v.key}</span>,
    },
    {
      key: 'scope',
      label: 'Scope',
      width: 'w-32',
      render: (v) => <span className="text-xs text-muted-foreground">{v.scope || '—'}</span>,
    },
    {
      key: 'updatedAt',
      label: 'Updated',
      numeric: true,
      render: (v) => (
        <span className="text-xs text-muted-foreground">{formatWhen(v.updatedAt)}</span>
      ),
    },
    {
      key: 'id',
      label: '',
      width: 'w-12',
      render: (v) => (
        <button
          type="button"
          aria-label={`Delete variable ${v.key}`}
          onClick={() => {
            void deleteEnv
              .mutateAsync(v.key)
              .then(() => toast({ kind: 'success', title: `Deleted ${v.key}` }))
              .catch((err: unknown) =>
                toast({ kind: 'error', title: 'Could not delete', description: errorMessage(err) })
              );
          }}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Env Vars"
        description={
          data
            ? `Plain configuration injected at boot. ${data.count} of ${data.quota_max} used. Values are write-only; credentials belong in Secrets.`
            : 'Plain configuration injected at boot. Values are write-only; credentials belong in Secrets.'
        }
        actions={<AppSelect slug={slug} onSelect={select} apps={apps} />}
      />

      <AppScope state={appState} resource="environment variables">
        <Panel title="Set a variable">
          <form
            className="flex flex-wrap items-end gap-3 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!key.trim() || setEnv.isPending) return;
              void setEnv
                .mutateAsync({ key: key.trim(), value })
                .then(() => {
                  setKey('');
                  setValue('');
                  toast({ kind: 'success', title: 'Variable saved' });
                })
                .catch((err: unknown) =>
                  toast({ kind: 'error', title: 'Could not save', description: errorMessage(err) })
                );
            }}
          >
            <label className="flex min-w-44 flex-1 flex-col gap-1.5">
              <span className="label-mono text-muted-foreground">Name</span>
              <input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="LOG_LEVEL"
                className="h-10 rounded-lg border border-border bg-background px-3 font-mono text-sm outline-none focus:border-brand"
              />
            </label>
            <label className="flex min-w-56 flex-[2] flex-col gap-1.5">
              <span className="label-mono text-muted-foreground">Value</span>
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="debug"
                className="h-10 rounded-lg border border-border bg-background px-3 font-mono text-sm outline-none focus:border-brand"
              />
            </label>
            <Button
              type="submit"
              size="sm"
              className="gap-1.5"
              disabled={setEnv.isPending || !slug}
            >
              <Plus className="h-3.5 w-3.5" />
              {setEnv.isPending ? 'Saving…' : 'Save variable'}
            </Button>
          </form>
        </Panel>

        <ResourceTable
          rows={rows}
          columns={columns}
          initialSort={{ key: 'key', dir: 'asc' }}
          searchKeys={['key', 'scope']}
          searchPlaceholder="Filter by name…"
          emptyMessage={`No variables set for ${slug}.`}
          minWidth="min-w-[720px]"
          loading={isPending}
          error={error}
          onRetry={() => void refetch()}
        />
      </AppScope>
    </div>
  );
}
