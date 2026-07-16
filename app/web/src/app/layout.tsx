import type { Metadata } from 'next';
import './globals.css';
import { SiteFooter, SiteHeader } from '@/components/Chrome';
import { jsonLd, organizationSchema, websiteSchema } from '@/lib/seo';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'einvoicecheck.ae - UAE e-invoice preflight validation API',
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLd([organizationSchema, websiteSchema])}
        />
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
