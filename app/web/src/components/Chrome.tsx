'use client';

import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Todo({ children }: { children: string }) {
  return (
    <mark
      style={{
        background: '#fef08a',
        color: '#111827',
        fontWeight: 600,
        padding: '1px 6px',
        borderRadius: 4,
        border: '1px dashed #a16207',
        fontSize: '0.92em',
      }}
    >
      {children}
    </mark>
  );
}

export function GuardrailNotice() {
  return null;
}

type NavigationLink = {
  href: string;
  label: string;
  primary?: boolean;
};

const NAV_LINKS: readonly NavigationLink[] = [
  { href: '/#validate', label: 'Validate an invoice', primary: true },
  { href: '/docs', label: 'API' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/docs', label: 'Documentation' },
  { href: '/login', label: 'Sign in' },
];

function MenuIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function Chrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setMobileOpen(false);
      menuButtonRef.current?.focus();
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [mobileOpen]);

  // This component lives in the root layout, so it never remounts during
  // client-side navigation — a mount-once fetch would leave the nav's
  // auth state stale after login/logout. Re-fetch the session on every
  // route change (login -> /dashboard, logout -> /login) so the 5th nav
  // link flips between "Dashboard" and "Sign in" without a hard reload.
  useEffect(() => {
    let cancelled = false;

    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : Promise.resolve({ signedIn: false })))
      .then((data: { signedIn?: boolean }) => {
        if (!cancelled) setSignedIn(Boolean(data?.signedIn));
      })
      .catch(() => {
        if (!cancelled) setSignedIn(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  function renderLink(link: NavigationLink, mobile = false) {
    return (
      <Link
        key={`${mobile ? 'mobile' : 'desktop'}-${link.label}`}
        href={link.href}
        className={link.primary ? 'nav-primary-action' : 'nav-text-link'}
        onClick={mobile ? () => setMobileOpen(false) : undefined}
      >
        {link.label}
      </Link>
    );
  }

  const navigationLinks: readonly NavigationLink[] = signedIn
    ? [...NAV_LINKS.slice(0, -1), { href: '/dashboard', label: 'Dashboard' }]
    : NAV_LINKS;

  const buttonLabel = mobileOpen ? 'Close navigation' : 'Open navigation';

  return (
    <div className="app-shell">
      <div className="app-card">
        <nav className="navbar" aria-label="Primary navigation">
          <Link href="/" className="nav-brand" aria-label="einvoicecheck.ae home">
            <img
              src="/brand/einvoicecheck-lockup.svg"
              alt="einvoicecheck.ae"
              width="236"
              height="48"
            />
          </Link>
          <div className="nav-links">{navigationLinks.map((link) => renderLink(link))}</div>
          <button
            ref={menuButtonRef}
            type="button"
            className="mobile-menu-button"
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            aria-label={buttonLabel}
            onClick={() => setMobileOpen((open) => !open)}
          >
            <span aria-hidden="true" className="mobile-menu-button__icon">
              <MenuIcon open={mobileOpen} />
            </span>
            <span className="mobile-menu-button__label">{buttonLabel}</span>
          </button>
          {mobileOpen ? (
            <div id="mobile-navigation" className="mobile-menu">
              {navigationLinks.map((link) => renderLink(link, true))}
            </div>
          ) : null}
        </nav>
        <div className="app-content">{children}</div>
      </div>
    </div>
  );
}
