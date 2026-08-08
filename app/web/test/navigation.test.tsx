// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement as h } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const navigation = vi.hoisted(() => ({ pathname: '/' }));

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
}));

import { Chrome } from '@/components/Chrome';

const REQUIRED_LINKS = [
  ['Validate an invoice', '/#validate'],
  ['XML Generator', '/tools/xml-generator'],
  ['XML Repairer', '/tools/xml-repairer'],
  ['What We Check', '/what-we-check'],
  ['API Docs', '/docs'],
  ['Pricing', '/pricing'],
  ['Sign in', '/login'],
] as const;

const source = (...parts: string[]) => readFileSync(path.join(process.cwd(), 'src', ...parts), 'utf8');

afterEach(() => {
  cleanup();
  navigation.pathname = '/';
});

function renderChrome() {
  return render(h(Chrome, null, h('main', null, 'Page content')));
}

function openMobileNavigation() {
  const button = screen.getByRole('button', { name: 'Open navigation' });
  fireEvent.click(button);
  return button;
}

describe('Chrome navigation', () => {
  it('renders the approved logo and an accessible closed mobile navigation button', () => {
    renderChrome();

    const brand = screen.getByRole('link', { name: 'einvoicecheck.ae home' });
    expect(brand.querySelector('img')?.getAttribute('src')).toBe('/brand/einvoicecheck-lockup.svg');
    const button = screen.getByRole('button', { name: 'Open navigation' });
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('aria-controls')).toBe('mobile-navigation');
  });

  it('opens the mobile menu and updates its visible label and expanded state', () => {
    renderChrome();
    const button = openMobileNavigation();

    expect(button.textContent).toContain('Close navigation');
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById('mobile-navigation')).toBeTruthy();
  });

  it('includes every desktop destination in the mobile menu', () => {
    renderChrome();
    openMobileNavigation();
    const menu = document.getElementById('mobile-navigation');

    for (const [label, href] of REQUIRED_LINKS) {
      const link = screen.getAllByRole('link', { name: label }).find((candidate) => menu?.contains(candidate));
      expect(link?.getAttribute('href')).toBe(href);
    }
  });

  it('keeps the dedicated What We Check source-of-truth destination in navigation', () => {
    renderChrome();

    expect(screen.getByRole('link', { name: 'What We Check' }).getAttribute('href')).toBe('/what-we-check');
  });

  it('uses one API Docs destination instead of duplicate API and Documentation links', () => {
    renderChrome();

    expect(screen.getByRole('link', { name: 'API Docs' }).getAttribute('href')).toBe('/docs');
    expect(screen.queryByRole('link', { name: 'API' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Documentation' })).toBeNull();
  });

  it('closes the mobile menu when a mobile link is clicked', () => {
    renderChrome();
    openMobileNavigation();
    const menu = document.getElementById('mobile-navigation');
    const pricing = screen.getAllByRole('link', { name: 'Pricing' }).find((candidate) => menu?.contains(candidate));
    pricing?.addEventListener('click', (event) => event.preventDefault(), { once: true });

    fireEvent.click(pricing!);

    expect(screen.getByRole('button', { name: 'Open navigation' }).getAttribute('aria-expanded')).toBe('false');
    expect(document.getElementById('mobile-navigation')).toBeNull();
  });

  it('closes on Escape and returns focus to the menu button', () => {
    renderChrome();
    const button = openMobileNavigation();
    const menu = document.getElementById('mobile-navigation');
    const firstLink = menu?.querySelector('a') as HTMLAnchorElement;
    firstLink.focus();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(button);
  });

  it('closes when the pathname changes', () => {
    const view = renderChrome();
    const button = openMobileNavigation();

    navigation.pathname = '/pricing';
    view.rerender(h(Chrome, null, h('main', null, 'Pricing content')));

    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(document.getElementById('mobile-navigation')).toBeNull();
  });

  it('does not render decorative landing background layers', () => {
    const { container } = renderChrome();

    for (const className of ['bg-layer', 'bg-gradient', 'bg-grid', 'bg-orb']) {
      expect(container.querySelector(`.${className}`)).toBeNull();
    }
  });
});

describe('UAE Compliance Desk visual system source', () => {
  it('uses the approved light metadata, favicon and layered styles', () => {
    const layout = source('app', 'layout.tsx');
    const css = source('app', 'globals.css');

    expect(layout).not.toMatch(/<html[^>]*className=["']dark["']/);
    expect(layout).toContain("title: 'einvoicecheck.ae — UAE E-Invoice Preflight'");
    expect(layout).toContain("description: 'Independent preflight checks for UAE PINT-AE XML and canonical invoice JSON.'");
    expect(layout).toContain("import './visual-compression.css';");
    expect(layout).toContain("icon: '/icon.svg'");
    for (const token of [
      '--accent: #087f6b;',
      '--accent-hover: #066b5a;',
      '--accent-subtle: #e7f5f1;',
      '--navy: #102a43;',
      '--ink: #18324a;',
      '--bg: #f7f8f5;',
      '--bg-card: #ffffff;',
      '--border: #d7dfdc;',
      'color-scheme: light;',
    ]) expect(css).toContain(token);
  });

  it('contains responsive, interaction, and reduced-motion safeguards', () => {
    const css = source('app', 'globals.css');
    const compressionCss = source('app', 'visual-compression.css');

    expect(css).toMatch(/@media\s*\(max-width:\s*767px\)/);
    expect(css).toMatch(/min-height:\s*44px/);
    expect(css).toMatch(/outline:\s*3px\s+solid/);
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('animation-duration: 0.01ms !important;');
    expect(css).toContain('transition-duration: 0.01ms !important;');
    expect(compressionCss).toContain('.process-flow');
    expect(compressionCss).toContain('.failure-cards');
    expect(compressionCss).toContain('.disclosure-list');
    expect(compressionCss).toContain('.api-spotlight');
  });

  it('defines every focused compliance desk class', () => {
    const css = source('app', 'globals.css');
    for (const className of [
      'compliance-hero', 'hero-copy', 'eyebrow', 'validator-workspace', 'upload-zone',
      'upload-zone.is-dragging', 'validation-summary', 'validation-summary__actions',
      'validation-issue', 'validation-issue--error', 'validation-issue--warning',
      'validation-issue__heading', 'validation-fix', 'trust-strip', 'trust-strip__item',
      'problem-section', 'preflight-path', 'failure-list', 'example-result', 'api-heading', 'comparison-grid', 'comparison-card',
      'scope-panel', 'scope-grid', 'batch-panel', 'mobile-menu-button', 'mobile-menu',
    ]) expect(css).toContain(`.${className}`);
  });

  it('contains no mojibake markers in visual system files', () => {
    const mojibake = new RegExp(['\\u00c3\\u00a2', '\\u00c3\\u201a', '\\u00c3\\u0192', '\\ufffd'].join('|'), 'u');
    const files = [
      source('components', 'Chrome.tsx'),
      source('app', 'globals.css'),
      source('app', 'visual-compression.css'),
      source('app', 'layout.tsx'),
      readFileSync(path.join(process.cwd(), 'test', 'navigation.test.tsx'), 'utf8'),
    ];

    for (const contents of files) expect(contents).not.toMatch(mojibake);
  });
});
