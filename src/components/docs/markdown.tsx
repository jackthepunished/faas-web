import type { ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link } from '@tanstack/react-router';
import { slugifyHeading } from '@/lib/docs-content';

/**
 * Renders vendored markdown with the site's own type and colour.
 *
 * Every element is mapped explicitly rather than left to a prose stylesheet,
 * for two reasons: the theming rule means colours must come from tokens rather
 * than a plugin's defaults, and the upstream docs lean heavily on tables, which
 * need real styling to stay readable at these widths.
 *
 * `remark-gfm` is what turns those tables — plus strikethrough and task
 * lists — into anything other than literal pipe characters.
 */

/** Heading text can arrive as nested nodes; the anchor id needs the plain string. */
function textOf(children: ReactNode): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(textOf).join('');
  if (children && typeof children === 'object' && 'props' in children) {
    return textOf((children as { props: { children?: ReactNode } }).props.children);
  }
  return '';
}

/**
 * A heading that can be linked to.
 *
 * `scroll-mt` keeps the target clear of the sticky site header — without it,
 * following an anchor puts the heading underneath the nav.
 */
function heading(level: 2 | 3 | 4) {
  const Tag = `h${level}` as const;
  const size =
    level === 2
      ? 'mt-12 text-xl font-semibold tracking-tight'
      : level === 3
        ? 'mt-8 text-base font-semibold'
        : 'mt-6 text-sm font-semibold';

  return function Heading({ children }: { children?: ReactNode }) {
    const id = slugifyHeading(textOf(children));
    return (
      <Tag id={id} className={`group scroll-mt-24 ${size}`}>
        <a href={`#${id}`} className="no-underline">
          {children}
          <span
            aria-hidden
            className="ml-2 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
          >
            #
          </span>
        </a>
      </Tag>
    );
  };
}

const COMPONENTS: Components = {
  h1: heading(2),
  h2: heading(2),
  h3: heading(3),
  h4: heading(4),

  p: ({ children }) => <p className="mt-4 leading-relaxed text-muted-foreground">{children}</p>,

  a: ({ href, children }) => {
    const target = href ?? '';
    // Docs cross-reference each other by slug; those go through the router so
    // they preload and do not reload the document.
    if (target.startsWith('/docs/')) {
      return (
        <Link to={target} className="text-brand underline-offset-4 hover:underline">
          {children}
        </Link>
      );
    }
    const external = /^https?:\/\//.test(target);
    return (
      <a
        href={target}
        className="text-brand underline-offset-4 hover:underline"
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {children}
      </a>
    );
  },

  ul: ({ children }) => (
    <ul className="mt-4 flex list-disc flex-col gap-2 pl-5 text-muted-foreground">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-4 flex list-decimal flex-col gap-2 pl-5 text-muted-foreground">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,

  // `inline` is gone in react-markdown v9; a fenced block arrives wrapped in a
  // <pre>, so the distinction is made there instead.
  code: ({ children, className }) => (
    <code
      className={
        className
          ? 'font-mono text-[13px] leading-relaxed'
          : 'rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground'
      }
    >
      {children}
    </code>
  ),

  pre: ({ children }) => (
    // Scrolls inside its own box: a long command must not widen the page.
    <pre className="mt-4 overflow-x-auto rounded-xl border border-border bg-muted p-4 text-foreground">
      {children}
    </pre>
  ),

  blockquote: ({ children }) => (
    <blockquote className="mt-4 border-l-2 border-brand/40 pl-4 text-muted-foreground">
      {children}
    </blockquote>
  ),

  hr: () => <hr className="mt-10 border-border" />,

  // The upstream docs are table-heavy, and a table is the one element that
  // genuinely needs to scroll rather than wrap.
  table: ({ children }) => (
    <div className="mt-6 overflow-x-auto rounded-xl border border-border">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
  th: ({ children }) => (
    <th className="border-b border-border px-4 py-2.5 text-left font-medium">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border-b border-border px-4 py-2.5 align-top text-muted-foreground last:border-0">
      {children}
    </td>
  ),

  img: ({ src, alt }) => (
    <img
      src={typeof src === 'string' ? src : undefined}
      alt={alt ?? ''}
      className="mt-6 max-w-full rounded-xl border border-border"
    />
  ),

  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
};

export function Markdown({ source }: { source: string }) {
  return (
    <div className="text-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
