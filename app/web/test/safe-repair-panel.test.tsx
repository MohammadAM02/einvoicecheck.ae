// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement as h } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/* ------------------------------------------------------------------ */
/*  Hoisted mocks                                                      */
/* ------------------------------------------------------------------ */

const safeRepairLib = vi.hoisted(() => ({
  applySafeRepairs: vi.fn(),
  sha256Hex: vi.fn(),
}));

const xmlFile = vi.hoisted(() => ({
  downloadXml: vi.fn(),
  copyXml: vi.fn().mockResolvedValue(undefined),
}));

const analytics = vi.hoisted(() => ({ trackEvent: vi.fn() }));

vi.mock('@/lib/safe-repair', () => safeRepairLib);
vi.mock('@/lib/xml-file', () => xmlFile);
vi.mock('@/lib/analytics', () => analytics);

import { SafeRepairPanel } from '@/components/validation/SafeRepairPanel';
import type { SafeRepairAnalysis } from '@/lib/validation';

/* ------------------------------------------------------------------ */
/*  Fixtures                                                           */
/* ------------------------------------------------------------------ */

const ORIGINAL = '<?xml version="1.0" encoding="ISO-8859-1"?><Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"><cbc:ID>1</cbc:ID></Invoice>';

function candidateResult(overrides: Partial<SafeRepairAnalysis['candidate'] & { strictEligible: boolean }> = {}) {
  return {
    originalHash: 'a'.repeat(64),
    candidateHash: 'b'.repeat(64),
    audit: [
      {
        rule: 'FMT-DECL-01',
        action: 'replace' as const,
        target: '/processing-instruction(xml)',
        old: 'encoding="ISO-8859-1"',
        new: 'encoding="utf-8"',
        reason: 'Declared encoding did not match UTF-8.',
      },
    ],
    validation: {
      valid: true,
      inputFormat: 'xml' as const,
      validationScope: 'pint-ae-ubl-xml' as const,
      invoiceType: '380',
      schemaVersion: 'urn:peppol:pint:billing-1@ae-1',
      format: { status: 'passed' as const, issues: [] },
      structure: { status: 'passed' as const, issues: [] },
      semantic: { status: 'passed' as const, issues: [] },
    },
    strictEligible: true,
    ...overrides,
  };
}

