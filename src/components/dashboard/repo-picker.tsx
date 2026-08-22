import { useEffect, useMemo, useState } from 'react';
import { Github, Lock, Refresh, Search } from 'iconoir-react';
import { Button } from '@/components/ui/button';
import { ApiError, errorMessage } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth';
import { useInstallableRepos, type InstallableRepo } from '@/lib/api/queries';
import { Skeleton } from './primitives';
import { cn } from '@/lib/utils';

/**
 * Choose a repository from the account's GitHub App installation.
 *
 * The console used to ask people to type `owner/repo` into a text field and
 * hope. The API can list what the installation actually sees, and its
 * refusals are specific enough to be worth telling apart:
 *
 * - `github_login_required` — the GitHub sign-in was never completed
 * - `forged` — the installation belongs to someone else; a security signal,
 *   not something to retry
 * - `github_unreachable` / `githubd_not_ready` — transient, retry
 *
 * `account.github_install_id` is null until `gregale connect` has run, which
 * is the fifth state and the most common one on a new account.
 */

export interface RepoChoice {
  repo: string;
  branch: string;
  installationId: number;
}

export function RepoPicker({
  value,
  onChange,
  className,
}: {
  value: RepoChoice | null;
  onChange: (choice: RepoChoice | null) => void;
  className?: string;
}) {
  const { account } = useAuth();
  const installationId = Number(account?.github_install_id ?? 0);
  const list = useInstallableRepos();
  const [query, setQuery] = useState('');

  // `list` is a mutation because it is a POST that reaches GitHub; fire it
  // once when there is an installation to ask about.
  const { mutate } = list;
  useEffect(() => {
    if (installationId) mutate(installationId);
  }, [installationId, mutate]);

  const repos = useMemo(() => {
    const all: InstallableRepo[] = list.data ?? [];
    const q = query.trim().toLowerCase();
    return q ? all.filter((r) => r.full_name.toLowerCase().includes(q)) : all;
  }, [list.data, query]);

  if (!installationId) {
    return (
      <div className={cn('rounded-lg border border-border bg-card p-4', className)}>
        <p className="flex items-center gap-2 text-sm font-medium">
          <Github className="h-4 w-4" />
          GitHub is not connected
        </p>
        <p className="mt-1.5 max-w-lg text-xs leading-relaxed text-muted-foreground">
          Run <span className="font-mono text-foreground">gregale connect</span> once on a
          workstation to install the GitHub App. After that this list fills in and pushes can deploy
          on their own.
        </p>
      </div>
    );
  }

  const error = list.error;
  if (error) {
    const code = error instanceof ApiError ? error.code : '';
    const permanent = code === 'forged' || code === 'github_login_required';
    return (
      <div
        role="alert"
        className={cn('rounded-lg border border-border bg-card p-4', className)}
        style={
          permanent
            ? { borderColor: 'color-mix(in oklab, var(--status-critical) 35%, transparent)' }
            : undefined
        }
      >
        <p className="text-sm font-medium">
          {code === 'forged'
            ? 'That installation belongs to another GitHub account'
            : code === 'github_login_required'
              ? 'Finish signing in with GitHub'
              : 'Could not reach GitHub'}
        </p>
        <p className="mt-1.5 max-w-lg text-xs leading-relaxed text-muted-foreground">
          {errorMessage(error)}
        </p>
        {!permanent && (
          <Button
            size="sm"
            variant="outline"
            className="mt-3 gap-1.5"
            disabled={list.isPending}
            onClick={() => list.mutate(installationId)}
          >
            <Refresh className="h-3.5 w-3.5" />
            {list.isPending ? 'Retrying…' : 'Try again'}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label className="relative flex items-center">
        <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter repositories…"
          aria-label="Filter repositories"
          className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-brand/50"
        />
      </label>

      <div className="max-h-56 overflow-y-auto rounded-md border border-border">
        {list.isPending ? (
          <div className="flex flex-col gap-2 p-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-4 w-2/3" />
            ))}
          </div>
        ) : repos.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground">
            {query
              ? 'No repository matches that.'
              : 'The installation can see no repositories. Grant it access on GitHub.'}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {repos.map((repo) => {
              const selected = value?.repo === repo.full_name;
              return (
                <li key={repo.id}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      onChange(
                        selected
                          ? null
                          : {
                              repo: repo.full_name,
                              branch: repo.default_branch,
                              installationId,
                            }
                      )
                    }
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2 text-left transition-colors',
                      selected ? 'bg-brand/10' : 'hover:bg-muted'
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate font-mono text-xs">
                      {repo.full_name}
                    </span>
                    {repo.private && (
                      <Lock
                        aria-label="Private"
                        className="h-3 w-3 shrink-0 text-muted-foreground"
                      />
                    )}
                    <span className="label-mono shrink-0 text-muted-foreground">
                      {repo.default_branch}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {value && (
        <label className="flex items-center gap-2">
          <span className="label-mono text-muted-foreground">Branch</span>
          <input
            value={value.branch}
            onChange={(e) => onChange({ ...value, branch: e.target.value })}
            spellCheck={false}
            aria-label="Production branch"
            className="h-8 w-44 rounded-md border border-border bg-background px-2.5 font-mono text-xs outline-none focus:border-brand/50"
          />
          <span className="text-xs text-muted-foreground">Pushes here deploy.</span>
        </label>
      )}
    </div>
  );
}
