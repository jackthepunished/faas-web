import { ArrowUpRight } from 'lucide-react';
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
 */
const FACTS = [
  {
    title: '187 operations, one document',
    body: 'OpenAPI 3.1, served by the API itself. Generate a client, or hand it to an agent.',
  },
  {
    title: 'Keys with scopes',
    body: 'fp_live_… Bearer keys scoped like apps:read or deploy:write; rotate in place, scopes carry over.',
    code: 'deploy:write',
  },
  {
    title: 'Safe to retry',
    body: 'Every POST takes an Idempotency-Key (24 h). A replay answers with Idempotent-Replayed: true instead of a second side effect.',
    code: 'Idempotency-Key',
  },
  {
    title: 'Errors you can branch on',
    body: 'RFC 7807 problem+json with a stable code. The prose is for humans and may change; the code will not.',
    code: 'code',
  },
];

function Fact({ title, body, code }: { title: string; body: string; code?: string }) {
  // Split on the first occurrence only — the word may recur in the prose.
  const at = code ? body.indexOf(code) : -1;
  const before = at >= 0 && code ? body.slice(0, at) : body;
  const after = at >= 0 && code ? body.slice(at + code.length) : undefined;
  return (
    <li className="border-t border-border pt-4">
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        {before}
        {code && (
          <>
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em] text-foreground">
              {code}
            </code>
            {after}
          </>
        )}
      </p>
    </li>
  );
}

/** Worked exchange — the shapes are `AsyncInvokeResponse` and `Problem` from the spec. */
const REQUEST = `POST /v1/apps/hello/invoke/async
Authorization: Bearer fp_live_ab…
Idempotency-Key: 7d1f0c2e-…
Content-Type: application/json

{ "payload": { "image": "s3://…/in.png" } }`;

const RESPONSE = `HTTP/2 202
Idempotent-Replayed: false

{
  "id": "0123456789abcdef0123456789abcdef",
  "status_url": "/v1/invocations/0123456789abcdef0123456789abcdef"
}`;

const PROBLEM = `HTTP/2 422
Content-Type: application/problem+json

{
  "code": "validation_failed",
  "title": "Validation failed",
  "detail": "ram_mb must be one of [128, 256, 512, 1024, 2048]"
}`;

export function ApiFirst() {
  return (
    <section id="api" className="relative scroll-mt-24 overflow-hidden border-t border-border">
      {/* Truchet tiles: one small rule set that can never produce an invalid
          join — a fair picture of an API whose every response has the same
          shape. The mask keeps the lattice densest in the gutter between the
          columns and clears it off the copy. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          WebkitMaskImage: 'radial-gradient(72% 82% at 52% 50%, black, transparent 78%)',
          maskImage: 'radial-gradient(72% 82% at 52% 50%, black, transparent 78%)',
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
            terminal. The hero already owns the page's one dark plate. */}
        <Reveal delay={0.15}>
          <div className="rounded-xl border border-border bg-card">
            <Exchange label="Request" body={REQUEST} />
            <Exchange label="202 · enqueued" body={RESPONSE} tone="ok" />
            <Exchange label="422 · problem+json" body={PROBLEM} tone="problem" last />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Exchange({
  label,
  body,
  tone,
  last,
}: {
  label: string;
  body: string;
  tone?: 'ok' | 'problem';
  last?: boolean;
}) {
  return (
    <div className={`p-5 ${last ? '' : 'border-b border-border'}`}>
      <p
        className={`label-mono mb-3 ${
          tone === 'ok'
            ? 'text-status-good'
            : tone === 'problem'
              ? 'text-status-warning'
              : 'text-muted-foreground'
        }`}
      >
        {label}
      </p>
      <pre className="overflow-x-auto font-mono text-[12px] leading-[1.7] text-foreground">
        {body}
      </pre>
    </div>
  );
}
