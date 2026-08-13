import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from '@tanstack/react-router';
import { Wind } from 'lucide-react';
import { EASE } from './reveal';

const LINKS = [
  { label: 'Platform', href: '#deploy', external: false },
  { label: 'Pricing', href: '#pricing', external: false },
  // No docs site yet — the source repository is the honest destination.
  { label: 'Source', href: 'https://github.com/poyrazK/faas', external: true },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <motion.div
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.2, ease: EASE }}
        className={`flex items-center rounded-full border p-1.5 pl-5 backdrop-blur-xl transition-all duration-500 ${
          scrolled
            ? 'border-white/15 bg-black/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_40px_rgba(0,0,0,0.55)]'
            : 'border-white/10 bg-white/[0.04] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.35)]'
        }`}
      >
        {/* Brand */}
        <a href="#" className="flex items-center gap-2.5 pr-5">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-gradient-to-b from-white/10 to-transparent">
            <Wind className="h-3.5 w-3.5 text-brand" />
          </span>
          <span className="text-sm font-medium tracking-tight">Gregale</span>
        </a>

        <span className="hidden h-5 w-px bg-white/10 md:block" />

        {/* Links */}
        <nav className="hidden items-center px-2 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              {...(link.external ? { target: '_blank', rel: 'noreferrer' } : {})}
              className="rounded-full px-3.5 py-1.5 text-[13px] text-muted-foreground transition-colors duration-200 hover:bg-white/5 hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <span className="hidden h-5 w-px bg-white/10 md:block" />

        {/* Actions */}
        <div className="flex items-center gap-1.5 pl-3">
          <Link
            to="/login"
            className="hidden rounded-full px-3.5 py-1.5 text-[13px] text-muted-foreground transition-colors duration-200 hover:text-foreground sm:block"
          >
            Sign In
          </Link>
          <Link
            to="/signup"
            className="rounded-full bg-primary px-4 py-1.5 text-[13px] font-medium text-primary-foreground shadow-[0_0_16px_rgba(168,198,254,0.25)] transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_24px_rgba(168,198,254,0.4)]"
          >
            Open dashboard
          </Link>
        </div>
      </motion.div>
    </header>
  );
}
