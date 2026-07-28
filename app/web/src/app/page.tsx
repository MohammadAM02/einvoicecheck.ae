import { Metadata } from 'next';
import HomeClient from '@/components/HomeClient';
import { GuardrailNotice } from '@/components/Chrome';

export const metadata: Metadata = {
  title: 'UAE E-Invoice Preflight Validator | einvoicecheck.ae',
  description: 'Test ERP-generated PINT-AE XML and find validation, mapping and invoice data errors before submission to your ASP.',
};

export default function Page() {
  return (
    <>
      <GuardrailNotice />
      <HomeClient />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "einvoicecheck.ae UAE E-Invoice Preflight Validator",
            "applicationCategory": "BusinessApplication"
          }),
        }}
      />
    </>
  );
}
