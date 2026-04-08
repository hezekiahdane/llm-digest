import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/core/config/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = siteConfig.url;

  return siteConfig.pages.flatMap(({ path, priority, changeFrequency }) =>
    siteConfig.locales.map((locale) => ({
      url: `${baseUrl}/${locale}${path}`,
      lastModified: new Date(),
      changeFrequency,
      priority,
    })),
  );
}
