import { describe, expect, it } from 'vitest';
import { queryPhase } from './primitives';
import { ApiError } from '@/lib/api/errors';

/**
 * The precedence these assertions pin down is the whole point of `queryPhase`:
 * every panel used to re-derive it inline, and the ones that got it wrong
 * showed an outage as an empty account.
 */
describe('queryPhase', () => {
  it('reports a failed read over anything else', () => {
    expect(queryPhase({ error: new Error('boom'), loading: true, isEmpty: true })).toBe('error');
  });

  it('reports an in-flight read as loading, not empty', () => {
    // The trap: a list is legitimately empty while its request is still out.
    expect(queryPhase({ loading: true, isEmpty: true })).toBe('loading');
  });

  it('separates an unreachable API from a server-side failure', () => {
    // Synthesised code — nothing parseable came back, so no part of the API spoke.
    const gateway = new ApiError({ status: 502, code: 'http_502', title: 'Bad Gateway' });
    expect(queryPhase({ error: gateway })).toBe('unreachable');

    // A real problem+json: the API answered, and it answered with a fault.
    const authored = new ApiError({ status: 500, code: 'internal_error', title: 'Internal error' });
    expect(queryPhase({ error: authored })).toBe('error');
  });

  it('reports empty only once a read has landed with nothing in it', () => {
    expect(queryPhase({ isEmpty: true })).toBe('empty');
    expect(queryPhase({ isEmpty: false })).toBe('ready');
    expect(queryPhase({})).toBe('ready');
  });
});
