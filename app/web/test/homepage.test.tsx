// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { createElement as h } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const workspace = vi.hoisted(() => vi.fn(({ context }: { context?: string }) =>
  h('div', { 'data-testid': 'validator-workspace', 'data-context': context }, 'Validate an invoice'),
));

vi.mock('@/components/validation/ValidatorWorkspace', () => ({ ValidatorWorkspace: workspace }));

import HomeClient from '@/components/HomeClient';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderHomepage() {
  return render(h(HomeClient));
}

describe('Homepage', () => {
  it('opens with tension, a concrete preflight promise and the live homepage input', () => {
    renderHomepage();

    expect(screen.getByRole('heading', { level: 1, name: "Your ERP can create the invoice. That doesn't mean the file is ready." })).toBeTruthy();
    expect(screen.getByText('Catch the broken field, mapping or total before it becomes an ASP rejection loop.')).toBeTruthy();
    expect(screen.getByText('Drop in PINT-AE XML. EInvoiceCheck shows what failed, where it failed, and the smallest practical fix.')).toBeTruthy();
    expect(screen.getByText('Validate an invoice')).toBeTruthy();
    expect(screen.getByTestId('validator-workspace').getAttribute('data-context')).toBe('homepage');
  });

  it('keeps the required conversion order', () => {
    const { container } = renderHomepage();
    const sections = [
      container.querySelector('#validate'),
      container.querySelector('#trust'),
      container.querySelector('#audience'),
      container.querySelector('#example'),
      container.querySelector('#api'),
      container.querySelector('#scope'),
      container.querySelector('#faq'),
      container.querySelector('#footer'),
    ];

    expect(sections.every(Boolean)).toBe(true);
    for (let index = 1; index < sections.length; index += 1) {
      expect(sections[index - 1]!.compareDocumentPosition(sections[index]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it('states concise trust facts without unsupported operational claims', () => {
    renderHomepage();

    for (const item of [
      'Browser validator: PINT-AE XML',
      'No signup required',
      'Invoice content not persisted by the app',
      'Independent preflight, not an ASP',
    ]) expect(screen.getByText(item)).toBeTruthy();
    expect(screen.queryByText(/PINT-AE XML \+ canonical JSON/)).toBeNull();
    expect(screen.queryByText(/99\.7%|Sub-50ms|SHA-256 Key Security/)).toBeNull();
  });

  it('shows the ERP-to-ASP route as one product story with a concrete diagnostic interruption', () => {
    renderHomepage();

    expect(screen.getByRole('heading', { name: 'Find the fault while it is still yours to fix.' })).toBeTruthy();
    expect(screen.getByText('ERP output')).toBeTruthy();
    expect(screen.getByText('EInvoiceCheck')).toBeTruthy();
    expect(screen.getByText('Your ASP')).toBeTruthy();
    expect(screen.getByText('Buyer TRN failed')).toBeTruthy();
    expect(screen.getByText(/14 digits found/)).toBeTruthy();
    expect(screen.getByText('Use the 15-digit UAE TRN.')).toBeTruthy();
    expect(screen.getByText('Source data')).toBeTruthy();
    expect(screen.getByText('Mapping')).toBeTruthy();
    expect(screen.getByText('Final XML')).toBeTruthy();
  });

  it('shows one representative error as an actionable result, not a generic invalid state', () => {
    renderHomepage();

    expect(screen.getByRole('heading', { name: 'Don’t get an “invalid invoice.” Get the reason.' })).toBeTruthy();
    expect(screen.getByText('Rule. Location. Meaning. Fix. Enough information to move the invoice forward.')).toBeTruthy();
    expect(screen.getByText('Buyer TRN is not a valid 15-digit UAE TRN.')).toBeTruthy();
    expect(screen.getByText('Fix: Use exactly 15 numeric digits.')).toBeTruthy();
    expect(screen.getAllByText('Technical details')).toHaveLength(1);
  });

  it('makes API automation the continuation after single-invoice value is clear', () => {
    renderHomepage();

    expect(screen.getByRole('heading', { name: 'When one clean invoice becomes a thousand.' })).toBeTruthy();
    expect(screen.getByText('Put the same preflight checks inside your ERP, CI or delivery workflow.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Automate with the API' }).getAttribute('href')).toBe('/signup');
    expect(screen.getByRole('link', { name: 'View pricing' }).getAttribute('href')).toBe('/pricing');
  });

  it('keeps scope, limitations and privacy available through progressive disclosure', () => {
    renderHomepage();

    expect(screen.getByRole('heading', { name: 'Details, when you need them.' })).toBeTruthy();
    for (const label of ['What we check', 'Current limitations', 'Privacy and data handling']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    for (const item of [
      'Invoice type and required terms',
      'Supplier and buyer UAE TRN format',
      'Currency and code-list membership',
      'VAT category and rate consistency',
      'Line arithmetic, tax breakdown and totals',
      'No claim of complete official XSD or Schematron parity/version coverage',
      'FTA registration lookup',
      'Legal transmission, filing or archival',
      'Guaranteed ASP or authority acceptance',
    ]) expect(screen.getByText(item)).toBeTruthy();
    expect(screen.getByText('Preflight only. Supported checks still include format, structure and semantic layers; your accredited provider still handles legal transmission.')).toBeTruthy();
  });

  it('uses a short FAQ and retains footer destinations', () => {
    renderHomepage();

    for (const question of [
      'Are you an accredited ASP?',
      'What does “preflight passed” mean?',
      'Is my invoice stored?',
      'Which formats can I upload?',
      'What is the free limit?',
    ]) expect(screen.getByText(question)).toBeTruthy();
    expect(screen.getByText('UBL / PINT-AE XML.')).toBeTruthy();
    expect(screen.queryByText('Does the API check more rules than the free validator?')).toBeNull();

    for (const [name, href] of [
      ['Privacy', '/legal/privacy'],
      ['Terms', '/legal/terms'],
      ['Refunds', '/legal/refunds'],
      ['Contact', '/contact'],
      ['Documentation', '/docs'],
    ]) expect(screen.getByRole('link', { name }).getAttribute('href')).toBe(href);
  });

  it('offers a footer return action that targets the validator anchor', () => {
    renderHomepage();

    const link = screen.getByRole('link', { name: 'Back to validator' });
    expect(link.getAttribute('href')).toBe('#validate');
    expect(link.closest('nav')).toBeTruthy();
  });

  it('has no serious or critical accessibility violations', async () => {
    const { container } = renderHomepage();
    const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });

    expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
  });
});
