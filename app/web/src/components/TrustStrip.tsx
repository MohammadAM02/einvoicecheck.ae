import { createElement as h } from 'react';

const TRUST_FACTS = [
  'Browser validator: PINT-AE XML',
  'No signup required',
  'Invoice content not persisted by the app',
  'Independent preflight, not an ASP',
];

export function TrustStrip() {
  return h('section', { id: 'trust', className: 'trust-strip', 'aria-label': 'Trust facts' },
    h('div', { className: 'container' },
      h('ul', null, TRUST_FACTS.map((fact) => h('li', { key: fact }, fact))),
    ),
  );
}
