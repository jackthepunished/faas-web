import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { DataProvider, useData } from './store';

const wrapper = ({ children }: { children: ReactNode }) => <DataProvider>{children}</DataProvider>;
const setup = () => renderHook(() => useData(), { wrapper });

const NEW_WORKFLOW = {
  name: 'resize-images',
  projectId: 'proj_storefront',
  runtime: 'node22' as const,
  memoryMb: 512,
  region: 'fra-metal-1',
  source: 'github',
};

describe('useData', () => {
  it('throws a named error outside the provider, rather than a null deref', () => {
    expect(() => renderHook(() => useData())).toThrow(/DataProvider/);
  });

  it('seeds from the fixtures', () => {
    const { result } = setup();
    expect(result.current.workflows.length).toBeGreaterThan(0);
    expect(result.current.deployments.length).toBeGreaterThan(0);
  });
});

describe('addWorkflow', () => {
  it('prepends the new workflow so it is visible without scrolling', () => {
    const { result } = setup();
    act(() => {
      result.current.addWorkflow(NEW_WORKFLOW);
    });
    expect(result.current.workflows[0].name).toBe('resize-images');
  });

  it('starts with no traffic history, because it has served nothing yet', () => {
    const { result } = setup();
    let id = '';
    act(() => {
      id = result.current.addWorkflow(NEW_WORKFLOW).id;
    });

    const created = result.current.getWorkflow(id)!;
    expect(created).toMatchObject({
      state: 'running',
      version: 'v0.1.0',
      invocations24h: 0,
      avgDurationMs: 0,
      errorRatePct: 0,
    });
  });

  it('records an initial deployment for it', () => {
    const { result } = setup();
    let id = '';
    act(() => {
      id = result.current.addWorkflow(NEW_WORKFLOW).id;
    });

    const deployments = result.current.deploymentsFor(id);
    expect(deployments).toHaveLength(1);
    expect(deployments[0]).toMatchObject({ version: 'v0.1.0', state: 'succeeded' });
  });

  it('files it under the project it was created in', () => {
    const { result } = setup();
    act(() => {
      result.current.addWorkflow(NEW_WORKFLOW);
    });
    const forProject = result.current.workflowsForProject('proj_storefront');
    expect(forProject.some((w) => w.name === 'resize-images')).toBe(true);
  });

  it('derives a stable id from the name', () => {
    const a = setup();
    let first = '';
    act(() => {
      first = a.result.current.addWorkflow(NEW_WORKFLOW).id;
    });

    const b = setup();
    let second = '';
    act(() => {
      second = b.result.current.addWorkflow(NEW_WORKFLOW).id;
    });

    expect(first).toBe(second);
  });
});

describe('redeploy', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('flips to deploying immediately and settles back to running', () => {
    const { result } = setup();
    const target = result.current.workflows[0];

    act(() => {
      result.current.redeploy(target.id);
    });
    expect(result.current.getWorkflow(target.id)!.state).toBe('deploying');

    act(() => {
      vi.runAllTimers();
    });
    expect(result.current.getWorkflow(target.id)!.state).toBe('running');
  });

  it('bumps the patch version when it lands', () => {
    const { result } = setup();
    const target = result.current.workflows[0];
    const [major, minor, patch] = target.version.replace(/^v/, '').split('.').map(Number);

    act(() => {
      result.current.redeploy(target.id);
      vi.runAllTimers();
    });

    expect(result.current.getWorkflow(target.id)!.version).toBe(`v${major}.${minor}.${patch + 1}`);
  });

  it('does not bump the version until the deploy lands', () => {
    const { result } = setup();
    const target = result.current.workflows[0];

    act(() => {
      result.current.redeploy(target.id);
    });
    expect(result.current.getWorkflow(target.id)!.version).toBe(target.version);
  });

  it('records a new deployment at the top of that workflow history', () => {
    const { result } = setup();
    const target = result.current.workflows[0];
    const before = result.current.deploymentsFor(target.id).length;

    act(() => {
      result.current.redeploy(target.id);
      vi.runAllTimers();
    });

    const after = result.current.deploymentsFor(target.id);
    expect(after).toHaveLength(before + 1);
    expect(after[0].message).toMatch(/redeploy/i);
  });

  it('ignores an id that does not exist instead of throwing on the timer', () => {
    const { result } = setup();
    expect(() => {
      act(() => {
        result.current.redeploy('fn_does_not_exist');
        vi.runAllTimers();
      });
    }).not.toThrow();
  });

  it('does not set state after the provider unmounts', () => {
    const { result, unmount } = setup();
    const target = result.current.workflows[0];

    act(() => {
      result.current.redeploy(target.id);
    });
    unmount();

    // A pending timer that outlived its provider would warn or throw here.
    expect(() => {
      act(() => {
        vi.runAllTimers();
      });
    }).not.toThrow();
  });
});
