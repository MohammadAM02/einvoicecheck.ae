'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GUARDRAIL } from '@/lib/site';

/* ---- Logo SVG ---- */
function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="currentColor">
      <path d="M 64 128 L 64.5 128 L 32 95 L 0 64 L 0 0 L 64 0 L 128 64 L 128 64.5 L 161 32 L 192 0 L 256 0 L 256 64 L 192 128 L 128 128 L 128 192 L 96 223 L 63.5 256 L 0 256 L 0 192 Z M 256 192 L 224 223 L 191.5 256 L 128 256 L 128 192 L 192 128 L 256 128 Z" />
    </svg>
  );
}

/* ---- Inline Icons ---- */
function Icon({ d, size = 24 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle', position: 'relative', top: -2 }}>
      <path d={d} />
    </svg>
  );
}
const MenuIcon = () => <Icon d="M3 12h18M3 6h18M3 18h18" />;
const XIcon = () => <Icon d="M18 6L6 18M6 6l12 12" />;

const NAV = [
  { label: 'Validate', href: '/tools/uae-e-invoice-validator' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Docs', href: '/docs' },
  { label: 'API Status', href: '/health' },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', h, { passive: true });
    h();
    return () => window.removeEventListener('scroll', h);
  }, []);

  const close = useCallback(() => setMenuOpen(false), []);

  return (
    <header className={`site${scrolled ? ' scrolled' : ''}`}>
      <div className="bar">
        <Link href="/" className="brand" style={{ color: 'var(--accent)' }}>
          <Logo size={28} />
          <span style={{ color: 'var(--ink)' }}>einvoicecheck<span style={{ color: 'var(--accent)' }}>.ae</span></span>
        </Link>

        {/* Desktop nav */}
        <div className="nav-links" style={{ display: 'none' }}>
          {NAV.map((l) => (
            <Link key={l.label} href={l.href}>{l.label}</Link>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div style={{ display: 'none', gap: 12, alignItems: 'center' }}>
          <Link href="/login" className="nav-signin">Sign In</Link>
          <Link href="/signup" className="nav-cta">Start For Free</Link>
        </div>

        {/* Hamburger */}
        <button className="hamburger" onClick={() => setMenuOpen(true)} aria-label="Menu">
          <MenuIcon />
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div className="menu-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} onClick={close} />
            <motion.div className="menu-sheet" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
              <div className="menu-sheet-header">
                <Link href="/" className="brand" onClick={close} style={{ color: 'var(--accent)' }}>
                  <Logo size={24} />
                  <span style={{ color: 'var(--ink)', fontSize: 16 }}>einvoicecheck<span style={{ color: 'var(--accent)' }}>.ae</span></span>
                </Link>
                <motion.button className="menu-close-btn" whileTap={{ scale: 0.9 }} onClick={close} aria-label="Close">
                  <XIcon />
                </motion.button>
              </div>
              <div className="menu-divider" />
              {NAV.map((l, i) => (
                <motion.div key={l.label} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.18 + i * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
                  <Link href={l.href} className="menu-link" onClick={close}>{l.label}</Link>
                </motion.div>
              ))}
              <div className="menu-divider" />
              <Link href="/signup" className="menu-cta menu-cta-primary" onClick={close}>Start For Free</Link>
              <Link href="/login" className="menu-cta menu-cta-secondary" onClick={close}>Sign In</Link>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Responsive CSS override via style tag — show desktop nav at ≥768px */}
      <style jsx>{`
        @media (min-width: 768px) {
          .nav-links { display: flex !important; }
          .bar > div:last-of-type { display: flex !important; }
          .hamburger { display: none !important; }
        }
      `}</style>
    </header>
  );
}

export function Todo({ children }: { children: string }) {
  return <mark className="todo" style={{ background: '#fef08a', color: '#111827', fontWeight: 600, padding: '1px 6px', borderRadius: 4, border: '1px dashed #a16207', fontSize: '0.92em' }}>{children}</mark>;
}

export function GuardrailNotice() {
  return null;
}

export function SiteFooter() {
  return (
    <footer className="site">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link href="/" className="brand" style={{ fontSize: 16, color: 'var(--accent)' }}>
              <Logo size={20} />
              <span style={{ color: 'var(--ink)' }}>einvoicecheck<span style={{ color: 'var(--accent)' }}>.ae</span></span>
            </Link>
            <p>Preflight validation for UAE e-invoicing. Catch file errors before your accredited provider does.</p>
          </div>
          <div className="footer-col"><h5>Product</h5><Link href="/pricing">Pricing</Link><Link href="/docs">API docs</Link><Link href="/signup">Sign up</Link></div>
          <div className="footer-col"><h5>Free tools</h5><Link href="/tools/uae-e-invoice-validator">Validator</Link><Link href="/tools/pint-ae-validator">PINT AE</Link><Link href="/tools/trn-format-checker">TRN checker</Link></div>
          <div className="footer-col"><h5>Compare</h5><Link href="/alternatives/cleartax">vs ClearTax</Link><Link href="/alternatives/comarch">vs Comarch</Link><Link href="/alternatives/sovos">vs Sovos</Link></div>
          <div className="footer-col"><h5>Company</h5><Link href="/blog">Blog</Link><Link href="/contact">Contact</Link><Link href="/legal/terms">Terms</Link><Link href="/legal/privacy">Privacy</Link></div>
        </div>
        <div className="footer-bottom">
          <span>&copy; {new Date().getFullYear()} einvoicecheck.ae</span>
          <span>Dubai, UAE</span>
        </div>
        <p className="fine" style={{ marginTop: 16 }}>Payments processed by Lemon Squeezy, merchant of record.</p>
        <p className="fine">{GUARDRAIL}</p>
      </div>
    </footer>
  );
}
