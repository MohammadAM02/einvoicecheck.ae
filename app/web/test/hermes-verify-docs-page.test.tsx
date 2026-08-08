// @vitest-environment jsdom
// Ad-hoc verification for the Task 6 docs rewrite (hermes-verify).
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    // eslint-disable-next-line @next/next/no-html-link-for-pages
    <a href={href} {...rest}>{children}</a>
  ),
}));

import DocsPage from '@/app/docs/page';

afterEach(cleanup);

describe('docs page scope copy (ad-hoc)', () => {
  it('renders v2 as XML-only strict layered validation', () => {
    render(<DocsPage />);
    expect(screen.getAllByRole('heading', { name: 'POST /v2/validate' }).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/Strict UBL 2\.1 \/ PINT AE XML validation for Invoice and CreditNote/).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/structure \(UBL 2\.1 XSD schema validation/).length).toBeGreaterThan(0);
  });

  it('documents v1 as legacy flat XML and preflight as JSON data-preflight only', () => {
    render(<DocsPage />);
    expect(screen.getAllByRole('heading', { name: 'POST /v1/validate' }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Legacy flat XML contract/).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('heading', { name: 'POST /v1/preflight' }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/does not validate final UBL XML structure/).length).toBeGreaterThan(0);
    const body = document.body.textContent ?? '';
    expect(body).toMatch(/Canonical JSON is not accepted here/);
  });

  it('no longer claims /v1/validate accepts canonical JSON or JSON envelopes', () => {
    render(<DocsPage />);
    const body = document.body.textContent ?? '';
    expect(body).not.toMatch(/Accepted inputs are canonical JSON/i);
    expect(body).not.toMatch(/a JSON envelope\s+containing XML/i);
  });
});
