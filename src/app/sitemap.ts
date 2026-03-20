import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/core/config/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = siteConfig.url;

  // Generate entries for each locale
  const localeEntries = siteConfig.locales.flatMap((locale) => [
    {
      url: `${baseUrl}/${locale}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 1,
    },
  ]);

  return localeEntries;
}
