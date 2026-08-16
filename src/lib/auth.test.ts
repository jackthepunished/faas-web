import { describe, expect, it } from 'vitest';
import {
  clearWorkspace,
  DEFAULT_WORKSPACE,
  hasOnboarded,
  isValidEmail,
  markOnboarded,
  readSession,
  readWorkspace,
  saveWorkspace,
} from './auth';

describe('isValidEmail', () => {
  it('accepts ordinary addresses', () => {
    for (const email of ['a@b.co', 'first.last@example.com', 'dev+tag@sub.example.org']) {
      expect(isValidEmail(email), email).toBe(true);
    }
  });

  it('rejects malformed ones', () => {
    for (const email of [
      '',
      'nope',
      'no@domain',
      'no-at.example.com',
      'two@@example.com',
      'a b@c.co',
    ]) {
      expect(isValidEmail(email), email).toBe(false);
    }
  });
});

describe('session storage', () => {
  it('reads no session when nothing is stored', () => {
    expect(readSession()).toBeNull();
  });

  it('survives a corrupt payload instead of throwing into the route guard', () => {
    // `readSession` runs in `beforeLoad`; if it throws, every guarded route
    // fails to load rather than simply treating the user as signed out.
    window.localStorage.setItem('gregale.session', '{not json');
    expect(() => readSession()).not.toThrow();
    expect(readSession()).toBeNull();
  });
});

describe('onboarding flag', () => {
  it('defaults to false and flips once marked', () => {
    expect(hasOnboarded()).toBe(false);
    markOnboarded();
    expect(hasOnboarded()).toBe(true);
  });
});

describe('workspace', () => {
  it('falls back to the default when unset', () => {
    expect(readWorkspace()).toBe(DEFAULT_WORKSPACE);
  });

  it('round-trips a saved slug and returns to the default when cleared', () => {
    saveWorkspace('my-team');
    expect(readWorkspace()).toBe('my-team');
    clearWorkspace();
    expect(readWorkspace()).toBe(DEFAULT_WORKSPACE);
  });
});
