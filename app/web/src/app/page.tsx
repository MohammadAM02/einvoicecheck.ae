import HomeClient from '@/components/HomeClient';
import { GuardrailNotice } from '@/components/Chrome';
import { jsonLd, organizationSchema, pageMetadata, websiteSchema } from '@/lib/seo';
import { SITE_URL } from '@/lib/site';

export const metadata = pageMetadata({
  title: 'UAE E-Invoice Preflight Validator | einvoicecheck.ae',
  description:
    'Test ERP-generated PINT-AE XML and find validation, mapping and invoice data errors before submission to your ASP.',
  path: '/',
});

const softwareSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  '@id': `${SITE_URL}/#software`,
  name: 'einvoicecheck.ae UAE E-Invoice Preflight Validator',
  url: `${SITE_URL}/`,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Any',
  publisher: { '@id': `${SITE_URL}/#organization` },
  description:
    'Independent UAE e-invoice preflight for ERP-generated invoices. Checks the validation rules currently supported by EInvoiceCheck. It is not an ASP and does not guarantee PINT-AE or ASP acceptance.',
};

export default function Page() {
  return (
    <>
      <GuardrailNotice />
      <HomeClient />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd([websiteSchema, organizationSchema, softwareSchema])}
      />
    </>
  );
}
