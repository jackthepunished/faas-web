import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Guards the prerendered output.
 *
 * These read `dist/`, so they only run after a build. Skipped otherwise
 * rather than failing, so `npm run test` on a clean checkout is still green —
 * CI runs the build, so the assertions do execute there.
 */

const PAGES = [
  {
    route: '/',
    file: 'dist/index.html',
    title: 'Gregale — Serverless cloud for humans and agents',
  },
  { route: '/login', file: 'dist/login/index.html', title: 'Sign in · Gregale' },
  { route: '/signup', file: 'dist/signup/index.html', title: 'Create account · Gregale' },
];

const built = existsSync('dist/index.html');
const describeBuilt = built ? describe : describe.skip;

describeBuilt('prerendered pages', () => {
  for (const page of PAGES) {
    describe(page.route, () => {
      const html = built ? readFileSync(page.file, 'utf8') : '';
      const head = html.slice(0, html.indexOf('</head>'));
      const body = html.slice(html.indexOf('<body'));

      it('exists as its own document', () => {
        expect(existsSync(page.file)).toBe(true);
      });

      it('carries its own title, in the head', () => {
        expect(head).toContain(`<title>${page.title}</title>`);
      });

      it('has exactly one title — a second is an SEO smell and ambiguous', () => {
        expect(html.match(/<title>/g)).toHaveLength(1);
      });

      it('leaves no metadata stranded in the body, where unfurlers miss it', () => {
        expect(body).not.toContain('<title>');
        expect(body).not.toMatch(/<meta\s+property="og:/);
      });

      it('restates og:title to match the page', () => {
        expect(head).toContain(`<meta property="og:title" content="${page.title}" />`);
        expect(head.match(/property="og:title"/g)).toHaveLength(1);
      });

      it('carries exactly one description', () => {
        expect(head.match(/name="description"/g)).toHaveLength(1);
      });

      it('ships real markup, not an empty mount point', () => {
        // The whole point: a consumer that runs no JS still gets content.
        expect(html).not.toContain('<div id="root"></div>');
        const text = body
          .replace(/<script[\s\S]*?<\/script>/g, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        expect(text.length).toBeGreaterThan(100);
      });

      it('still loads the app bundle, so the SPA takes over', () => {
        expect(html).toMatch(/<script[^>]+type="module"[^>]+src="\/assets\/[^"]+\.js"/);
      });
    });
  }

  it('gives each route a distinct title', () => {
    const titles = PAGES.map(
      (p) => readFileSync(p.file, 'utf8').match(/<title>([^<]*)<\/title>/)![1]
    );
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('does not ship the SSR bundle', () => {
    expect(existsSync('dist-ssr')).toBe(false);
  });
});
