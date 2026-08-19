/**
 * XML Repairer retirement tests (Part B).
 *
 * The standalone Repairer is gone as a product surface: no page, navigation,
 * dashboard link, sitemap entry, or active copy references it; the old browser
 * route redirects permanently to the main Validator; the free-tool validation
 * proxy passes the additive safeRepair analysis through unchanged.
 *
 * The retired source files are either deleted or reduced to inert retirement
 * stubs that import nothing and render/export nothing — both states satisfy
 * "gone" for every consumer, so the assertions below hold in both.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (...parts: string[]) => readFileSync(path.join(process.cwd(), 'src', ...parts), 'utf8');

describe('XML Repairer retirement', () => {
  it('permanently redirects /tools/xml-repairer to the main Validator', () => {
    const route = source('app', 'tools', '[slug]', 'page.tsx');

    expect(route).toContain("if (slug === 'xml-repairer') permanentRedirect('/tools/uae-e-invoice-validator')");
    expect(route).toContain("import { notFound, permanentRedirect } from 'next/navigation';");
  });

  it('removes xml-repairer from tool slugs (page generation, sitemap)', () => {
    const site = source('lib', 'site.ts');
    expect(site).not.toContain('xml-repairer');
    expect(site).toContain("'xml-generator'");
  });

  it('removes the Repairer from primary navigation', () => {
    const chrome = source('components', 'Chrome.tsx');
    expect(chrome).not.toContain('xml-repairer');
    expect(chrome).not.toMatch(/XML Repairer/i);
  });

  it('removes the Repairer tool card from the dashboard', () => {
    const dashboard = source('components', 'DashboardClient.tsx');
    expect(dashboard).not.toContain('xml-repairer');
    expect(dashboard).not.toMatch(/Repairer/i);
  });

  it('describes Validator-integrated safe repair in active product copy', () => {
    const copy = source('app', 'what-we-check', 'page.tsx');
    expect(copy).not.toMatch(/XML Repairer/i);
    expect(copy).toContain('Validator safe repair');
  });

  it('keeps no repairer styles or generator dependencies on the repairer client', () => {
    const css = source('app', 'globals.css');
    expect(css).not.toMatch(/\.repairer-/);

    const generator = source('components', 'GeneratorWorkspace.tsx');
    expect(generator).not.toContain('repairer-client');
    expect(generator).toContain('@/lib/xml-file');
  });

  it('no product surface imports the retired repairer client or workspace', () => {
    const toolsPage = source('app', 'tools', '[slug]', 'page.tsx');
    expect(toolsPage).not.toContain('RepairerWorkspace');
    expect(toolsPage).not.toContain('repairer-client');
  });
});

describe('free-tool validation proxy keeps the additive safeRepair analysis', () => {
  it('passes the /v2/validate result through unchanged (safeRepair included)', () => {
    const route = source('app', 'api', 'tools', 'validate', 'route.ts');
    expect(route).toContain('result = await validateDocument(document)');
    expect(route).not.toContain('delete result.safeRepair');
    // The layered result type includes the optional additive analysis.
    const validation = source('lib', 'validation.ts');
    expect(validation).toContain('safeRepair?: SafeRepairAnalysis');
  });
});
