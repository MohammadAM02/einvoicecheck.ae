import type { Metadata } from 'next';
import './globals.css';
import { SiteFooter, SiteHeader } from '@/components/Chrome';
import { jsonLd, organizationSchema, websiteSchema } from '@/lib/seo';
import { SITE_URL } from '@/lib/site';

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* DM Sans for headings, Inter for body, JetBrains Mono for code */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLd([organizationSchema, websiteSchema])}
        />
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
        {/* Scroll reveal observer */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var observer = new IntersectionObserver(function(entries) {
                  entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                      entry.target.classList.add('revealed');
                    }
                  });
                }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
                document.querySelectorAll('.scroll-reveal').forEach(function(el) {
                  observer.observe(el);
                });
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
