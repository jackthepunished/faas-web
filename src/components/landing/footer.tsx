import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, Copy, Wind } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SweepLink } from '@/components/sweep-link';
import { Reveal } from './reveal';
import { TextReveal } from './text-reveal';
import { DitherFade } from './shaders/dither-fade';

const INSTALL_COMMAND = 'brew install gregale';

const LINK_GROUPS: { title: string; links: { label: string; external?: boolean }[] }[] = [
  {
    title: 'Platform',
    links: [
      { label: 'Functions' },
      { label: 'Containers' },
      { label: 'Databases' },
      { label: 'Storage' },
      { label: 'Networking' },
    ],
  },
  {
    title: 'Developers',
    links: [
      { label: 'Documentation' },
      { label: 'CLI reference' },
      { label: 'API' },
      { label: 'Changelog' },
      { label: 'GitHub', external: true },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About' },
      { label: 'Blog' },
      { label: 'Careers' },
      { label: 'Contact' },
      { label: 'Brand kit' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy' },
      { label: 'Terms' },
      { label: 'Security' },
      { label: 'DPA' },
      { label: 'Sub-processors' },
    ],
  },
];

const SOCIALS = ['GitHub', 'Discord', 'LinkedIn'];

const TRUST_POINTS = ['No credit card', '1M invocations free', 'Under 350ms cold starts'];

function CopyCommand() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL_COMMAND);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked (insecure context or denied permission) — leave the
      // command visible so it can still be selected by hand.
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy install command: ${INSTALL_COMMAND}`}
      className="group flex h-11 items-center gap-3 rounded-full border border-border bg-card/70 pl-5 pr-2 font-mono text-sm text-muted-foreground backdrop-blur-sm transition-all duration-200 hover:border-brand/40 hover:bg-card hover:text-foreground"
    >
      <span aria-hidden className="text-brand transition-colors">
        $
      </span>
      <span className="tracking-tight">{INSTALL_COMMAND}</span>
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
          copied ? 'bg-cat-security/15' : 'bg-muted group-hover:bg-secondary'
        }`}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-cat-security" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </span>
      <span aria-live="polite" className="sr-only">
        {copied ? 'Copied to clipboard' : ''}
      </span>
    </button>
  );
}

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-border">
      {/* Dissolve across the whole footer, clipped by its overflow. Densest
          low, behind the wordmark, thinning upward toward the CTA. */}
      <DitherFade className="inset-0" intensity={0.85} />

      {/* Readability scrim: heaviest over the CTA and link bands, lifting
          toward the base so the dissolve stays plainly visible there. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, color-mix(in oklab, var(--background) 82%, transparent) 0%, color-mix(in oklab, var(--background) 70%, transparent) 42%, color-mix(in oklab, var(--background) 34%, transparent) 72%, color-mix(in oklab, var(--background) 5%, transparent) 100%)',
        }}
      />

      {/* Hairline that brightens toward the center, separating the footer from the page. */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            'linear-gradient(to right, transparent, color-mix(in oklab, var(--brand) 50%, transparent) 50%, transparent)',
        }}
      />

      {/* Closing CTA — contained panel so the conversion moment has edges */}
      <section className="relative px-4 pb-16 pt-20 sm:px-6 sm:pt-24">
        {/* Translucent with a heavy blur, so the footer-wide dissolve reads
            through the panel as a soft glow rather than as dots under text. */}
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-2xl border border-border bg-card/55 px-6 py-14 text-center backdrop-blur-2xl sm:px-12 sm:py-16">
          {/* Lit top edge, brightest at center */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-px"
            style={{
              background:
                'linear-gradient(to right, transparent, color-mix(in oklab, var(--brand) 55%, transparent) 50%, transparent)',
            }}
          />

          <Reveal y={12}>
            <p className="label-mono relative text-brand">Get started</p>
          </Reveal>

          {/* The heading animates per word, so it sits outside the block
              Reveal — nesting the two would fight over the same transform. */}
          <TextReveal
            as="h2"
            className="relative mt-5 text-4xl leading-[1.08] sm:text-5xl"
            delay={0.1}
            segments={[
              { text: 'Ship your first function in' },
              { text: 'minutes.', className: 'text-brand' },
            ]}
          />

          {/* Everything below the headline arrives together, once the words
              have landed. */}
          <Reveal delay={0.45}>
            <p className="relative mx-auto mt-4 max-w-md text-balance text-muted-foreground">
              One command from repository to running microVM. Scale-to-zero means idle costs
              nothing.
            </p>

            <div className="relative mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild variant="cta" size="lg" className="group h-11 gap-2 rounded-full px-7">
                <SweepLink to="/signup">
                  Start deploying
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </SweepLink>
              </Button>
              <CopyCommand />
            </div>

            <ul className="relative mt-9 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              {TRUST_POINTS.map((point) => (
                <li key={point} className="flex items-center gap-2">
                  <Check className="h-3 w-3 shrink-0 text-cat-security" />
                  <span className="label-mono text-muted-foreground">{point}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* Link directory — hairline rules turn it into a spec sheet */}
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 border-t border-border py-14 md:grid-cols-[1.4fr_repeat(4,1fr)] md:gap-6">
          {/* Brand column */}
          <div className="md:pr-8">
            <a href="#" className="inline-flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-gradient-to-b from-accent to-card">
                <Wind className="h-3.5 w-3.5 text-brand" />
              </span>
              <span className="font-medium tracking-tight">Gregale</span>
            </a>
            <p className="mt-4 max-w-[26ch] text-sm leading-relaxed text-muted-foreground">
              Scale-to-zero serverless on real microVMs. Snapshot cold starts under 350ms.
            </p>

            <a
              href="#"
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-cat-security/40 hover:text-foreground"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cat-security opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cat-security" />
              </span>
              All systems operational
            </a>
          </div>

          {/* Link groups */}
          {LINK_GROUPS.map((group) => (
            <nav key={group.title} className="md:border-l md:border-border md:pl-6">
              <h3 className="label-mono text-muted-foreground/70">{group.title}</h3>
              <ul className="mt-4 flex flex-col gap-2.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href="#"
                      className="group inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                      {link.external && (
                        <ArrowUpRight className="h-3 w-3 -translate-x-0.5 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      {/* Oversized wordmark, clipped by the footer's bottom edge */}
      <div aria-hidden className="pointer-events-none relative select-none overflow-hidden">
        <p className="translate-y-[22%] bg-gradient-to-b from-foreground/[0.11] to-foreground/0 bg-clip-text text-center text-[19vw] font-semibold leading-[0.75] tracking-[-0.055em] text-transparent">
          GREGALE
        </p>
      </div>

      {/* Bottom bar */}
      <div className="relative border-t border-border bg-background/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-6">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Gregale. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            {SOCIALS.map((label) => (
              <a
                key={label}
                href="#"
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
