/**
 * Central site configuration — single source of truth for site-wide values.
 * Used by metadata, SEO, components, and email templates.
 *
 * Customise these values per project.
 */

export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? 'My App',
  description:
    'Built on the base system — fast, accessible, and production-ready.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',

  // Default Open Graph image (place in /public/og-image.png)
  ogImage: '/og-image.png',

  // ─── Localisation ───────────────────────────────────────────────────────────
  // Change these to add/remove locales or switch the default language.
  // i18n/routing.ts and the middleware both read from here — no other files need touching.
  // Each locale must have a matching messages/<locale>.json file.
  locales: ['en', 'jp'] as const,
  defaultLocale: 'en' as const,

  // Navigation links (update per project)
  navLinks: [
    { label: 'Home', href: '/' },
    { label: 'About', href: '/#about' },
    { label: 'Contact', href: '/#contact' },
  ],

  // Social links (update per project)
  social: {
    twitter: '',
    linkedin: '',
    github: '',
  },
} as const;

export type SiteConfig = typeof siteConfig;
