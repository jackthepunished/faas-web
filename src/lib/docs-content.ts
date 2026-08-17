/**
 * Loads the vendored markdown and pulls a table of contents out of it.
 *
 * `import.meta.glob` with `eager` inlines the files at build time, which is what
 * lets the docs routes prerender to real HTML — a runtime fetch would leave
 * crawlers and unfurlers looking at an empty shell, which is the whole reason
 * `scripts/prerender.mjs` exists.
 *
 * The docs chunk is code-split by route, so the marketing pages never pay for
 * this.
 */

const FILES = import.meta.glob('/content/docs/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export interface Heading {
  /** Anchor target; matches the id the renderer puts on the heading. */
  id: string;
  text: string;
  /** 2 or 3. `#` is the page title and is rendered from the manifest instead. */
  level: number;
}

/**
 * GitHub-compatible heading slugs, so an anchor copied from the source
 * markdown lands in the same place here.
 */
export function slugifyHeading(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
}

export function docSource(slug: string): string | undefined {
  return FILES[`/content/docs/${slug}.md`];
}

/**
 * Headings for the on-page contents.
 *
 * Fenced code blocks are stripped first: a `# comment` inside a bash sample is
 * not a heading, and treating it as one puts nonsense in the sidebar.
 */
export function extractHeadings(markdown: string): Heading[] {
  const withoutCode = markdown.replace(/```[\s\S]*?```/g, '');
  const headings: Heading[] = [];

  for (const line of withoutCode.split('\n')) {
    const match = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
    if (!match) continue;
    const text = match[2].replace(/`/g, '');
    headings.push({ id: slugifyHeading(text), text, level: match[1].length });
  }

  return headings;
}

/**
 * Drops the leading `# Title` line.
 *
 * The page renders its title from the manifest, which is the string that is
 * also in the nav, the `<title>`, and the index card. Letting the markdown
 * supply a second one would put two different titles on the same page.
 */
export function stripTitle(markdown: string): string {
  return markdown.replace(/^#\s+.+?\n+/, '');
}
