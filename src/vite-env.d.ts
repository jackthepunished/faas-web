/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Absolute API origin. Leave unset — the console is served from the same
   * origin as `apid`, so requests are relative and the session cookie works.
   * Setting this points the console at another box, which then has to send
   * CORS headers; the production one does not. See `src/lib/api/client.ts`.
   */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
