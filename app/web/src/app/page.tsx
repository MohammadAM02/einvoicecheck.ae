import { Metadata } from 'next';
import HomeClient from '@/components/HomeClient';
import { GuardrailNotice } from '@/components/Chrome';

export const metadata: Metadata = {
  title: 'E-Invoice Validation API | Enterprise Ready',
  description: 'Fast, secure, and compliant E-Invoice validation for the UAE market.',
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
            "name": "E-Invoice Validator",
            "applicationCategory": "DeveloperTool"
          }),
        }}
      />
    </>
  );
}
