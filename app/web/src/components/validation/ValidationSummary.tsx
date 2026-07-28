'use client';

import type React from 'react';
import { createElement as h, useEffect, useRef, useState } from 'react';
import { toReportText, type ValidationRateLimit, type ValidationResult } from '@/lib/validation-ui';
import { ValidationIssueList } from './ValidationIssueList';

export function ValidationSummary(props: {
  result: ValidationResult;
  rateLimit: ValidationRateLimit;
  onReset: () => void;
}): React.ReactElement {
  const { result, rateLimit, onReset } = props;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [copied, setCopied] = useState(false);
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
    h(ValidationIssueList, { issues: result.errors }),
    h('p', null, `${rateLimit.remaining} of ${rateLimit.limit} free checks left this hour.`),
    rateLimit.degraded ? h('p', null, 'Rate-limit protection is temporarily degraded.') : null,
    h('div', null,
      h('button', { type: 'button', onClick: onReset }, 'Validate another file'),
      canCopy ? h('button', { type: 'button', onClick: copyReport }, copied ? 'Copied' : 'Copy report') : null,
    ),
  );
}
