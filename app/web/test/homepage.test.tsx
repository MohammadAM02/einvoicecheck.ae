// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { createElement as h } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const workspace = vi.hoisted(() => vi.fn(({ context }: { context?: string }) =>
  h('div', { 'data-testid': 'validator-workspace', 'data-context': context }, 'Validate a file — free'),
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
  it('leads with free UAE preflight validation and mounts the homepage workspace', () => {
    renderHomepage();

    expect(screen.getByText('Independent UAE e-invoice preflight')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: 'Check your UAE e-invoice before it reaches your ASP.' })).toBeTruthy();
    expect(screen.getByText('Upload XML or JSON and get a clear list of semantic, VAT, and arithmetic issues. Free, no signup, and invoice payloads are not stored.')).toBeTruthy();
    expect(screen.getByText('Validate a file — free')).toBeTruthy();
    expect(screen.getByTestId('validator-workspace').getAttribute('data-context')).toBe('homepage');
  });

  it('places the product explanation in the required conversion order', () => {
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

  it('states the trust facts without unsupported operational claims', () => {
    renderHomepage();

    for (const item of [
      'UAE-focused semantic preflight',
      'XML and JSON accepted',
      'Invoice payloads not stored',
      'Independent tool — not an accredited ASP',
    ]) expect(screen.getByText(item)).toBeTruthy();
    expect(screen.queryByText(/99\.7%|Sub-50ms|SHA-256 Key Security/)).toBeNull();
  });

  it('shows its audiences, representative repair list, conversion paths, and scope', () => {
    renderHomepage();

    for (const [title, description] of [
      ['Finance teams', 'Find invoice data and totals problems before handoff.'],
      ['ERP and software vendors', 'Test UAE invoice exports during development and CI.'],
      ['Integrators and consultants', 'Give clients a consistent, machine-readable repair list.'],
    ]) {
      expect(screen.getByRole('heading', { name: title })).toBeTruthy();
      expect(screen.getByText(description)).toBeTruthy();
    }

    expect(screen.getByText('Example only — not a live result.')).toBeTruthy();
    expect(screen.getByText('Buyer TRN is not a valid 15-digit UAE TRN.')).toBeTruthy();
    expect(screen.getByText('Fix: Use exactly 15 numeric digits.')).toBeTruthy();
    expect(screen.getByText('Amount due does not reconcile with the tax-inclusive total.')).toBeTruthy();
    expect(screen.getByText('Fix: Set Amount due to the reconciled total.')).toBeTruthy();
    expect(screen.getAllByText('Technical details')).toHaveLength(2);
    expect(screen.getByText('/customer/trn')).toBeTruthy();
    expect(screen.getByText('ENG-TRN-04/BT-48')).toBeTruthy();
    expect(screen.getByText('/totals/payableAmount')).toBeTruthy();
    expect(screen.getByText('ENG-TOT-16/IBR-CO-16')).toBeTruthy();

    expect(screen.getByRole('heading', { name: 'Free validator' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Validation API' })).toBeTruthy();
    for (const feature of [
      'no account',
      'manual upload/paste',
      '20 validations/hour/IP',
      'same engine/error format',
      'API key',
      'ERP/CI/automated flows',
      'plan-based quotas and per-minute limits',
      'machine-readable results',
    ]) expect(screen.getByText(feature)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Automate with the API' }).getAttribute('href')).toBe('/signup');
    expect(screen.getByRole('link', { name: 'View pricing' }).getAttribute('href')).toBe('/pricing');
    expect(screen.getByText('Currently included')).toBeTruthy();
    expect(screen.getByText('Not currently included')).toBeTruthy();
    for (const item of [
      'Invoice type/required terms',
      'Supplier/buyer UAE TRN format',
      'Currency/code-list membership',
      'VAT category/rate consistency',
      'Line arithmetic/tax breakdown/totals/payable reconciliation',
      'Complete official XSD/Schematron conformity',
      'FTA registration lookup',
      'Legal transmission/filing',
      'Statutory archival',
      'Guaranteed ASP/authority acceptance',
    ]) expect(screen.getByText(item)).toBeTruthy();
    expect(screen.getByText('Preflight only. Your accredited provider still handles legal transmission.')).toBeTruthy();
  });

  it('answers the approved FAQ and removes the retired signup and pricing claims', () => {
    renderHomepage();

    for (const question of [
      'Is einvoicecheck.ae an FTA-accredited service provider?',
      'What does a preflight pass mean?',
      'Are invoice payloads stored?',
      'What formats are supported?',
      'What is the free-tool limit?',
      'Does the API check more rules than the free validator?',
    ]) expect(screen.getByText(question)).toBeTruthy();
    expect(screen.queryByText(/Most Popular|\$29|\$99|Try the Validator|Would be rejected/)).toBeNull();
  });

  it('has no serious or critical accessibility violations', async () => {
    const { container } = renderHomepage();
    // jsdom lacks canvas; browser QA covers color contrast with a real renderer.
    const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });

    expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
  });
});
