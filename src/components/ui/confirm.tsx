import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Button } from './button';
import { Modal } from './modal';

/**
 * One confirm dialog for the whole console, asked for as a promise.
 *
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: 'Delete DATABASE_URL?', destructive: true }))) return;
 *
 * Before this, confirmation existed in exactly two places — the plan switch
 * and the workspace delete — and every other destructive action fired on the
 * first click: secrets, env vars, domains, crons, alerts, edge rules, key
 * revoke and rotate, session revoke, sign-out-everywhere, rollback, replay. A
 * secret is unrecoverable and a revoked key breaks CI instantly; none of them
 * should be one misclick away. The `ConfirmDialog` in modal.tsx was the
 * intended fix and nothing ever imported it, because wiring open/close state
 * into every row is the part people skip. A promise has no state to wire.
 */

export interface ConfirmOptions {
  title: string;
  /** What actually happens — consequences, not a restatement of the title. */
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
}

type Ask = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Ask | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const settle = useCallback((ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setPending(null);
  }, []);

  const ask = useCallback<Ask>(
    (options) =>
      new Promise((resolve) => {
        // A second ask while one is open answers the first with "no" rather
        // than stacking dialogs; the caller that lost is the one that raced.
        resolver.current?.(false);
        resolver.current = resolve;
        setPending(options);
      }),
    []
  );

  const value = useMemo(() => ask, [ask]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Modal
        open={pending !== null}
        onClose={() => settle(false)}
        title={pending?.title ?? ''}
        description={pending?.description}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => settle(false)}>
              Cancel
            </Button>
            <Button
              variant={pending?.destructive ? 'destructive' : 'default'}
              size="sm"
              autoFocus
              onClick={() => settle(true)}
            >
              {pending?.confirmLabel ?? 'Confirm'}
            </Button>
          </>
        }
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): Ask {
  const ask = useContext(ConfirmContext);
  if (!ask) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return ask;
}
