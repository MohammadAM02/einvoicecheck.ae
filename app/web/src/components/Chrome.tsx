'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { GUARDRAIL } from '@/lib/site';

/**
 * Renders an unresolved real-world fact as a visible placeholder.
 * Never replace one of these with an invented value.
 */
export function Todo({ children }: { children: string }) {
  return <mark className="todo">{children}</mark>;
}

export function SiteHeader() {
  useEffect(() => {
    const nav = document.querySelector('header.site');
    if (!nav) return;
    const handler = () => {
      nav.classList.toggle('scrolled', window.scrollY > 20);
    };
    window.addEventListener('scroll', handler, { passive: true });
    handler();
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <header className="site">
      <div className="bar">
        <Link href="/" className="brand">
          einvoicecheck<span>.ae</span>
        </Link>
        <nav>
          <Link href="/pricing">Pricing</Link>
          <Link href="/docs">Docs</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/tools/uae-e-invoice-validator">Try it</Link>
          <Link href="/login">Sign in</Link>
          <Link href="/signup" className="nav-cta">
            Get an API key →
          </Link>
        </nav>
      </div>
    </header>
  );
}

/** The honesty block. Must appear on every page — it is the positioning. */
export function GuardrailNotice() {
  return (
    <div className="notice">
      <strong>What this is not</strong>
      <p>{GUARDRAIL}</p>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="site">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link href="/" className="brand" style={{ fontSize: 16 }}>
              einvoicecheck<span>.ae</span>
            </Link>
            <p>
              Preflight validation for UAE e-invoicing. Catch file errors before
              your accredited provider does.
            </p>
          </div>
          <div className="footer-col">
            <h5>Product</h5>
            <Link href="/pricing">Pricing</Link>
            <Link href="/docs">API docs</Link>
            <Link href="/signup">Sign up</Link>
          </div>
          <div className="footer-col">
            <h5>Free tools</h5>
            <Link href="/tools/uae-e-invoice-validator">UAE e-invoice validator</Link>
            <Link href="/tools/pint-ae-validator">PINT AE validator</Link>
            <Link href="/tools/trn-format-checker">TRN format checker</Link>
          </div>
          <div className="footer-col">
            <h5>Compare</h5>
            <Link href="/alternatives/cleartax">ClearTax alternatives</Link>
            <Link href="/alternatives/comarch">Comarch alternatives</Link>
            <Link href="/alternatives/sovos">Sovos alternatives</Link>
          </div>
          <div className="footer-col">
            <h5>Company</h5>
            <Link href="/blog">Blog</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/legal/terms">Terms of Service</Link>
            <Link href="/legal/privacy">Privacy Policy</Link>
            <Link href="/legal/refunds">Refund Policy</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>&copy; {new Date().getFullYear()} einvoicecheck.ae</span>
          <span>Dubai, UAE</span>
        </div>
        <p className="fine" style={{ marginTop: 16 }}>
          Payments are processed by Dodo Payments and Lemon Squeezy, which act
          as the merchant of record for all purchases.
        </p>
        <p className="fine">{GUARDRAIL}</p>
        <p className="fine" style={{ marginTop: 8 }}>
          Before you file anything, check the official Ministry of Finance and
          Federal Tax Authority guidance and use an accredited service provider
          from the official list.
        </p>
      </div>
    </footer>
  );
}
