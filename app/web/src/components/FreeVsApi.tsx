import { createElement as h } from 'react';

const FREE_FEATURES = ['Test or troubleshoot one file', 'No account required', 'Manual upload or paste', 'Same validation engine and error format'];
const API_FEATURES = ['Check ERP exports automatically', 'Use inside ERP, testing and implementation workflows', 'Validate invoices at scale', 'Machine-readable results'];

function ComparisonColumn({ title, features, emphasis = false }: { title: string; features: string[]; emphasis?: boolean }) {
  return h('article', { className: `comparison-card${emphasis ? ' comparison-card--api' : ''}` },
    h('h3', null, title),
    h('ul', null, features.map((feature) => h('li', { key: feature }, feature))),
  );
}

export function FreeVsApi() {
  return h('section', { id: 'api', className: 'container free-vs-api' },
    h('div', { className: 'api-heading' },
      h('p', { className: 'api-kicker' }, 'From one-off diagnosis to automated checks'),
      h('h2', { className: 'section-title' }, 'Need validation inside your ERP or workflow?'),
      h('p', null, 'Use the API to check invoices automatically before submission.'),
    ),
    h('div', { className: 'comparison-grid' },
      h(ComparisonColumn, { title: 'Free validator', features: FREE_FEATURES }),
      h(ComparisonColumn, { title: 'Validation API', features: API_FEATURES, emphasis: true }),
    ),
    h('p', { className: 'api-actions' },
      h('a', { className: 'btn btn-primary', href: '/signup' }, 'Automate validation with the API'), ' ',
      h('a', { className: 'btn btn-secondary', href: '/pricing' }, 'View pricing'),
    ),
  );
}
