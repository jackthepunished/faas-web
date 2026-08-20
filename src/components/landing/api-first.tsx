import { ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Reveal } from './reveal';
import { TextReveal } from './text-reveal';
import { TruchetTiles } from './shapes/truchet-tiles';

/**
 * The API, as the product.
 *
 * Every claim here is read off `api/openapi.yaml`: the operation count, the
 * key prefix and scopes, the Idempotency-Key contract, the RFC 7807 envelope
 * with its stable `code`. The console itself is built on this same surface
 * (see README § The API layer), which is the one sentence that makes "for
 * agents" true rather than aspirational — an agent can do anything a human
 * can click.
 *
 * Each fact names a line of the worked exchange on the right. The pairing is
 * wired with `data-hl-src` (fact) → `data-hl` (evidence); the hover rule
 * lives in index.css because the two sit in different grid columns.
 */
const FACTS = [
  {
    tag: 'OpenAPI 3.1',
    hl: 'doc',
    title: '187 operations, one document',
    body: 'Served by the API itself. Generate a client, or hand the document to an agent.',
  },
  {
    tag: 'deploy:write',
    hl: 'scopes',
    title: 'Keys with scopes',
    body: 'fp_live_… Bearer keys carry scopes like apps:read; rotate a key in place and its scopes carry over.',
  },
  {
    tag: 'Idempotency-Key',
    hl: 'retry',
    title: 'Safe to retry',
    body: 'Every POST takes one (24 h). A replay answers Idempotent-Replayed: true instead of a second side effect.',
  },
  {
    tag: 'problem+json',
    hl: 'errors',
    title: 'Errors you can branch on',
    body: 'RFC 7807 with a stable code. The prose is for humans and may change; the code will not.',
  },
];

function Fact({ tag, hl, title, body }: (typeof FACTS)[number]) {
  return (
    <li data-hl-src={hl} className="border-t border-border pt-4">
      {/* Not .label-mono: these tags are code identifiers, and uppercasing
          deploy:write would misquote the API. */}
      <p className="font-mono text-[11px] tracking-wide text-brand">{tag}</p>
      <h3 className="mt-2 text-sm font-medium">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </li>
  );
}

/**
 * A marked span of the exchange — the evidence a fact points at. Emphasised
 * marks carry a resting wash so the load-bearing tokens read without hover;
 * quiet ones only light up when their fact is hovered.
 */
function Mk({ k, quiet, children }: { k: string; quiet?: boolean; children: ReactNode }) {
  return (
    <span
      data-hl={k}
      className={
        quiet ? 'rounded-[4px] px-[3px]' : 'rounded-[4px] bg-brand-muted/60 px-[3px] text-brand'
      }
    >
      {children}
    </span>
  );
}

