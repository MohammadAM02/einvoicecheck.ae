import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/templates
 *
 * Returns the list of available invoice template files.
 * The 16 XML files live in public/templates/ and Next.js serves them
 * as static assets at /templates/<filename>. We hardcode the metadata
 * here to avoid any filesystem path resolution issues in production.
 *
 * Response:
 *   { ok: true, templates: [{ filename, name, description }] }
 */

type TemplateMeta = { filename: string; name: string; description: string };

function displayName(filename: string): string {
  const name = filename.replace(/\.xml$/i, '');
  const spaced = name.replace(/\s+[-–]\s+/g, ' \u2014 ');
  return spaced.replace(/(^|\s|[-—])(\w)/g, (_, sep, ch) => sep + ch.toUpperCase());
}

const TEMPLATE_INFO: Record<string, string> = {
  'Commercial invoice.xml':
    'A commercial invoice for cross-border or domestic trade where no VAT is charged. Used when the supplier issues a commercial document rather than a full tax invoice.',
  'Continuous supplies.xml':
    'For ongoing contracts where goods or services are supplied continuously (e.g., subscriptions, utilities). Supports periodic invoicing without repeating the full setup each period.',
  'Deemed supply - predefined endpoint.xml':
    'Used when the FTA deems a supply to have occurred — e.g., private use of business assets, goods on hand at deregistration, or transfers without consideration.',
  'Disclosed agent billing.xml':
    'Issued by an agent who discloses their principal on the invoice. The invoice shows both the agent and the underlying principal/supplier.',
  'Exports - predefined endpoint.xml':
    'For exports where the goods leave the UAE and the customer is outside the UAE. Uses the predefined export endpoint with zero-rated VAT.',
  'Exports.xml':
    'Standard export invoice for goods or services supplied to a recipient outside the UAE. Zero-rated for VAT purposes.',
  'Margin scheme.xml':
    'For second-hand goods, collectibles, or antiques sold under the margin scheme. VAT is calculated on the profit margin rather than the full selling price.',
  'Standard invoice - Extensive.xml':
    'A comprehensive standard tax invoice with all optional fields populated. Use this as a reference for maximum-field scenarios.',
  'Standard invoice Mandatory fields.xml':
    'The minimum viable standard tax invoice — only mandatory UAE PINT AE fields. Ideal for validation testing with the smallest valid payload.',
  'Standard tax invoice - predefined endpoint.xml':
    'A standard tax invoice directed at a predefined EDI endpoint rather than a specific customer TRN lookup.',
  'Standard tax invoice.xml':
    'The standard UAE tax invoice with all mandatory fields. The most common invoice type — use this as your starting template.',
  'Summary tax invoice.xml':
    'A summary (or consolidated) tax invoice covering multiple transactions over a period. Used when several supplies are aggregated onto one document.',
  'Supply involving free trade zone.xml':
    'For supplies where either the supplier or customer is located in a UAE Free Trade Zone. Handles the special VAT treatment applicable to FTZ transactions.',
  'Supply through e-commerce.xml':
    'For electronic commerce supplies — digital goods, online services, or marketplace transactions where the platform may be deemed the supplier.',
  'Supply under Reverse charge mechanism.xml':
    'For B2B supplies where the customer accounts for VAT under the reverse charge mechanism. The supplier does not charge VAT; the customer self-assesses.',
  'Zero rated supplies.xml':
    'For zero-rated supplies (0% VAT) such as exports, international transport, and certain investment-grade precious metals.',
};

const FILENAMES = Object.keys(TEMPLATE_INFO).sort((a, b) => a.localeCompare(b));

export async function GET() {
  const templates: TemplateMeta[] = FILENAMES.map((filename) => ({
    filename,
    name: displayName(filename),
    description: TEMPLATE_INFO[filename],
  }));

  return NextResponse.json({ ok: true, templates });
}
