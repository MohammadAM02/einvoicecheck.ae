import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const WORKING = path.resolve(import.meta.dirname, '..', 'schematron');
const VENDORED = path.resolve(
  import.meta.dirname,
  '../../../docs/pint-ae-resources/trn-invoice/schematron'
);

// The vendored v1.0.4 tree (docs/pint-ae-resources) is the source of truth; the
// interpreter's working copies in app/api/schematron must stay a synced mirror.
// If either .sch drifts (new rule, message change, context change), this fails
// and the sync must be done deliberately — same contract as
// codelists-drift.test.js.
const FILES = [
  'PINT-UBL-validation-preprocessed.sch',
  'PINT-jurisdiction-aligned-rules.sch',
];

const norm = (s) => s.replace(/\r\n/g, '\n'); // CRLF-normalize before comparing

describe('schematron working-copy drift guard', () => {
  it.each(FILES)('%s is byte-identical to the vendored v1.0.4 source of truth', (f) => {
    const working = norm(readFileSync(path.join(WORKING, f), 'utf8'));
    const vendored = norm(readFileSync(path.join(VENDORED, f), 'utf8'));
    expect(working).toBe(vendored);
  });
});
