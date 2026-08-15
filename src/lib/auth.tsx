import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * Mock session layer. Persists to localStorage so route guards can read it
 * synchronously in `beforeLoad`, and simulates network latency so every flow
 * exercises its real pending / error / success states.
 *
 * Swap the three `simulate*` functions for real API calls; the hook surface
 * and the guards stay unchanged.
 */

const SESSION_KEY = 'gregale.session';
const ONBOARDED_KEY = 'gregale.onboarded';
const WORKSPACE_KEY = 'gregale.workspace';
export const DEFAULT_WORKSPACE = 'acme-corp';

/** The code the mock backend accepts. Surfaced in the UI as a demo hint. */
export const DEMO_CODE = '123456';

export interface User {
  email: string;
  name: string;
  initials: string;
}

function initialsFor(email: string): string {
  const handle = email.split('@')[0] ?? '';
  const parts = handle.split(/[._-]+/).filter(Boolean);
  const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : handle.slice(0, 2);
  return letters.toUpperCase() || 'GG';
}

function nameFor(email: string): string {
  const handle = email.split('@')[0] ?? '';
  return handle
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(' ');
}

export function readSession(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function hasOnboarded(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(ONBOARDED_KEY) === 'true';
}

export function markOnboarded() {
  window.localStorage.setItem(ONBOARDED_KEY, 'true');
}

/** Workspace slug chosen during onboarding; falls back to the demo default. */
export function readWorkspace(): string {
  if (typeof window === 'undefined') return DEFAULT_WORKSPACE;
  return window.localStorage.getItem(WORKSPACE_KEY)?.trim() || DEFAULT_WORKSPACE;
}

export function saveWorkspace(slug: string) {
  window.localStorage.setItem(WORKSPACE_KEY, slug.trim());
}

/** Explicit workspace deletion wipes account state, not just the session. */
export function clearWorkspace() {
  window.localStorage.removeItem(WORKSPACE_KEY);
  window.localStorage.removeItem(ONBOARDED_KEY);
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

interface AuthValue {
  user: User | null;
  /** Sends the one-time code. Rejects on an unroutable address. */
  requestCode: (email: string) => Promise<void>;
  /** Verifies the code and opens a session. */
  verifyCode: (email: string, code: string) => Promise<User>;
  signOut: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => readSession());

  const requestCode = useCallback(async (email: string) => {
    await delay(700);
    // One address is reserved to demonstrate the failure path.
    if (email.trim().toLowerCase() === 'blocked@gregale.dev') {
      throw new Error('That address is not allowed in the private beta.');
    }
  }, []);

  const verifyCode = useCallback(async (email: string, code: string) => {
    await delay(800);
    if (code !== DEMO_CODE) {
      throw new Error("That code doesn't match. Check the digits and try again.");
    }
    const next: User = {
      email: email.trim(),
      name: nameFor(email) || 'Gregale User',
      initials: initialsFor(email),
    };
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    setUser(next);
    return next;
  }, []);

  // Onboarding is account state, not session state, so it survives sign-out.
  const signOut = useCallback(() => {
    window.localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, requestCode, verifyCode, signOut }),
    [user, requestCode, verifyCode, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