function analysis(overrides: Partial<SafeRepairAnalysis> = {}): SafeRepairAnalysis {
  return {
    available: true,
    originalHash: 'a'.repeat(64),
    findings: [],
    candidate: candidateResult(),
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/*  Setup / Teardown                                                   */
/* ------------------------------------------------------------------ */

beforeEach(() => {
  safeRepairLib.applySafeRepairs.mockReturnValue({ output: '<repaired/>', audit: [] });
  safeRepairLib.sha256Hex.mockResolvedValue('b'.repeat(64));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderPanel(safeRepair: SafeRepairAnalysis) {
  return render(h(SafeRepairPanel, { original: ORIGINAL, safeRepair }));
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('SafeRepairPanel', () => {
  it('offers Apply safe repairs in Strict mode when the candidate is eligible', () => {
    renderPanel(analysis());

    expect(screen.getByTestId('safe-repair-candidate')).toBeTruthy();
    expect(screen.getByTestId('apply-safe-repairs-btn')).toBeTruthy();
    expect(screen.getByText(/passes the complete validation pipeline/)).toBeTruthy();
    expect(screen.queryByTestId('format-only-warning')).toBeNull();
    expect(screen.queryByTestId('safe-repair-advanced')).toBeNull();
  });

  it('applies the repairs only after the explicit action and verifies the hash', async () => {
    renderPanel(analysis());

    fireEvent.click(screen.getByTestId('apply-safe-repairs-btn'));

    await waitFor(() => expect(screen.getByTestId('safe-repair-applied')).toBeTruthy());
    expect(safeRepairLib.applySafeRepairs).toHaveBeenCalledWith(ORIGINAL);
    expect(screen.getByText(/hash verified/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Download XML' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeTruthy();
  });

  it('does not claim verified when the local candidate hash mismatches', async () => {
    safeRepairLib.sha256Hex.mockResolvedValue('x'.repeat(64));
    renderPanel(analysis());

    fireEvent.click(screen.getByTestId('apply-safe-repairs-btn'));

    await waitFor(() => expect(screen.getByTestId('safe-repair-applied')).toBeTruthy());
    expect(screen.getByText(/did not reproduce the server-validated bytes/)).toBeTruthy();
  });

  it('Strict mode refuses an ineligible candidate; Format-only is advanced and warns', async () => {
    renderPanel(analysis({
      candidate: candidateResult({
        strictEligible: false,
        validation: {
          valid: false,
          inputFormat: 'xml' as const,
          validationScope: 'pint-ae-ubl-xml' as const,
          invoiceType: '380',
          schemaVersion: 'urn:peppol:pint:billing-1@ae-1',
          format: { status: 'passed' as const, issues: [] },
          structure: { status: 'failed' as const, issues: [{ path: '/', rule: 'XSD-01', severity: 'error' as const, message: 'missing element', fix: '', line: null, column: null, xmlPath: null }] },
          semantic: { status: 'passed' as const, issues: [] },
        },
      }),
    }));

    // Strict: no apply button, blocking note, Advanced options collapsed.
    expect(screen.queryByTestId('apply-safe-repairs-btn')).toBeNull();
    expect(screen.getByText(/Strict mode: this candidate still has blocking issues/)).toBeTruthy();
    expect(screen.queryByTestId('format-only-warning')).toBeNull();

    // Advanced → format-only → prominent warning + full findings + apply.
    fireEvent.click(screen.getByText('Advanced options'));
    fireEvent.click(screen.getByTestId('format-only-toggle'));

    expect(screen.getByTestId('format-only-warning')).toBeTruthy();
    expect(screen.getByText('Format repaired — invoice still has blocking issues')).toBeTruthy();
    expect(screen.getByTestId('apply-format-only-btn')).toBeTruthy();
    // Full candidate findings remain visible.
    expect(screen.getByText(/missing element/)).toBeTruthy();

    fireEvent.click(screen.getByTestId('apply-format-only-btn'));
    await waitFor(() => expect(screen.getByTestId('safe-repair-applied')).toBeTruthy());
    // Applied format-only keeps the prominent warning.
    expect(screen.getByTestId('format-only-warning')).toBeTruthy();
  });

  it('shows diagnosis-only findings without a candidate', () => {
    renderPanel(analysis({
      available: false,
      candidate: null,
      findings: [
        {
          rule: 'ENG-FMT-CHARS-01',
          path: '/',
          severity: 'error' as const,
          message: 'Forbidden XML character U+0007 found at line 1, column 2 (character 1).',
          fix: 'Remove the character in the source system.',
          line: 1,
          column: 2,
          charIndex: 1,
        },
      ],
    }));

    expect(screen.getByTestId('safe-repair-findings')).toBeTruthy();
    expect(screen.getByText(/Forbidden XML character U\+0007/)).toBeTruthy();
    expect(screen.getByText(/at line 1, column 2/)).toBeTruthy();
    expect(screen.queryByTestId('safe-repair-candidate')).toBeNull();
    expect(screen.queryByTestId('apply-safe-repairs-btn')).toBeNull();
  });

  it('downloads the repaired XML from the applied state', async () => {
    renderPanel(analysis());
    fireEvent.click(screen.getByTestId('apply-safe-repairs-btn'));
    await waitFor(() => expect(screen.getByTestId('safe-repair-applied')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Download XML' }));
    expect(xmlFile.downloadXml).toHaveBeenCalledWith('repaired-invoice.xml', '<repaired/>');
  });
});
