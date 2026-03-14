/**
 * OptimizedImage — wrapper around next/image with project-wide defaults.
 *
 * Use this instead of next/image directly so we have one place to configure
 * defaults (lazy loading, blur placeholder, format priorities).
 *
 * Usage:
 *   <OptimizedImage src="/hero.jpg" alt="Hero banner" width={1200} height={600} priority />
 */

import Image, { type ImageProps } from 'next/image';

interface OptimizedImageProps extends ImageProps {
  /** Set to true for above-the-fold images (LCP candidates). Disables lazy loading. */
  priority?: boolean;
}

export function OptimizedImage({
  alt,
  priority = false,
  ...props
}: OptimizedImageProps) {
  return (
    <Image
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      priority={priority}
      quality={85}
      {...props}
    />
  );
}
