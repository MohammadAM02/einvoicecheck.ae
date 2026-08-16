'use client';

import type React from 'react';
import { createElement as h, useState } from 'react';
import { trackEvent } from '@/lib/analytics';
import { applySafeRepairs, sha256Hex } from '@/lib/safe-repair';
import type { SafeRepairAnalysis, SafeRepairFinding, XmlValidationResult } from '@/lib/validation';
import { flattenValidationIssues } from '@/lib/validation-ui';
import { copyXml, downloadXml } from '@/lib/xml-file';
import { ValidationIssueList } from './ValidationIssueList';

type PanelState =
  | { mode: 'idle' }
  | { mode: 'applying' }
  | { mode: 'applied'; output: string; verified: boolean | null };

/**
 * Apply safe repairs — Validator-integrated repair surface (Part B).
 *
 * Validation remains read-only: the candidate analysis rides along on the
 * /v2/validate result, and the repaired XML is materialized HERE only after an
 * explicit UI action. Strict mode (default) only offers the candidate when it
 * passes the complete validateXmlDocument() pipeline; Format-only is an
 * explicit Advanced option that never claims validity and always shows a
 * prominent warning with the full candidate findings.
 */
export function SafeRepairPanel(props: {
  original: string;
  safeRepair: SafeRepairAnalysis;
}): React.ReactElement {
  const { original, safeRepair } = props;
  const [state, setState] = useState<PanelState>({ mode: 'idle' });
  const [formatOnly, setFormatOnly] = useState(false);
  const [copied, setCopied] = useState(false);

  const candidate = safeRepair.candidate;
  const strictEligible = candidate?.strictEligible === true;
  const hasFindings = safeRepair.findings.length > 0;

  async function apply() {
    if (!candidate || state.mode === 'applying') return;
    setState({ mode: 'applying' });
    trackEvent('validator_repair_applied', { strictEligible });
    try {
      const { output } = applySafeRepairs(original);
      // The server validated this exact candidate; verify the local transform
      // reproduces it byte-for-byte when WebCrypto is available.
      let verified: boolean | null = null;
      const localHash = await sha256Hex(output);
      if (localHash !== null) {
        verified = localHash === candidate.candidateHash;
        if (!verified) {
          trackEvent('validator_repair_mismatch', {});
        }
      }
      setState({ mode: 'applied', output, verified });
    } catch {
      setState({ mode: 'idle' });
    }
  }

  function download(output: string) {
    trackEvent('validator_repair_download', { strictEligible });
    downloadXml('repaired-invoice.xml', output);
  }

  async function copy(output: string) {
    try {
      await copyXml(output);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* noop */
    }
  }

  const showFindings = hasFindings;
  const showCandidate = Boolean(candidate);
  const applied = state.mode === 'applied' ? state : null;

  return h('section', { className: 'safe-repair-panel', 'data-testid': 'safe-repair-panel' },
    h('h3', null, 'Apply safe repairs'),

    applied
      ? renderApplied(applied.output, applied.verified, strictEligible, candidate?.validation, download, copy, copied, formatOnly)
      : h('div', null,

          showFindings
            ? h('div', { className: 'safe-repair-findings', 'data-testid': 'safe-repair-findings' },
                h('h4', null, 'Diagnosed — not auto-repaired'),
                h('p', { className: 'safe-repair-findings-note' },
                  'EInvoiceCheck never rewrites invoice values, structure, or semantics. ' +
                  'Fix these in the source system that produced the XML.'),
                h('ul', null,
                  safeRepair.findings.map((f: SafeRepairFinding, i) =>
                    h('li', { key: i, className: 'safe-repair-finding' },
                      h('strong', null, f.rule),
                      h('span', null, f.message),
                      f.fix ? h('p', { className: 'safe-repair-finding-fix' }, `Fix: ${f.fix}`) : null,
                    ),
                  ),
                ),
              )
            : null,

          showCandidate && candidate
            ? h('div', { className: 'safe-repair-candidate', 'data-testid': 'safe-repair-candidate' },
                h('h4', null, 'Deterministic candidate'),
                h('p', null,
                  strictEligible
                    ? 'The two metadata repairs produce XML that passes the complete validation pipeline (format, UBL 2.1 XSD, rules and PINT-AE Schematron).'
                    : 'The metadata repairs apply, but the candidate still has blocking issues — Strict mode does not offer it.'),
                h('table', { className: 'safe-repair-audit-table' },
                  h('thead', null,
                    h('tr', null,
                      h('th', { scope: 'col' }, 'Change'),
                      h('th', { scope: 'col' }, 'Target'),
                      h('th', { scope: 'col' }, 'From'),
                      h('th', { scope: 'col' }, 'To'),
                      h('th', { scope: 'col' }, 'Reason'),
                    ),
                  ),
                  h('tbody', null,
                    candidate.audit.map((a, i) =>
                      h('tr', { key: i },
                        h('td', null, a.rule),
                        h('td', null, a.target),
                        h('td', null, a.old),
                        h('td', null, a.new),
                        h('td', null, a.reason),
                      ),
                    ),
                  ),
                ),
                h('p', { className: 'safe-repair-hashes' },
                  `Original ${candidate.originalHash.slice(0, 16)}… · Candidate ${candidate.candidateHash.slice(0, 16)}…`),

                strictEligible
                  ? h('div', { className: 'safe-repair-actions' },
                      h('button', {
                        type: 'button',
                        className: 'btn btn-primary',
                        disabled: state.mode === 'applying',
                        onClick: () => void apply(),
                        'data-testid': 'apply-safe-repairs-btn',
                      },
                        state.mode === 'applying' ? 'Applying…' : 'Apply safe repairs'),
                      h('p', { className: 'safe-repair-strict-note' },
                        'Strict mode (default): only XML that passes the full pipeline is offered.'),
                    )
                  : h('div', { className: 'safe-repair-blocked' },
                      h('p', { className: 'safe-repair-blocked-note' },
                        'Strict mode: this candidate still has blocking issues, so it is not offered for download.'),
                      h('details', { className: 'safe-repair-advanced', 'data-testid': 'safe-repair-advanced' },
                        h('summary', null, 'Advanced options'),
                        h('label', { className: 'safe-repair-format-only' },
                          h('input', {
                            type: 'checkbox',
                            checked: formatOnly,
                            onChange: (e: React.ChangeEvent<HTMLInputElement>) => setFormatOnly(e.currentTarget.checked),
                            'data-testid': 'format-only-toggle',
                          }),
                          'Format-only — allow downloading the format-repaired XML despite blocking issues'),
                        formatOnly
                          ? h('div', null,
                              h('div', { className: 'safe-repair-warning', role: 'alert', 'data-testid': 'format-only-warning' },
                                h('strong', null, 'Format repaired — invoice still has blocking issues'),
                                h('p', null,
                                  'This XML has only metadata repairs applied; the invoice still fails ' +
                                  'structure or semantic checks. It is not valid, and EInvoiceCheck does not claim it is.'),
                              ),
                              h('div', { className: 'safe-repair-candidate-issues' },
                                h(ValidationIssueList, {
                                  issues: flattenValidationIssues(candidate.validation),
                                  filter: 'all',
                                }),
                              ),
                              h('button', {
                                type: 'button',
                                className: 'btn btn-primary',
                                disabled: state.mode === 'applying',
                                onClick: () => void apply(),
                                'data-testid': 'apply-format-only-btn',
                              },
                                state.mode === 'applying' ? 'Applying…' : 'Apply format-only repairs'),
                            )
                          : null,
                      ),
                    ),
              )
            : null,

          !showFindings && !showCandidate
            ? h('p', { className: 'safe-repair-empty' }, 'No deterministic repairs are available for this document.')
            : null,
        ),
  );
}

