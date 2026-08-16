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

  it('loads the playful geometric visual layer last', () => {
    const layout = readFileSync(path.join(process.cwd(), 'src', 'app', 'layout.tsx'), 'utf8');
    const styleImports = [...layout.matchAll(/import ['"]\.\/([^'"]+\.css)['"];/g)].map(
      (match) => match[1],
    );

    expect(styleImports.at(-1)).toBe('playful-geometric.css');
  });

  it('preserves the cream background and playful accessibility invariants', () => {
    const css = readFileSync(
      path.join(process.cwd(), 'src', 'app', 'playful-geometric.css'),
      'utf8',
    );

    expect(css).toContain('--bg: #f7f8f5;');
    expect(css).toMatch(/\.navbar\s*\{[^}]*border-bottom:\s*3px solid var\(--navy\)/s);
    expect(css).toMatch(/\.validator-workspace[\s\S]*?border:\s*3px solid var\(--navy\)/);
    expect(css).toMatch(/\.invoice-drop-zone[\s\S]*?border:\s*3px dashed var\(--navy\)/);
    expect(css).toContain('box-shadow: 8px 8px 0 var(--accent);');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('transition-duration: 0.001ms !important;');
  });
});
