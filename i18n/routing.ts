// this configuration is used for routing and navigation in the application
// only change the locales available with regards to project context
// so only update this part -> locales: ['en', 'jp']
// and follow accordingly to the messages folder. it should contain the same locales as defined here

import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['en', 'jp'],

  // Used when no locale matches
  defaultLocale: 'en',
});

// Lightweight wrappers around Next.js' navigation APIs
// that will preserve the locale automatically
export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);
