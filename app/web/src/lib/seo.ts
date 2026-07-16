import type { Metadata } from 'next';
import { SITE_NAME, SITE_URL } from './site';

type PageMetaInput = {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
};

/** Builds a unique title/description/canonical/OG/Twitter set for one page. */
export function pageMetadata({ title, description, path, noindex }: PageMetaInput): Metadata {
  const url = `${SITE_URL}${path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: noindex ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      type: 'website',
      url,
      siteName: SITE_NAME,
      title,
      description,
      locale: 'en_AE',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

/** Renders a JSON-LD block. Used server-side only. */
export function jsonLd(data: Record<string, unknown> | Record<string, unknown>[]) {
  return {
    __html: JSON.stringify(data),
  };
}

export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: 'einvoicecheck.ae',
  url: SITE_URL,
  description:
    'Preflight validation API for UAE e-invoices (PINT AE / UBL 2.1). Not an accredited service provider and not a transmission channel.',
  areaServed: { '@type': 'Country', name: 'United Arab Emirates' },
  knowsAbout: [
    'UAE e-invoicing',
    'PINT AE',
    'UBL 2.1',
    'TRN validation',
    'FTA e-invoicing mandate',
  ],
};

export const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  url: SITE_URL,
  name: 'einvoicecheck.ae',
  publisher: { '@id': `${SITE_URL}/#organization` },
  inLanguage: 'en',
};

export function faqSchema(faqs: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}