export function ApiFirst() {
  return (
    <section id="api" className="relative scroll-mt-24 overflow-hidden border-t border-border">
      {/* Truchet tiles: one small rule set that can never produce an invalid
          join — a fair picture of an API whose every response has the same
          shape. The mask is narrower than the section so the lattice lives in
          the gutter between the columns instead of smudging under the copy;
          the routes it traces need clear ground to read as routes. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          WebkitMaskImage: 'radial-gradient(56% 86% at 52% 50%, black, transparent 76%)',
          maskImage: 'radial-gradient(56% 86% at 52% 50%, black, transparent 76%)',
        }}
      >
        <TruchetTiles />
      </div>

      <div className="relative mx-auto grid max-w-6xl items-start gap-12 px-4 py-24 sm:px-6 lg:grid-cols-2">
        <div>
          <Reveal y={12}>
            <p className="label-mono mb-5 text-brand">API first</p>
          </Reveal>
          <TextReveal
            as="h2"
            className="text-3xl leading-[1.15] sm:text-4xl"
            delay={0.12}
            segments={[
              { text: 'One API — for you, your CI, and your agents.' },
              {
                text: 'The console is built on it, so nothing it can do is hidden from a script.',
                className: 'text-muted-foreground',
              },
            ]}
          />

          <Reveal delay={0.3}>
            <ul className="mt-10 grid gap-6 sm:grid-cols-2">
              {FACTS.map((fact) => (
                <Fact key={fact.title} {...fact} />
              ))}
            </ul>

            {/* Served by apid on this origin — the same path the footer links. */}
            <a
              href="/v1/openapi.yaml"
              className="group mt-8 inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-brand outline-none transition-colors hover:text-brand-hover focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              Read the OpenAPI document
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none" />
            </a>
          </Reveal>
        </div>

        {/* Exchange card — light, because this is documentation, not a
            terminal. The hero already owns the page's one dark plate. The
            three blocks land in sequence so the card reads as a conversation
            (ask, answer, refusal) rather than a code dump; each Reveal is
            once-only and honours reduced motion. */}
        <Reveal delay={0.15}>
          <div className="rounded-xl border border-border bg-card">
            <Exchange label="Request">
              <span className="mr-1 inline-block rounded border border-border bg-muted px-1 text-[10.5px] font-medium">
                POST
              </span>{' '}
              <Mk k="doc" quiet>
                /v1/apps/hello/invoke/async
              </Mk>
              {'\nAuthorization: Bearer '}
              <Mk k="scopes" quiet>
                fp_live_ab…
              </Mk>
              {'\n'}
              <Mk k="retry">Idempotency-Key</Mk>
              {
                ': 7d1f0c2e-…\nContent-Type: application/json\n\n{ "payload": { "image": "s3://…/in.png" } }'
              }
            </Exchange>
            <Reveal delay={0.5} y={10}>
              <Exchange label="202 · enqueued" tone="ok">
                {'HTTP/2 202\n'}
                <Mk k="retry">Idempotent-Replayed: false</Mk>
                {
                  '\n\n{\n  "id": "0123456789abcdef0123456789abcdef",\n  "status_url": "/v1/invocations/0123456789abcdef0123456789abcdef"\n}'
                }
              </Exchange>
            </Reveal>
            <Reveal delay={0.85} y={10}>
              <Exchange label="422 · problem+json" tone="problem" last>
                {'HTTP/2 422\nContent-Type: application/problem+json\n\n{\n  '}
                <Mk k="errors">{'"code": "validation_failed"'}</Mk>
                {
                  ',\n  "title": "Validation failed",\n  "detail": "ram_mb must be one of [128, 256, 512, 1024, 2048]"\n}'
                }
              </Exchange>
            </Reveal>
          </div>
          {/* Same register as the caption under the hero terminal: say where
              the shapes come from rather than leaving them to be trusted. */}
          <Reveal delay={1.05} y={6}>
            <p className="mt-3 font-mono text-[11px] text-muted-foreground">
              Shapes from api/openapi.yaml — AsyncInvokeResponse · Problem.
            </p>
          </Reveal>
        </Reveal>
      </div>
    </section>
  );
}

function Exchange({
  label,
  children,
  tone,
  last,
}: {
  label: string;
  children: ReactNode;
  tone?: 'ok' | 'problem';
  last?: boolean;
}) {
  return (
    <div className={`p-5 ${last ? '' : 'border-b border-border'}`}>
      <p
        className={`label-mono mb-3 flex items-center gap-1.5 ${
          tone === 'ok'
            ? 'text-status-good'
            : tone === 'problem'
              ? 'text-status-warning'
              : 'text-muted-foreground'
        }`}
      >
        {/* Colour is never the only signal: the dot marks the two blocks that
            carry a status, matching the console's badge convention. */}
        {tone && (
          <span
            aria-hidden
            className={`h-1.5 w-1.5 rounded-full ${tone === 'ok' ? 'bg-status-good' : 'bg-status-warning'}`}
          />
        )}
        {label}
      </p>
      <pre className="overflow-x-auto font-mono text-[12px] leading-[1.7] text-foreground">
        {children}
      </pre>
    </div>
  );
}
