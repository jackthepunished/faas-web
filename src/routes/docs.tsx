import { createFileRoute, Link, Outlet, useMatchRoute } from '@tanstack/react-router';
import { MotionConfig } from 'framer-motion';
import { Nav } from '@/components/landing/nav';
import { DOC_SECTIONS } from '@/lib/docs-manifest';
import { pageHead } from '@/lib/seo';

export const Route = createFileRoute('/docs')({
  component: DocsLayout,
  head: () => pageHead({ title: 'Documentation' }),
});

/**
 * The docs shell: site nav, a persistent section sidebar, and the page.
 *
 * The sidebar is the whole table of contents rather than the current section
 * only — the set is small enough to show at once, and seeing the shape of the
 * documentation is most of what an index is for.
 *
 * No footer here. The landing footer is a tall conversion panel with a dither
 * shader; under a reference page it buries the content and costs a canvas on
 * every doc view.
 */
function DocsLayout() {
  const matchRoute = useMatchRoute();

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-background text-foreground">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Nav />

        <div className="mx-auto flex max-w-6xl gap-10 px-4 py-10 sm:px-6">
          {/* Sticky on desktop, and a plain block above the content on mobile
              rather than a drawer — fourteen links do not warrant a modal. */}
          <nav aria-label="Documentation" className="hidden w-56 shrink-0 lg:block">
            <div className="sticky top-24 flex flex-col gap-6">
              {DOC_SECTIONS.map((section) => (
                <div key={section.title}>
                  <h2 className="label-mono text-muted-foreground">{section.title}</h2>
                  <ul className="mt-3 flex flex-col gap-1.5">
                    {section.entries.map((entry) => {
                      const active = Boolean(
                        matchRoute({ to: '/docs/$slug', params: { slug: entry.slug } })
                      );
                      return (
                        <li key={entry.slug}>
                          <Link
                            to="/docs/$slug"
                            params={{ slug: entry.slug }}
                            aria-current={active ? 'page' : undefined}
                            className={
                              active
                                ? 'text-sm text-foreground'
                                : 'text-sm text-muted-foreground transition-colors hover:text-foreground'
                            }
                          >
                            {entry.title}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </nav>

          <main id="main" className="min-w-0 flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </MotionConfig>
  );
}
