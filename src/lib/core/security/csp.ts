/**
 * CSP nonce generation and header builder.
 * Uses Web Crypto API for Edge Runtime compatibility (middleware).
 */

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function generateCspNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bytesToBase64(bytes);
}

export function buildCspHeader(nonce: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const connectSrc = supabaseUrl
    ? `connect-src 'self' ${supabaseUrl}`
    : "connect-src 'self'";

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://va.vercel-scripts.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https:",
    "font-src 'self' https://fonts.gstatic.com",
    connectSrc,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}
