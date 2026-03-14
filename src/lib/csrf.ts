/**
 * CSRF protection utilities.
 *
 * Next.js App Router API routes are not automatically CSRF-protected.
 *
 * Strategy used here:
 * 1. Origin / Referer header checking — rejects requests from unexpected origins.
 * 2. SameSite=Lax cookies (Supabase default) provide baseline protection
 *    against cross-site form submissions.
 *
 * For state-changing routes (POST/PUT/DELETE), call `validateCsrf(req)` at the
 * top of the handler.
 */

/**
 * Validates that the request originates from the expected site origin.
 * Returns `true` if the request is safe, `false` if it should be rejected.
 */
export function validateCsrfOrigin(req: Request): boolean {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  // Skip in development (localhost)
  if (!siteUrl || siteUrl.startsWith('http://localhost')) {
    return true;
  }

  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');

  const expectedOrigin = new URL(siteUrl).origin;

  // Allow requests with matching Origin header
  if (origin) {
    return origin === expectedOrigin;
  }

  // Fall back to Referer header
  if (referer) {
    try {
      return new URL(referer).origin === expectedOrigin;
    } catch {
      return false;
    }
  }

  // Allow requests with no Origin/Referer (e.g. server-to-server)
  return true;
}
