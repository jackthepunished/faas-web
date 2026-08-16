import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Writes a real HTML document for each public route.
 *
 * The app is a client-rendered SPA, so every URL used to serve the same empty
 * `index.html`. That is fine for browsers and for crawlers that execute JS,
 * but social unfurlers (Slack, Twitter, iMessage) do not run JS — they read
 * the markup as served, and so previewed every link as the home page.
 *
 * Each route here is rendered at build time and written to its own
 * `index.html`, so the tags and copy are in the document before any script
 * runs. The SPA then mounts over it (`createRoot`, not `hydrateRoot` — see
 * the note in `src/main.tsx`), and the SPA fallback in `_redirects` /
 * `vercel.json` continues to serve anything not listed here.
 *
 * Only public routes are prerendered. Everything under /dashboard is behind
 * auth and has nothing to say to a crawler.
 */

const ROUTES = ['/', '/login', '/signup'];

const DIST = 'dist';
const TEMPLATE = join(DIST, 'index.html');

const { render } = await import('../dist-ssr/prerender.js');

const template = readFileSync(TEMPLATE, 'utf8');

/** Escapes a value for an HTML attribute. */
const attr = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/**
 * Collapses the matched routes' meta into one tag per key, last wins — a
 * leaf route's title must beat the root's fallback.
 */
function dedupe(meta) {
  const byKey = new Map();
  for (const tag of meta) {
    if (!tag) continue;
    const key = 'title' in tag ? 'title' : (tag.name ?? tag.property);
    if (key) byKey.set(key, tag);
  }
  return [...byKey.values()];
}

function renderTags(meta) {
  return meta
    .map((tag) => {
      if ('title' in tag) return `<title>${attr(tag.title)}</title>`;
      const key = tag.name ? 'name' : 'property';
      return `<meta ${key}="${attr(tag[key] ?? tag.property)}" content="${attr(tag.content)}" />`;
    })
    .join('\n    ');
}

/** Strips the static tags the template ships so they cannot end up duplicated. */
function stripStaticHead(html) {
  return html
    .replace(/\s*<title>[\s\S]*?<\/title>/, '')
    .replace(/\s*<meta\s+name="description"[\s\S]*?\/>/, '')
    .replace(/\s*<meta\s+property="og:title"[\s\S]*?\/>/, '')
    .replace(/\s*<meta\s+property="og:description"[\s\S]*?\/>/, '');
}

let written = 0;
for (const route of ROUTES) {
  const { html, meta } = await render(route);
  const tags = renderTags(dedupe(meta));

  let doc = stripStaticHead(template);
  doc = doc.replace('</head>', `  ${tags}\n  </head>`);

  // `HeadContent` renders its tags as real elements wherever it sits in the
  // tree, so `renderToString` emits them inline at the top of #root. They are
  // already hoisted into <head> above, and a second <title> in the body is
  // exactly what an SEO audit flags — so drop the inline copies.
  //
  // Safe to drop: the client mounts fresh rather than hydrating, and React
  // re-hoists its own copies into <head> on mount. `src/prerender.test.ts`
  // asserts the body stays clean.
  //
  // React 19 also hoists <link rel="preload"> the same way, and those emit
  // before the title on the landing page — so the run has to be matched as a
  // whole. The preloads are worth keeping, just in <head> where they can
  // actually start a fetch early, so they are moved rather than dropped.
  const bodyHead = /^(?:<title>[\s\S]*?<\/title>|<meta\b[^>]*?\/?>|<link\b[^>]*?\/?>)+/;

  const rootDiv = '<div id="root"></div>';
  if (!doc.includes(rootDiv)) {
    throw new Error('Could not find the #root mount point in dist/index.html');
  }
  // Keep the hoisted <link>s (preloads), drop the title/meta — those are
  // already resolved into <head> above, from the router's own state.
  const hoisted = html.match(bodyHead)?.[0] ?? '';
  const links = hoisted.match(/<link\b[^>]*?\/?>/g)?.join('\n    ') ?? '';
  if (links) doc = doc.replace('</head>', `  ${links}\n  </head>`);

  doc = doc.replace(rootDiv, `<div id="root">${html.replace(bodyHead, '')}</div>`);

  const outFile = route === '/' ? TEMPLATE : join(DIST, route, 'index.html');
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, doc);

  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  console.log(`  prerendered ${route.padEnd(9)} ${text.length} chars of text`);
  written++;
}

// The SSR bundle is a build artifact, not something to deploy.
rmSync('dist-ssr', { recursive: true, force: true });

console.log(`prerendered ${written} routes`);
