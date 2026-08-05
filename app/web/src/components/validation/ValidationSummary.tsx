'use client';

import type React from 'react';
import { createElement as h, useEffect, useRef, useState } from 'react';
import { toReportText, LAYER_LABELS, layerOf, type ValidationLayer, type ValidationRateLimit, type ValidationResult } from '@/lib/validation-ui';
import { ValidationIssueList } from './ValidationIssueList';

export function ValidationSummary(props: {
  result: ValidationResult;
  rateLimit: ValidationRateLimit;
  onReset: () => void;
}): React.ReactElement {
  const { result, rateLimit, onReset } = props;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [copied, setCopied] = useState(false);
  const [layerFilter, setLayerFilter] = useState<ValidationLayer | 'all'>('all');
  const counts = { format: 0, structure: 0, semantic: 0 } as Record<ValidationLayer, number>;
  for (const issue of result.errors) counts[layerOf(issue.rule)]++;
  const visibleIssues = layerFilter === 'all'
    ? result.errors
    : result.errors.filter((issue) => layerOf(issue.rule) === layerFilter);
  const blockingCount = result.errors.filter((issue) => issue.severity === 'error').length;
  const warningCount = result.errors.filter((issue) => issue.severity === 'warning').length;
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
      }, `All (${result.errors.length})`),
      (Object.keys(LAYER_LABELS) as ValidationLayer[]).map((layer) =>
        h('button', {
          type: 'button',
          key: layer,
          className: `validation-layer-badge${layerFilter === layer ? ' is-active' : ''}`,
          onClick: () => setLayerFilter(layer),
        },
          `${counts[layer]} ${LAYER_LABELS[layer]}`,
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
