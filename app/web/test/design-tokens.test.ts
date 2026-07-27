import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('design tokens', () => {
  it('uses the approved AA muted text color', () => {
    const css = readFileSync(path.join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8');

    expect(css).toContain('--ink-muted: #5b7183;');
    expect(css).not.toContain('--ink-muted: #6b8192;');
  });

  it('uses the accessible accent foreground for small badges', () => {
    const css = readFileSync(path.join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8');
    const badgeBlock = css.match(/\.badge\s*\{([^}]*)\}/)?.[1];

    expect(badgeBlock).toContain('color: var(--accent-hover);');
  });
});
