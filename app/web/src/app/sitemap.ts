import type { MetadataRoute } from 'next';
import { COMPETITORS } from '@/lib/competitors';
import { COMPETITOR_SLUGS, SITE_URL, TOOL_SLUGS } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const core: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/what-we-check`, lastModified: now, changeFrequency: 'weekly', priority: 0.95 },
    { url: `${SITE_URL}/pricing`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/docs`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
  ];

  const tools: MetadataRoute.Sitemap = TOOL_SLUGS.map((slug) => ({
    url: `${SITE_URL}/tools/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const alternatives: MetadataRoute.Sitemap = COMPETITOR_SLUGS.map((slug) => ({
    url: `${SITE_URL}/alternatives/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  const vs: MetadataRoute.Sitemap = COMPETITOR_SLUGS.filter(
    (slug) => COMPETITORS[slug].hasVsPage,
  ).map((slug) => ({
    url: `${SITE_URL}/vs/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [...core, ...tools, ...alternatives, ...vs];
}
