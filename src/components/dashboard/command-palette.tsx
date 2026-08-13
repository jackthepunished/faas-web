import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { CornerDownLeft, GitBranch, Plus, Search } from 'lucide-react';
import { NAV_ITEMS } from './nav-config';
import { useData } from '@/lib/store';
import { formatCompact } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

/**
 * ⌘K command palette. Navigation, every function by name, and the actions
 * that were previously only reachable by hunting through pages.
 */

interface Command {
  id: string;
  label: string;
  group: string;
  hint?: string;
  icon: typeof Search;
  run: () => void;
}

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const { workflows } = useData();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);

  const close = () => onOpenChange(false);

  const commands = useMemo<Command[]>(() => {
    const go = (to: string) => () => {
      close();
      navigate({ to });
    };

    return [
      // Driven by the nav config, so a new page becomes reachable by ⌘K the
      // moment it appears in the sidebar.
      ...NAV_ITEMS.map((item) => ({
        id: `nav-${item.to}`,
        label: item.label,
        group: 'Go to',
        icon: item.icon,
        run: go(item.to),
      })),
      {
        id: 'act-new',
        label: 'Deploy a new workflow',
        group: 'Actions',
        icon: Plus,
        run: go('/dashboard/workflows/new'),
      },
      ...workflows.map((fn) => ({
        id: fn.id,
        label: fn.name,
        group: 'Workflows',
        hint: `${formatCompact(fn.invocations24h)} calls · ${fn.runtime}`,
        icon: GitBranch,
        run: () => {
          close();
          navigate({
            to: '/dashboard/workflows/$workflowId',
            params: { workflowId: fn.id },
          });
        },
      })),
    ];
    // `close` and `navigate` are stable enough for this list's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflows, navigate]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) => c.label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q)
    );
  }, [commands, query]);

  // Keep the highlight in range as the result set shrinks.
  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    if (!open) return;

    restoreFocus.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Focus after paint, or the input is not yet mounted.
    const id = requestAnimationFrame(() => inputRef.current?.focus());

    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = previousOverflow;
      restoreFocus.current?.focus?.();
      setQuery('');
    };
  }, [open]);

  // Keep the highlighted row visible while arrowing through a long list.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  if (!open) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (results.length ? (i + 1) % results.length : 0));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      results[active]?.run();
    }
  };

  // Group headers are rendered inline, so track when the group changes.
  let lastGroup = '';

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center p-4 pt-[12vh]">
      <button
        aria-label="Close command palette"
        tabIndex={-1}
        onClick={close}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={onKeyDown}
        className="relative w-full max-w-lg overflow-hidden rounded-xl border border-border bg-popover shadow-2xl"
      >
        <div className="flex items-center gap-2.5 border-b border-border px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search workflows, jump to a page, run an action…"
            aria-label="Search commands"
            aria-activedescendant={results[active] ? `cmd-${results[active].id}` : undefined}
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="label-mono rounded border border-border px-1.5 py-0.5 text-muted-foreground">
            esc
          </kbd>
        </div>

        {results.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            No matches for “{query}”.
          </p>
        ) : (
          <ul ref={listRef} role="listbox" aria-label="Results" className="max-h-80 overflow-y-auto p-2">
            {results.map((cmd, i) => {
              const Icon = cmd.icon;
              const newGroup = cmd.group !== lastGroup;
              lastGroup = cmd.group;
              return (
                <li key={cmd.id}>
                  {newGroup && (
                    <p className="label-mono px-2 pb-1.5 pt-3 text-muted-foreground/70 first:pt-1">
                      {cmd.group}
                    </p>
                  )}
                  <div
                    id={`cmd-${cmd.id}`}
                    role="option"
                    aria-selected={i === active}
                    data-active={i === active}
                    onMouseMove={() => setActive(i)}
                    onClick={cmd.run}
                    className={cn(
                      'flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm',
                      i === active ? 'bg-muted text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1 truncate">{cmd.label}</span>
                    {cmd.hint && (
                      <span className="shrink-0 text-xs text-muted-foreground">{cmd.hint}</span>
                    )}
                    {i === active && <CornerDownLeft className="h-3 w-3 shrink-0" />}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
