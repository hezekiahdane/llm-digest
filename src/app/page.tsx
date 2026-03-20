import { redirect } from 'next/navigation';
import { siteConfig } from '@/lib/core/config/site';

// Redirect root `/` to the default locale.
// The next-intl middleware handles this too, but this page acts as a fallback.
export default function RootPage() {
  redirect(`/${siteConfig.defaultLocale}`);
}
