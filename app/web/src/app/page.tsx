import { Metadata } from 'next';
import HomeClient from '@/components/HomeClient';
import { GuardrailNotice } from '@/components/Chrome';

export const metadata: Metadata = {
  title: 'Free UAE E-Invoice Validator | einvoicecheck.ae',
  description: 'Upload UAE e-invoice XML or JSON and find semantic, VAT and arithmetic issues before handoff to your accredited service provider.',
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