function renderApplied(
  output: string,
  verified: boolean | null,
  strictEligible: boolean,
  validation: XmlValidationResult | undefined,
  download: (output: string) => void,
  copy: (output: string) => void,
  copied: boolean,
  formatOnly: boolean,
): React.ReactElement {
  return h('div', { className: 'safe-repair-applied', 'data-testid': 'safe-repair-applied' },
    !strictEligible
      ? h('div', { className: 'safe-repair-warning', role: 'alert', 'data-testid': 'format-only-warning' },
          h('strong', null, 'Format repaired — invoice still has blocking issues'),
          h('p', null,
            'Only metadata repairs were applied; the invoice still fails structure or semantic checks. ' +
            'Review every finding before use.'),
          validation
            ? h('div', { className: 'safe-repair-candidate-issues' },
                h(ValidationIssueList, { issues: flattenValidationIssues(validation), filter: 'all' }),
              )
            : null,
        )
      : h('p', { className: 'safe-repair-verified' },
          verified === true
            ? 'Repaired XML matches the server-validated candidate (hash verified).'
            : verified === false
              ? 'Warning: the locally applied candidate did not reproduce the server-validated bytes. Use the original XML and re-run validation.'
              : 'Repaired XML applied.'),
    h('pre', { className: 'safe-repair-preview' }, output),
    h('div', { className: 'safe-repair-actions' },
      h('button', { type: 'button', className: 'btn btn-primary', onClick: () => download(output) }, 'Download XML'),
      h('button', { type: 'button', className: 'btn btn-ghost', onClick: () => copy(output) }, copied ? 'Copied' : 'Copy'),
    ),
    h('p', { className: 'safe-repair-original-note' },
      formatOnly ? 'The original XML is unchanged and still available in the preview.' : 'The original XML remains available in the preview.'),
  );
}
