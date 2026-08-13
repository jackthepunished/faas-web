import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  DEPLOYMENTS,
  WORKFLOWS,
  NOW,
  type Deployment,
  type Workflow,
  type Runtime,
} from './mock-data';

/**
 * In-memory workspace store.
 *
 * `mock-data` supplies the seeded starting fixtures; everything the user
 * creates during a session lives here so the app behaves like it persists.
 * State resets on reload by design — swap this provider for real queries and
 * the consuming components stay as they are.
 */

export interface NewWorkflowInput {
  name: string;
  projectId: string;
  runtime: Runtime;
  memoryMb: number;
  region: string;
  source: string;
}

interface DataValue {
  workflows: Workflow[];
  deployments: Deployment[];
  getWorkflow: (id: string) => Workflow | undefined;
  deploymentsFor: (id: string) => Deployment[];
  workflowsForProject: (projectId: string) => Workflow[];
  addWorkflow: (input: NewWorkflowInput) => Workflow;
  /** Flips the function to `deploying`, then back to `running` when it lands. */
  redeploy: (id: string) => void;
}

const DataContext = createContext<DataValue | null>(null);

function bumpPatch(version: string): string {
  const [major, minor, patch] = version.replace(/^v/, '').split('.');
  return `v${major}.${minor}.${Number(patch ?? 0) + 1}`;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [workflows, setFunctions] = useState<Workflow[]>(WORKFLOWS);
  const [deployments, setDeployments] = useState<Deployment[]>(DEPLOYMENTS);

  const addWorkflow = useCallback((input: NewWorkflowInput) => {
    const id = `fn_${input.name.replace(/-/g, '_')}_${Math.abs(hash(input.name))}`;
    const created: Workflow = {
      id,
      projectId: input.projectId,
      name: input.name,
      runtime: input.runtime,
      memoryMb: input.memoryMb,
      state: 'running',
      region: input.region,
      url: `https://${input.name}.gregale.run`,
      // A function that just went live has no traffic history yet.
      invocations24h: 0,
      avgDurationMs: 0,
      coldStartP50Ms: 0,
      errorRatePct: 0,
      lastDeployedAt: Date.now(),
      version: 'v0.1.0',
    };

    const deployment: Deployment = {
      id: `dep_${id}_0`,
      workflowId: id,
      version: 'v0.1.0',
      state: 'succeeded',
      commit: Math.abs(hash(input.name + input.region))
        .toString(16)
        .padStart(7, '0')
        .slice(0, 7),
      message: `Initial deploy from ${input.source}`,
      author: 'you',
      createdAt: Date.now(),
      durationMs: 8200,
    };

    setFunctions((prev) => [created, ...prev]);
    setDeployments((prev) => [deployment, ...prev]);
    return created;
  }, []);

  const redeploy = useCallback((id: string) => {
    setFunctions((prev) =>
      prev.map((fn) => (fn.id === id ? { ...fn, state: 'deploying' as const } : fn))
    );

    setTimeout(() => {
      setFunctions((prev) =>
        prev.map((fn) =>
          fn.id === id
            ? {
                ...fn,
                state: 'running' as const,
                version: bumpPatch(fn.version),
                lastDeployedAt: Date.now(),
              }
            : fn
        )
      );
      setDeployments((prev) => {
        const fn = workflows.find((f) => f.id === id);
        if (!fn) return prev;
        return [
          {
            id: `dep_${id}_${prev.length}`,
            workflowId: id,
            version: bumpPatch(fn.version),
            state: 'succeeded' as const,
            commit: Math.abs(hash(id + prev.length))
              .toString(16)
              .padStart(7, '0')
              .slice(0, 7),
            message: 'Manual redeploy from the dashboard',
            author: 'you',
            createdAt: Date.now(),
            durationMs: 8200,
          },
          ...prev,
        ];
      });
    }, 8200);
  }, [workflows]);

  const value = useMemo<DataValue>(
    () => ({
      workflows,
      deployments,
      getWorkflow: (id) => workflows.find((f) => f.id === id),
      deploymentsFor: (id) => deployments.filter((d) => d.workflowId === id),
      workflowsForProject: (projectId) => workflows.filter((f) => f.projectId === projectId),
      addWorkflow,
      redeploy,
    }),
    [workflows, deployments, addWorkflow, redeploy]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside <DataProvider>');
  return ctx;
}

/** Small deterministic string hash, for stable generated ids and commit shas. */
function hash(input: string | number): number {
  const s = String(input);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h | 0;
}

export { NOW };
