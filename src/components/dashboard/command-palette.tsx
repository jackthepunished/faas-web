import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CornerDownLeft, GitBranch, Plus, Search } from 'lucide-react';
import { NAV_ITEMS } from './nav-config';
import { EASE } from './motion';
import { useData } from '@/lib/store';
import { formatCompact } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { useFocusTrap } from '@/lib/use-focus-trap';

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
  const reduce = useReducedMotion();

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);
  useFocusTrap(dialogRef, open);

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
  }, [workflows, navigate, close]);

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

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Focus after paint, or the input is not yet mounted. (The trap restores
    // focus to the opener on close.)
    const id = requestAnimationFrame(() => inputRef.current?.focus());

    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = previousOverflow;
      setQuery('');
    };
  }, [open]);

  // Keep the highlighted row visible while arrowing through a long list.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

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

  // The dialog mounts the instant `open` flips (so the focus trap and the
  // input focus find it) and lingers only for its short exit.
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center p-4 pt-[12vh]">
          <motion.button
            aria-label="Close command palette"
            tabIndex={-1}
            onClick={close}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.12 } }}
            transition={{ duration: reduce ? 0 : 0.15 }}
            className="absolute inset-0 bg-mint-12/50 backdrop-blur-sm"
          />

          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            onKeyDown={onKeyDown}
            initial={reduce ? false : { opacity: 0, scale: 0.98, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={
              reduce
                ? { opacity: 0, transition: { duration: 0 } }
                : {
                    opacity: 0,
                    scale: 0.98,
                    y: -6,
                    transition: { duration: 0.12, ease: EASE },
                  }
            }
            transition={{ duration: reduce ? 0 : 0.18, ease: EASE }}
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
                role="combobox"
                aria-expanded={results.length > 0}
                aria-controls={listId}
                aria-autocomplete="list"
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
              <ul
                ref={listRef}
                id={listId}
                role="listbox"
                aria-label="Results"
                className="max-h-80 overflow-y-auto p-2"
              >
                {results.map((cmd, i) => {
                  const Icon = cmd.icon;
                  const newGroup = cmd.group !== lastGroup;
                  lastGroup = cmd.group;
                  return [
                    newGroup && (
                      <li
                        key={`group-${cmd.group}`}
                        role="presentation"
                        className="label-mono px-2 pb-1.5 pt-3 text-muted-foreground/70 first:pt-1"
                      >
                        {cmd.group}
                      </li>
                    ),
                    <li
                      key={cmd.id}
                      id={`cmd-${cmd.id}`}
                      role="option"
                      aria-selected={i === active}
                      data-active={i === active}
                      onMouseMove={() => setActive(i)}
                      onClick={cmd.run}
                      className={cn(
                        'relative isolate flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors',
                        i === active
                          ? cn('text-foreground', reduce && 'bg-muted')
                          : 'text-muted-foreground'
                      )}
                    >
                      {/* One highlight slides between options rather than each
                      row lighting up on its own. */}
                      {i === active && !reduce && (
                        <motion.span
                          aria-hidden="true"
                          layoutId="palette-active"
                          className="absolute inset-0 -z-10 rounded-md bg-muted"
                          transition={{
                            type: 'spring',
                            stiffness: 500,
                            damping: 40,
                          }}
                        />
                      )}
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="flex-1 truncate">{cmd.label}</span>
                      {cmd.hint && (
                        <span className="shrink-0 text-xs text-muted-foreground">{cmd.hint}</span>
                      )}
                      {i === active && <CornerDownLeft className="h-3 w-3 shrink-0" />}
                    </li>,
                  ];
                })}
              </ul>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
