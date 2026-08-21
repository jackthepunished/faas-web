import { useRef, useState } from 'react';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { WarningTriangle, ArrowRight, RefreshDouble } from 'iconoir-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import { PageHeader, Panel } from '@/components/dashboard/primitives';
import { clearWorkspace, readWorkspace, useAuth } from '@/lib/auth';
import { useFocusTrap } from '@/lib/use-focus-trap';
import { consoleHead } from '@/lib/seo';

export const Route = createFileRoute('/dashboard/settings')({
  head: () => consoleHead('settings'),
  component: SettingsPage,
});

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
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      onKeyDown={(e) => e.key === 'Escape' && onCancel()}
    >
      <button
        aria-hidden="true"
        tabIndex={-1}
        onClick={onCancel}
        className="absolute inset-0 bg-mint-12/50 backdrop-blur-sm"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-title"
        className="relative w-full max-w-md rounded-xl border border-border bg-popover p-6 shadow-2xl"
      >
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{ background: 'color-mix(in oklab, var(--status-critical) 18%, transparent)' }}
        >
          <WarningTriangle className="h-4 w-4" style={{ color: 'var(--status-critical)' }} />
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
  const [workspace, setWorkspace] = useState(readWorkspace);
  const [region, setRegion] = useState('fra-metal-1');
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 700));
    setSaving(false);
    toast({ kind: 'success', title: 'Settings saved', description: `${workspace} · ${region}` });
  };

  // Local reset only. Real account deletion is `DELETE /v1/account` — it stages
  // a 30-day grace period and is restorable — but wiring a destructive endpoint
  // to this button needs its own decision, not a drive-by. Until then the copy
  // says what actually happens rather than implying the account is gone.
  const handleDelete = () => {
    setShowDelete(false);
    clearWorkspace();
    void signOut();
    toast({
      kind: 'info',
      title: 'Local workspace settings cleared',
      description: 'You have been signed out. Your account was not deleted.',
    });
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
            {saving && <RefreshDouble className="h-3.5 w-3.5 animate-spin" />}
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </Panel>

      <Panel title="Runtime behavior">
        <ul className="flex flex-col divide-y divide-border">
          {TOGGLES.map((t) => (
            <li
              key={t.id}
              className="flex items-start justify-between gap-6 py-4 first:pt-0 last:pb-0"
            >
              <div>
                <p className="text-sm font-medium">{t.label}</p>
                <p className="mt-1 max-w-lg text-xs leading-relaxed text-muted-foreground">
                  {t.description}
                </p>
              </div>
              <Switch
                checked={toggles[t.id]}
                onCheckedChange={(on) => setToggles((prev) => ({ ...prev, [t.id]: on }))}
                aria-label={t.label}
                className="mt-1 data-[state=checked]:bg-brand"
              />
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="API keys" description="Used by the CLI and the deployment API">
        <p className="text-sm text-muted-foreground">
          API keys are managed on the Keys page, alongside their scopes and last-used times.
        </p>
        <Link
          to="/dashboard/keys"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
        >
          Manage API keys
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
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
