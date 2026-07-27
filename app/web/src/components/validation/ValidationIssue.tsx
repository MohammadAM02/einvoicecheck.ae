import { createElement as h } from 'react';
import type React from 'react';
import { fieldLabel, type ValidationIssue as ValidationIssueType } from '@/lib/validation-ui';

export function ValidationIssue({ issue }: { issue: ValidationIssueType }): React.ReactElement {
  const isBlocking = issue.severity === 'error';

  return h('article', { className: `validation-issue validation-issue--${issue.severity}` },
    h('div', { className: 'validation-issue__heading' },
      h('h3', null, fieldLabel(issue.path)),
      h('p', null,
        h('span', { className: 'status-icon', 'aria-hidden': true }, isBlocking ? '!' : '\u26a0'),
        h('span', { className: 'severity-label' }, isBlocking ? 'Blocking issue' : 'Warning'),
      ),
    ),
    h('p', null, issue.message),
    issue.fix ? h('p', { className: 'validation-fix' }, `Fix: ${issue.fix}`) : null,
    h('details', null,
      h('summary', null, 'Technical details'),
      h('p', null, 'Path: ', h('code', null, issue.path)),
      h('p', null, 'Rule: ', h('code', null, issue.rule)),
    ),
  );
}
