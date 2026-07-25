import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Chrome } from '@/components/Chrome';
import { AnalyticsLoader } from '@/components/AnalyticsLoader';
import { jsonLd, organizationSchema, websiteSchema } from '@/lib/seo';
import { SITE_URL } from '@/lib/site';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'einvoicecheck.ae — UAE e-invoice preflight validation API',
    template: '%s | einvoicecheck.ae',
  },
  description:
    'Catch UAE e-invoice errors before you submit. Preflight validation for PINT AE / UBL 2.1 invoices, TRNs, tax fields and totals. Not an accredited service provider.',
  applicationName: 'einvoicecheck.ae',
  authors: [{ name: 'einvoicecheck.ae' }],
  formatDetection: { telephone: false },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.className} bg-[#0B0F14] text-[#E8EEF5] antialiased min-h-screen w-full`}>
        <AnalyticsLoader />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLd([organizationSchema, websiteSchema])}
        />
        <Chrome>{children}</Chrome>
      </body>
    </html>
  );
}
