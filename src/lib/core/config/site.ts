import { env } from '@/lib/core/env';
import type { SitemapPage } from './site.types';

export const siteConfig = {
  name: env.NEXT_PUBLIC_SITE_NAME,
  description:
    'Live AI model comparison — status, benchmarks, pricing, and releases across OpenAI, Anthropic, Google, and Meta.',
  url: env.NEXT_PUBLIC_SITE_URL,
  ogImage: '/og-image.png',
  social: {
    twitter: '',
    linkedin: '',
    github: '',
  },
  pages: [
    { path: '/dashboard', priority: 1.0, changeFrequency: 'hourly' as const },
  ] satisfies SitemapPage[],
} as const;

export type SiteConfig = typeof siteConfig;
