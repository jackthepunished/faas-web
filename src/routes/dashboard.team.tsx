import { useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { PageHeader, Panel } from '@/components/dashboard/primitives';
import { Pill, ResourceTable, type Column } from '@/components/dashboard/resource-table';
import { useOrgInvitations, useOrgMembers, useOrgs } from '@/lib/api/queries';
import { consoleHead } from '@/lib/seo';

export const Route = createFileRoute('/dashboard/team')({
  component: TeamPage,
  head: () => consoleHead('team'),
});

/**
 * Organisation members and invitations, from `/v1/orgs/*`.
 *
 * Orgs are the API's only real grouping — there is no "project". An account may
 * belong to several, so the page picks one rather than assuming a single
 * workspace, and members are scoped to the selected org.
 *
 * Role is the field that matters: it is what gates every write elsewhere in the
 * console, so a `viewer` seeing a disabled button should be able to find out why
 * here.
 */
interface MemberRow {
  id: string;
  email: string;
  role: string;
  joinedAt: string;
}

interface InviteRow {
  id: string;
  email: string;
  role: string;
  status: string;
}

const ROLE_COLOR: Record<string, string> = {
  owner: 'var(--brand)',
  admin: 'var(--status-good)',
  billing: 'var(--status-warning)',
};

function formatWhen(value: string | undefined): string {
  if (!value) return '—';
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? '—' : new Date(ms).toLocaleDateString();
}

function TeamPage() {
  const orgs = useOrgs();
  const [slug, setSlug] = useState('');

  // Settle on the first org once the list lands; most accounts have exactly one.
  const active = slug || orgs.data?.orgs?.[0]?.slug || '';

  const members = useOrgMembers(active);
  const invitations = useOrgInvitations(active);

  const memberRows = useMemo<MemberRow[]>(
    () =>
      (members.data?.members ?? []).map((m) => ({
        id: m.account_id,
        email: m.email,
        role: m.role,
        joinedAt: m.joined_at,
      })),
    [members.data]
  );

  const inviteRows = useMemo<InviteRow[]>(
    () =>
      (invitations.data?.invitations ?? []).map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        status: i.status,
      })),
    [invitations.data]
  );

  const memberColumns: Column<MemberRow>[] = [
    { key: 'email', label: 'Member' },
    {
      key: 'role',
      label: 'Role',
      width: 'w-36',
      render: (m) => <Pill label={m.role} color={ROLE_COLOR[m.role]} />,
    },
    {
      key: 'joinedAt',
      label: 'Joined',
      numeric: true,
      render: (m) => (
        <span className="text-xs text-muted-foreground">{formatWhen(m.joinedAt)}</span>
      ),
    },
  ];

  const inviteColumns: Column<InviteRow>[] = [
    { key: 'email', label: 'Invited' },
    { key: 'role', label: 'Role', width: 'w-36', render: (i) => <Pill label={i.role} /> },
    { key: 'status', label: 'Status', width: 'w-32', render: (i) => <Pill label={i.status} /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Team"
        description="Organisation members and their roles. Roles decide who can write what across the console."
        actions={
          <label className="flex items-center gap-2">
            <span className="label-mono text-muted-foreground">Org</span>
            <select
              value={active}
              onChange={(e) => setSlug(e.target.value)}
              aria-label="Select an organisation"
              className="h-9 rounded-md border border-border bg-card px-2.5 text-sm outline-none focus:border-brand/50"
            >
              {(orgs.data?.orgs ?? []).length === 0 && <option value="">No organisations</option>}
              {(orgs.data?.orgs ?? []).map((o) => (
                <option key={o.slug} value={o.slug}>
                  {o.slug}
                </option>
              ))}
            </select>
          </label>
        }
      />

      <Panel title="Members">
        <ResourceTable
          rows={memberRows}
          columns={memberColumns}
          initialSort={{ key: 'email', dir: 'asc' }}
          searchKeys={['email', 'role']}
          searchPlaceholder="Filter by email…"
          emptyMessage={active ? 'No members yet.' : 'No organisations on this account.'}
          minWidth="min-w-[700px]"
          loading={orgs.isPending || members.isPending}
          error={members.error}
          onRetry={() => void members.refetch()}
        />
      </Panel>

      <Panel title="Pending invitations">
        <ResourceTable
          rows={inviteRows}
          columns={inviteColumns}
          emptyMessage="No pending invitations."
          minWidth="min-w-[560px]"
          loading={orgs.isPending || invitations.isPending}
          error={invitations.error}
          onRetry={() => void invitations.refetch()}
        />
      </Panel>
    </div>
  );
}
