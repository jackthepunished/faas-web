import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from '@tanstack/react-router';
import { ArrowUpRight, Menu, Wind, X } from 'lucide-react';
import { SweepLink } from '@/components/sweep-link';
import { EASE } from './reveal';

const LINKS: { label: string; href: string; external: boolean; route?: '/docs' }[] = [
  { label: 'Platform', href: '#deploy', external: false },
  { label: 'Pricing', href: '#pricing', external: false },
  // There is a docs site now (`/docs`), so it no longer falls back to the
  // repository. The repository is still linked from the footer and from the
  // bottom of the docs index, for the material that stays internal.
  { label: 'Docs', href: '/docs', external: false, route: '/docs' },
];

function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <Link to="/" onClick={onClick} className="flex w-fit items-center gap-2.5">
      <span className="brand-mark">
        <Wind className="h-3.5 w-3.5" />
      </span>
      <span className="text-[15px] font-semibold tracking-tight">Gregale</span>
    </Link>
  );
}

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // The panel overlays the page, so the page beneath must not scroll.
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  // Keyboard users: focus moves into the panel when it opens and back to the
  // toggle when it closes, so it never lands on nothing.
  useEffect(() => {
    if (menuOpen) {
      panelRef.current?.querySelector<HTMLElement>('a, button')?.focus();
    } else if (wasOpen.current) {
      toggleRef.current?.focus();
    }
    wasOpen.current = menuOpen;
  }, [menuOpen]);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, delay: 0.15, ease: EASE }}
      // No chrome at rest: at the top of the page the nav is simply part of
      // the hero. A bar only materialises once there is content to sit over.
      className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300 ${
        scrolled || menuOpen
          ? 'border-border bg-background/80 backdrop-blur-xl'
          : 'border-transparent bg-transparent'
      }`}
    >
      {/* Container matches the hero's own width, so nav and hero share a grid. */}
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-6 px-5 sm:px-8 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:px-16">
        <Brand />

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {LINKS.map((link) =>
            // `/docs` is a route, not an anchor — going through the router
            // preloads its chunk and avoids a full document reload.
            link.route ? (
              <Link
                key={link.label}
                to={link.route}
                className="rounded-full px-3.5 py-1.5 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.label}
                href={link.href}
                {...(link.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                className="rounded-full px-3.5 py-1.5 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
              >
                {link.label}
              </a>
            )
          )}
        </nav>

        <div className="flex items-center gap-2 lg:justify-self-end">
          <SweepLink
            to="/login"
            className="hidden px-3 py-1.5 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground sm:block"
          >
            Sign in
          </SweepLink>
          <SweepLink
            to="/signup"
            className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-opacity duration-200 hover:opacity-90"
          >
            Start deploying
          </SweepLink>

          <button
            ref={toggleRef}
            type="button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen((v) => !v)}
            className="-mr-1.5 ml-1 rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground lg:hidden"
          >
            {menuOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
          </button>
        </div>
      </div>

      {/* Mobile panel — previously the links simply vanished below lg with
          no way to reach them at all. */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="overflow-hidden border-t border-border lg:hidden"
          >
            <nav
              id="mobile-nav"
              ref={panelRef}
              aria-label="Mobile"
              className="flex flex-col px-5 py-3 sm:px-8"
            >
              {LINKS.map((link) =>
                link.route ? (
                  <Link
                    key={link.label}
                    to={link.route}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-between border-b border-border/60 py-3.5 text-sm text-muted-foreground transition-colors last:border-0 hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.label}
                    href={link.href}
                    {...(link.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-between border-b border-border/60 py-3.5 text-sm text-muted-foreground transition-colors last:border-0 hover:text-foreground"
                  >
                    {link.label}
                    {link.external && <ArrowUpRight className="h-3.5 w-3.5" />}
                  </a>
                )
              )}
              <SweepLink
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="py-3.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:hidden"
              >
                Sign in
              </SweepLink>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
