import { createElement as h } from 'react';
import type React from 'react';
import { sortValidationIssues, type ValidationIssue as ValidationIssueType } from '@/lib/validation-ui';
import { ValidationIssue } from './ValidationIssue';

export function ValidationIssueList({ issues }: { issues: ValidationIssueType[] }): React.ReactElement | null {
  if (issues.length === 0) return null;

  return h('div', { className: 'validation-issue-list' },
    sortValidationIssues(issues).map((issue, index) => h(ValidationIssue, {
      key: `${issue.rule}-${issue.path}-${index}`,
      issue,
    })),
  );
}
