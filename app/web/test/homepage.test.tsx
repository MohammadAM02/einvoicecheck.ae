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
  it('leads with a concise ERP preflight message and mounts the homepage workspace', () => {
    renderHomepage();

    expect(screen.getByRole('heading', { level: 1, name: 'Check your UAE e-invoice before your ASP does' })).toBeTruthy();
    expect(screen.getByText('Your ERP creates the invoice. We check whether it will pass.')).toBeTruthy();
    expect(screen.getByText('Upload PINT-AE XML. Get the exact field and fix.')).toBeTruthy();
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

  it('uses a visual three-step process and three compact failure cards', () => {
    renderHomepage();

    expect(screen.getByRole('heading', { name: 'See where the invoice breaks.' })).toBeTruthy();
    expect(screen.getByText('One quick check between your ERP and ASP.')).toBeTruthy();
    for (const item of ['ERP export', 'Preflight check', 'ASP submission', 'Invoice created', 'Errors explained', 'Ready to send']) {
      expect(screen.getByText(item)).toBeTruthy();
    }
    for (const problem of ['Rejected invoice', 'Broken ERP mapping', 'Wrong invoice data']) {
      expect(screen.getByRole('heading', { name: problem })).toBeTruthy();
    }
    expect(screen.queryByText('ERP configuration problems')).toBeNull();
    expect(screen.queryByText('Unclear validation errors')).toBeNull();
  });

  it('shows one representative error and one concise API continuation', () => {
    renderHomepage();

    expect(screen.getByRole('heading', { name: 'One error. One clear fix.' })).toBeTruthy();
    expect(screen.getByText('No XML archaeology required.')).toBeTruthy();
    expect(screen.getByText('Buyer TRN is not a valid 15-digit UAE TRN.')).toBeTruthy();
    expect(screen.getByText('Fix: Use exactly 15 numeric digits.')).toBeTruthy();
    expect(screen.getAllByText('Technical details')).toHaveLength(1);

    expect(screen.getByRole('heading', { name: 'Validating more than one invoice?' })).toBeTruthy();
    expect(screen.getByText('Add the same checks inside your ERP or workflow.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Automate with the API' }).getAttribute('href')).toBe('/signup');
    expect(screen.getByRole('link', { name: 'View pricing' }).getAttribute('href')).toBe('/pricing');
    expect(screen.queryByRole('heading', { name: 'Free validator' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Validation API' })).toBeNull();
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

  it('has no serious or critical accessibility violations', async () => {
    const { container } = renderHomepage();
    const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });

    expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
  });
});
