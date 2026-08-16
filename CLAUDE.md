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
- **There is no backend.** Fixtures live in `lib/mock-data.ts` and
  `lib/mock-resources.ts`; use the real ids from them in tests (`proj_*`,
  runtimes like `node22`) rather than inventing plausible-looking ones.
- **Tests are Vitest + React Testing Library**, in `*.test.ts(x)` beside the
  code. `npm run test`. Vitest does not typecheck, so a green test run does
  not mean `npm run check` passes — run the latter before claiming done.
- **Sign in with any email and the code `123456`** to reach the console.
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
