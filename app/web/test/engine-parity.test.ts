import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

// Shared engine files — schematron.js is intentionally excluded (service-local paths differ).
const SHARED = [
  'checks', 'codelists.js', 'engine.js', 'error.js', 'money.js',
  'normalize.js', 'registry.js', 'structure.js', 'xml.js',
];

function collectFiles(dir: string, rel = ''): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(dir, rel), { withFileTypes: true })) {
    const next = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...collectFiles(dir, next));
    else if (entry.name.endsWith('.js')) out.push(next);
  }
  return out;
}

function treeHash(root: string): string {
  const files = SHARED.flatMap((p) => {
    const full = join(root, p);
    try {
      return readdirSync(full, { withFileTypes: true }).map((e) => `${p}/${e.name}`)
        .filter((f) => f.endsWith('.js'));
    } catch { return [p]; }
  }).sort();
  const h = createHash('sha256');
  for (const f of files) h.update(f).update('\0').update(readFileSync(join(root, f)));
  return h.digest('hex');
}

describe('engine parity', () => {
  it('web vendored engine is byte-identical to the canonical app/api engine', () => {
    const api = treeHash(join(process.cwd(), '..', 'api', 'src', 'rules'));
    const web = treeHash(join(process.cwd(), 'src', 'lib', 'rules'));
    expect(web).toBe(api);
  });
});
