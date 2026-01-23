// How to use this in other components. Refer below:
// const scrollTo = useSmoothScroll();
// onClick={(e) => scrollTo(e, '/#features')}
// This would work on section IDs and pages

import { useCallback } from 'react';
import { usePathname } from '@/i18n/routing'; // Import from your routing config

export const useSmoothScroll = () => {
  const pathname = usePathname(); // Get current path (normalized, e.g., "/" even if on "/en")

  const scrollTo = useCallback(
    (e: React.MouseEvent<HTMLElement>, href: string, callback?: () => void) => {
      // 1. Run specific logic (like closing mobile menu)
      if (callback) callback();

      // CASE A: Handle "Home" link (href === '/')
      if (href === '/') {
        // If we are ALREADY on the home page, scroll to top
        if (pathname === '/') {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        // If we are NOT on home page (e.g. on /about), let standard navigation happen
        return;
      }

      // CASE B: Handle Anchor links (href === '/#features' or just '#features')
      if (href.includes('#')) {
        const [pathPart, targetId] = href.split('#');

        // Check if the anchor is on the CURRENT page
        // (matches if href is just "#id" OR if "pathPart" matches current pathname)
        const isCurrentPage = pathPart === '' || pathPart === pathname;

        if (isCurrentPage) {
          const element = document.getElementById(targetId);
          if (element) {
            e.preventDefault();
            element.scrollIntoView({ behavior: 'smooth' });
            // Optional: Update URL hash
            window.history.pushState(null, '', `#${targetId}`);
          }
        }
      }
    },
    [pathname], // Re-create function if pathname changes
  );

  return scrollTo;
};
