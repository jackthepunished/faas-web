import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight, ArrowUpRight } from 'iconoir-react';
import { DOC_SECTIONS } from '@/lib/docs-manifest';
import { pageHead } from '@/lib/seo';

export const Route = createFileRoute('/docs/')({
  component: DocsIndex,
  head: () =>
    pageHead({
      title: 'Documentation',
      description:
        'Guides for deploying to one-box FaaS: scale-to-zero behaviour, runtimes, the CLI, and the trust documents.',
    }),
});

/**
 * The docs landing page.
 *
 * Sections carry a blurb rather than only a list, because the titles alone do
 * not tell a first-time reader whether "Storage" means object storage (it does
 * not) or what "Preview environments" gets them.
 */
function DocsIndex() {
  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <header>
        <p className="label-mono text-brand">Documentation</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          Everything you need to ship on Gregale
        </h1>
        <p className="mt-4 text-balance text-muted-foreground">
          How the platform behaves, which runtimes it offers, and what it commits to. The API
          contract lives in the{' '}
          <a href="/v1/openapi.yaml" className="text-brand underline-offset-4 hover:underline">
            OpenAPI document
          </a>
          .
        </p>
      </header>

      {DOC_SECTIONS.map((section) => (
        <section key={section.title}>
          <h2 className="text-lg font-semibold tracking-tight">{section.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{section.blurb}</p>

          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {section.entries.map((entry) => (
              <li key={entry.slug}>
                <Link
                  to="/docs/$slug"
                  params={{ slug: entry.slug }}
                  className="group flex h-full flex-col gap-1.5 rounded-xl border border-border bg-card p-4 transition-colors hover:border-brand/40"
                >
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    {entry.title}
                    <ArrowRight className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                  </span>
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    {entry.summary}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {/* The docs here are a curated slice; the rest of the engineering
          material stays in the repository, where its audience already is. */}
      <p className="border-t border-border pt-6 text-sm text-muted-foreground">
        Looking for architecture decisions, runbooks, or the source?{' '}
        <a
          href="https://github.com/poyrazK/faas"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-brand underline-offset-4 hover:underline"
        >
          Browse the repository
          <ArrowUpRight className="h-3 w-3" />
        </a>
      </p>
    </div>
  );
}
