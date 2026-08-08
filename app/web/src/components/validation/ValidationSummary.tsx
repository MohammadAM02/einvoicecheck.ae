'use client';

import type React from 'react';
import { createElement as h, useEffect, useRef, useState } from 'react';
import { toReportText, LAYER_LABELS, flattenValidationIssues, type ValidationLayerName, type ValidationRateLimit, type XmlValidationResult } from '@/lib/validation-ui';
import { ValidationIssueList } from './ValidationIssueList';

export function ValidationSummary(props: {
  result: XmlValidationResult;
  rateLimit: ValidationRateLimit;
  onReset: () => void;
}): React.ReactElement {
  const { result, rateLimit, onReset } = props;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [copied, setCopied] = useState(false);
  const [layerFilter, setLayerFilter] = useState<ValidationLayerName | 'all'>('all');
  const counts = { format: 0, structure: 0, semantic: 0 } as Record<ValidationLayerName, number>;
  for (const layer of Object.keys(LAYER_LABELS) as ValidationLayerName[]) counts[layer] = result[layer].issues.length;
  const allIssues = flattenValidationIssues(result);
  // The response layer is authoritative: filter straight from the layer's issues.
  const visibleIssues = layerFilter === 'all' ? allIssues : result[layerFilter].issues;
  const blockingCount = allIssues.filter((issue) => issue.severity === 'error').length;
  const warningCount = allIssues.filter((issue) => issue.severity === 'warning').length;
  const selfBilling = allIssues.some((issue) => issue.rule === 'ENG-TYPE-01/SELF-BILLING');
  const canCopy = typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function';
  const headingId = 'validation-summary-heading';

  useEffect(() => {
    headingRef.current?.focus();
  }, [result]);

  async function copyReport() {
    if (!canCopy) return;
    await navigator.clipboard.writeText(toReportText(result));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return h('section', { className: 'validation-summary', 'aria-labelledby': headingId },
    h('h2', { id: headingId, ref: headingRef, tabIndex: -1 }, result.valid ? 'Preflight passed' : 'Preflight failed'),
    selfBilling ? h('div', { className: 'validation-banner validation-banner--self-billing', role: 'status' },
      h('strong', null, 'Self-billed invoices are not fully validated'),
      h('p', null, 'This document is type 389 (self-billed invoice). Structural checks ran, but self-billing business rules are not vendored, so results are incomplete. Use an accredited ASP for self-billed invoices.'),
    ) : null,
    h('p', null, `${blockingCount} blocking issue${blockingCount === 1 ? '' : 's'} and ${warningCount} warning${warningCount === 1 ? '' : 's'}.`),
    h('p', null, `Detected invoice type: ${result.invoiceType ?? 'Not identified'}`),
    h('p', null, `Validation profile: ${result.schemaVersion}`),
    result.valid ? h('p', null, 'No blocking issues were found by the checks currently included in this preflight engine.') : null,
    !result.valid ? h('p', { className: 'validation-summary__guidance' }, 'Use the fix list below to trace the mapping or invoice data problem.') : null,
    h('aside', { className: 'validation-summary__api', 'aria-label': 'Automated validation' },
      h('strong', null, 'Need this check inside your ERP or workflow?'),
      h('a', { href: '/signup' }, 'Use the validation API'),
    ),
    h('div', { className: 'validation-layers', 'aria-label': 'Validation layers' },
      h('button', {
        type: 'button',
        className: `validation-layer-badge${layerFilter === 'all' ? ' is-active' : ''}`,
        onClick: () => setLayerFilter('all'),
      }, `All (${allIssues.length})`),
      (Object.keys(LAYER_LABELS) as ValidationLayerName[]).map((layer) =>
        h('button', {
          type: 'button',
          key: layer,
          className: `validation-layer-badge is-${result[layer].status}${layerFilter === layer ? ' is-active' : ''}`,
          onClick: () => setLayerFilter(layer),
        },
          result[layer].status === 'skipped' ? `— ${LAYER_LABELS[layer]}` : `${counts[layer]} ${LAYER_LABELS[layer]}`,
          h('span', { className: 'validation-layer-badge__label sr-only', 'aria-hidden': 'true' }, LAYER_LABELS[layer]),
        ),
      ),
    ),
    h(ValidationIssueList, { issues: visibleIssues, filter: layerFilter }),
    h('p', null, `${rateLimit.remaining} of ${rateLimit.limit} free checks left this hour.`),
    rateLimit.degraded ? h('p', null, 'Rate-limit protection is temporarily degraded.') : null,
    h('div', null,
      h('button', { type: 'button', onClick: onReset }, 'Validate another file'),
      canCopy ? h('button', { type: 'button', onClick: copyReport }, copied ? 'Copied' : 'Copy report') : null,
    ),
  );
}
