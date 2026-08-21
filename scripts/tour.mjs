// Walks the whole console against the mock API and fails on the states a
// screenshot would have caught and a unit test never will: an error boundary,
// a spinner nothing resolves, a path the mock does not answer, a page that
// threw. Vitest covers logic; this covers "does the console actually render".
//
//   npm run dev:mock &          # or MOCK_EMPTY=1 for the empty workspace
//   npm run tour
//
// Playwright is not a dependency of this project — it pulls ~100MB of browser
// per platform, which is a lot to ask of everyone for one script. Install it
// when you want to run this:
//
//   npm i -D playwright && npx playwright install chromium
//
// Env: BASE_URL (default http://localhost:3000), SHOTS (directory, optional),
// SETTLE (ms to wait per page, default 2200 — raise it for a slow API).

import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const SETTLE = Number(process.env.SETTLE ?? 2200);
const SHOTS = process.env.SHOTS;

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error(
    'tour: playwright is not installed.\n  npm i -D playwright && npx playwright install chromium'
  );
  process.exit(2);
}

/** Account-level pages, plus the per-app routes that still resolve standalone. */
const PAGES = [
  '',
  'workflows',
  'deployments',
  'builds',
  'crons',
  'workers',
  'domains',
  'edge-rules',
  'storage',
  'traces',
  'audit',
  'usage',
  'invoices',
  'plans',
  'keys',
  'team',
  'security',
  'settings',
  'secrets',
  'env',
  'logs',
  'metrics',
  'apis',
  'queues',
  'databases',
  'alerts',
  'webhooks',
];

const APP_TABS = [
  'Metrics',
  'Deployments',
  'Logs',
  'Routes',
  'Secrets',
  'Env',
  'Queues',
  'Upstreams',
  'Alerts',
  'Webhooks',
  'Configuration',
];

if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const failures = [];
const pageErrors = [];
const unmocked = new Set();
page.on('pageerror', (e) => pageErrors.push(String(e).split('\n')[0]));
page.on('response', (r) => {
  if (r.url().includes('/v1/') && r.status() === 404) unmocked.add(new URL(r.url()).pathname);
});

// The dev bypass, set the way the button sets it — the tour is a design check,
// not an auth test, and real sign-in has its own coverage.
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => {
  localStorage.setItem('gregale.session', JSON.stringify({ email: 'design@gregale.dev' }));
  localStorage.setItem('gregale.onboarded', 'true');
  localStorage.setItem('gregale.dev-bypass', 'true');
});

async function visit(url, name) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(SETTLE);
  const text = await page
    .locator('#main')
    .innerText()
    .catch(() => '');
  const bad = [];

  if (text.includes('This page hit an error')) bad.push('error boundary');
  // Past the settle window, "Loading…" means a query that will never resolve —
  // usually one gated on a value that never arrives.
  if (/Loading|Querying/.test(text)) bad.push('stuck loading');
  // An in-flight or failed read dressed up as "there is nothing here".
  if (/Loading|Querying/.test(text) && /No .* (match|yet)|belong to an app/.test(text))
    bad.push('contradictory state');
  if (!text.trim()) bad.push('empty page');

  if (bad.length) failures.push(`${name}: ${bad.join(', ')}`);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name.replace(/[^\w.-]+/g, '_')}.png` });
  return bad.length === 0;
}

for (const p of PAGES) await visit(`${BASE}/dashboard/${p}`, p || 'index');

// The app detail page carries every per-app resource; each tab is its own render.
const slug = await page.evaluate(async (base) => {
  const res = await fetch(`${base}/v1/apps`, { credentials: 'include' });
  const apps = await res.json();
  return Array.isArray(apps) && apps.length ? apps[0].slug : '';
}, BASE);

if (slug) {
  for (const tab of APP_TABS)
    await visit(`${BASE}/dashboard/workflows/${slug}?tab=${tab}`, `app.${tab}`);
} else {
  console.log(
    'tour: no apps in this workspace — skipped the app tabs (expected under MOCK_EMPTY=1)'
  );
}

await browser.close();

const problems = [
  ...failures,
  ...[...unmocked].map((p) => `unmocked path: ${p}`),
  ...pageErrors.map((e) => `page error: ${e}`),
];

if (problems.length) {
  console.error(`tour: ${problems.length} problem(s)`);
  for (const p of problems) console.error('  -', p);
  process.exit(1);
}
console.log(
  `tour: ok — ${PAGES.length} pages${slug ? ` + ${APP_TABS.length} app tabs` : ''}, no errors`
);
