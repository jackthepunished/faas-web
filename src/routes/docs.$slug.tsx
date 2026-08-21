import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'iconoir-react';
import { Markdown } from '@/components/docs/markdown';
import { docNeighbours, findDoc } from '@/lib/docs-manifest';
import { docSource, extractHeadings, stripTitle } from '@/lib/docs-content';
import { pageHead } from '@/lib/seo';

export const Route = createFileRoute('/docs/$slug')({
  // Resolved in `loader` rather than in the component so an unknown slug is a
  // real 404 — the router's not-found boundary — instead of a page that renders
  // empty with a 200.
  loader: ({ params }) => {
    const entry = findDoc(params.slug);
    const source = docSource(params.slug);
    if (!entry || !source) throw notFound();
    return { entry, source };
  },
  head: ({ params }) => {
    const entry = findDoc(params.slug);
    return pageHead({ title: entry?.title, description: entry?.summary });
  },
  component: DocPage,
});

const REPO_BLOB = 'https://github.com/poyrazK/faas/blob/main';

function DocPage() {
  const { entry, source } = Route.useLoaderData();
  const { prev, next } = docNeighbours(entry.slug);

  const body = stripTitle(source);
  const headings = extractHeadings(body);

  return (
    <div className="flex gap-10">
      <article className="min-w-0 max-w-3xl flex-1">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">{entry.title}</h1>
          <p className="mt-3 text-balance text-muted-foreground">{entry.summary}</p>
        </header>

        <Markdown source={body} />

        {/* The vendored copy can lag upstream, so every page says where it came
            from and offers the canonical version. */}
        <p className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
          Source:{' '}
          <a
            href={`${REPO_BLOB}/${entry.source}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-brand underline-offset-4 hover:underline"
          >
            {entry.source}
            <ArrowUpRight className="h-3 w-3" />
          </a>
        </p>

        <nav aria-label="Pagination" className="mt-8 flex flex-wrap justify-between gap-4">
          {prev ? (
            <Link
              to="/docs/$slug"
              params={{ slug: prev.slug }}
              className="group flex flex-col gap-1 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-brand/40"
            >
              <span className="label-mono flex items-center gap-1.5 text-muted-foreground">
                <ArrowLeft className="h-3 w-3" />
                Previous
              </span>
              <span className="text-sm">{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}

          {next && (
            <Link
              to="/docs/$slug"
              params={{ slug: next.slug }}
              className="group flex flex-col items-end gap-1 rounded-xl border border-border bg-card px-4 py-3 text-right transition-colors hover:border-brand/40"
            >
              <span className="label-mono flex items-center gap-1.5 text-muted-foreground">
                Next
                <ArrowRight className="h-3 w-3" />
              </span>
              <span className="text-sm">{next.title}</span>
            </Link>
          )}
        </nav>
      </article>

      {/* On-page contents. Hidden below xl: at narrower widths it competes with
          the section sidebar for room the article needs. */}
      {headings.length > 2 && (
        <nav aria-label="On this page" className="hidden w-48 shrink-0 xl:block">
          <div className="sticky top-24">
            <h2 className="label-mono text-muted-foreground">On this page</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {headings.map((h) => (
                <li key={h.id} className={h.level === 3 ? 'pl-3' : undefined}>
                  <a
                    href={`#${h.id}`}
                    className="text-xs leading-relaxed text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {h.text}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      )}
    </div>
  );
}
