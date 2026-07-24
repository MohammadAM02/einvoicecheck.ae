import { pageMetadata } from '@/lib/seo';
import { TemplatesClient } from './TemplatesClient';

export const metadata = pageMetadata({
  title: 'Invoice templates — PINT AE invoice examples for UAE e-invoicing',
  description:
    'Download 16 PINT AE invoice templates for the UAE e-invoicing mandate. Standard tax invoice, exports, credit notes, reverse charge, e-commerce and more. Free, no signup.',
  path: '/templates',
});

export default function TemplatesPage() {
  return (
    <>
      <section>
        <div className="container">
          <span className="badge">Free templates &middot; no signup</span>
          <h1>Invoice templates for UAE e-invoicing</h1>
          <p className="lead">
            Download ready-to-use PINT AE invoice XML templates for all 16 UAE
            e-invoicing scenarios. Each template includes the mandatory fields
            and can be validated with the{' '}
            <a href="/tools/uae-e-invoice-validator">free validator</a> before
            sending to your accredited service provider.
          </p>
        </div>
      </section>

      <section>
        <div className="container">
          <TemplatesClient />
        </div>
      </section>

      <section>
        <div className="container">
          <div className="notice">
            <strong>Preflight only — disclaimer</strong>
            <p>
              These templates are provided as examples for the PINT AE profile.
              They include the mandatory fields required by the UAE FTA
              e-invoicing mandate but do not constitute legal or tax advice.
              Always consult with your accredited service provider and tax
              advisor before using any invoice template in production.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
