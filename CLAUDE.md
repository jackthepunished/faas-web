# Working in this repo

Read `README.md` first — architecture, conventions, and the theming rule live
there and are not repeated here. This file covers only what tends to trip up an
agent making changes.

## Verify with

```bash
npm run check      # typecheck + lint + format check
npm run build      # the real gate; `build` runs tsc first
```

`npm run lint` currently reports **8 warnings and 0 errors**. Those warnings are
known and deliberate (see the comment block in `eslint.config.js`) — a change
should not add to that count, and does not need to reduce it.

## Gotchas

- **`src/routeTree.gen.ts` is generated.** The Vite plugin rewrites it on every
  dev run and build. Never hand-edit it, and never fix a lint or format
  complaint inside it — it is in both ignore files already.
- **`src/lib/api/schema.d.ts` is generated too**, from `api/openapi.yaml` by
  `npm run api:types`. Never hand-edit it; it is in both ignore files. To take
  an upstream API change, run `npm run api:pull` and fix what stops compiling —
  that is the point of it.
- **The console talks to a real API.** `apid` is same-origin in production, and
  `npm run dev` proxies to it. Read `README.md` § The API layer before adding a
  call, and check `api/openapi.yaml` for the endpoint rather than guessing a
  REST-shaped URL — the surface is ~190 operations and not always predictable.
- **Branch on `ApiError.code`, not on status or message.** Every error is
  RFC 7807 with a stable `code`; the prose is for humans and can change.
- **Some pages still show fixtures.** `lib/mock-data.ts` and
  `lib/mock-resources.ts` still back logs, metrics, queues, domains, crons,
  keys, secrets, env, alerts, usage, and invoices — see the list in
  `README.md`. Do not describe those pages as live.
- **The API has no projects and no regions.** Both were removed from the UI
  rather than faked. Do not reintroduce either.
- **Tests are Vitest + React Testing Library**, in `*.test.ts(x)` beside the
  code. `npm run test`. Vitest does not typecheck, so a green test run does
  not mean `npm run check` passes — run the latter before claiming done.
- **Sign in with a real email and password.** The `123456` demo code is gone —
  the API has no one-time-code flow. Signup enforces a 12-character minimum.
- **Do not add `dark:` variants or literal hex to components.** The two
  polarities are token-driven in `index.css`; a component that needs a new
  colour needs a new token defined in _both_ `:root` and `.console`.
- **Do not reformat files you did not otherwise change.** Prettier was adopted
  late and applied in one isolated commit; drive-by reformatting buries real
  diffs.
- **A new route needs a `head`.** Use `consoleHead('<segment>')` for console
  pages or `pageHead({ title })` elsewhere (`src/lib/seo.ts`), or the page
  inherits the bare brand title. See the Page titles section in `README.md`.
- **Adding a console page means touching `nav-config.ts` too**, or the page
  exists but is unreachable from the sidebar, breadcrumb, and ⌘K palette.
