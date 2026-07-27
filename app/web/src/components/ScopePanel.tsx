import { createElement as h } from 'react';

const INCLUDED = [
  'Invoice type/required terms',
  'Supplier/buyer UAE TRN format',
  'Currency/code-list membership',
  'VAT category/rate consistency',
  'Line arithmetic/tax breakdown/totals/payable reconciliation',
];
const EXCLUDED = [
  'Complete official XSD/Schematron conformity',
  'FTA registration lookup',
  'Legal transmission/filing',
  'Statutory archival',
  'Guaranteed ASP/authority acceptance',
];

function ScopeGroup({ title, items }: { title: string; items: string[] }) {
  return h('div', null, h('h3', null, title), h('ul', null, items.map((item) => h('li', { key: item }, item))));
}

export function ScopePanel() {
  return h('section', { id: 'scope', className: 'container scope-panel' },
    h('h2', { className: 'section-title' }, 'What this preflight checks'),
    h('div', { className: 'grid grid-2' },
      h(ScopeGroup, { title: 'Currently included', items: INCLUDED }),
      h(ScopeGroup, { title: 'Not currently included', items: EXCLUDED }),
    ),
    h('p', { className: 'muted' }, 'Preflight only. Your accredited provider still handles legal transmission.'),
  );
}
