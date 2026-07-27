import { createElement as h } from 'react';

const TRUST_FACTS = [
  'UAE-focused semantic preflight',
  'XML and JSON accepted',
  'Invoice payloads not stored',
  'Independent tool \u2014 not an accredited ASP',
];

export function TrustStrip() {
  return h('section', { id: 'trust', className: 'trust-strip', 'aria-label': 'Trust facts' },
    h('div', { className: 'container' },
      h('ul', null, TRUST_FACTS.map((fact) => h('li', { key: fact }, fact))),
    ),
  );
}
