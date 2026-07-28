'use client';

import type React from 'react';
import { createElement as h, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Todo({ children }: { children: string }) {
  return h('mark', {
    style: {
      background: '#fef08a',
      color: '#111827',
      fontWeight: 600,
      padding: '1px 6px',
      borderRadius: 4,
      border: '1px dashed #a16207',
      fontSize: '0.92em',
    },
  }, children);
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

export function Chrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
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

  function renderLink(link: NavigationLink, mobile = false) {
    return h(Link, {
      key: `${mobile ? 'mobile' : 'desktop'}-${link.label}`,
      href: link.href,
      className: link.primary ? 'nav-primary-action' : 'nav-text-link',
      onClick: mobile ? () => setMobileOpen(false) : undefined,
    }, link.label);
  }

  const buttonLabel = mobileOpen ? 'Close navigation' : 'Open navigation';

  return h('div', { className: 'app-shell' },
    h('div', { className: 'app-card' },
      h('nav', { className: 'navbar', 'aria-label': 'Primary navigation' },
        h(Link, { href: '/', className: 'nav-brand' }, 'einvoicecheck.ae'),
        h('div', { className: 'nav-links' }, ...NAV_LINKS.map((link) => renderLink(link))),
        h('button', {
          ref: menuButtonRef,
          type: 'button',
          className: 'mobile-menu-button',
          'aria-expanded': mobileOpen,
          'aria-controls': 'mobile-navigation',
          onClick: () => setMobileOpen((open) => !open),
        },
        h('span', { 'aria-hidden': true, className: 'mobile-menu-button__icon' }, mobileOpen ? '×' : '☰'),
        h('span', { className: 'mobile-menu-button__label' }, buttonLabel)),
        mobileOpen ? h('div', { id: 'mobile-navigation', className: 'mobile-menu' },
          ...NAV_LINKS.map((link) => renderLink(link, true)),
        ) : null,
      ),
      h('div', { className: 'app-content' }, children),
    ),
  );
}
