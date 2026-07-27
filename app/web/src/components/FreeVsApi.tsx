import { createElement as h } from 'react';

const FREE_FEATURES = ['no account', 'manual upload/paste', '20 validations/hour/IP', 'same engine/error format'];
const API_FEATURES = ['API key', 'ERP/CI/automated flows', 'plan-based quotas and per-minute limits', 'machine-readable results'];

function ComparisonColumn({ title, features }: { title: string; features: string[] }) {
  return h('article', { className: 'card' }, h('h3', null, title), h('ul', null, features.map((feature) => h('li', { key: feature }, feature))));
}

export function FreeVsApi() {
  return h('section', { id: 'api', className: 'container free-vs-api' },
    h('h2', { className: 'section-title' }, 'Validate one file free. Automate when you are ready.'),
    h('div', { className: 'grid grid-2' },
      h(ComparisonColumn, { title: 'Free validator', features: FREE_FEATURES }),
      h(ComparisonColumn, { title: 'Validation API', features: API_FEATURES }),
    ),
    h('p', null,
      h('a', { className: 'btn btn-primary', href: '/signup' }, 'Automate with the API'), ' ',
      h('a', { className: 'btn btn-secondary', href: '/pricing' }, 'View pricing'),
    ),
  );
}
