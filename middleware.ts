import { type NextRequest, NextResponse } from 'next/server';
import { buildCspHeader, generateCspNonce } from './src/lib/core/security/csp';

export default function middleware(request: NextRequest) {
  if (process.env.MAINTENANCE_MODE === 'true') {
    return NextResponse.rewrite(new URL('/maintenance', request.url));
  }

  const nonce = generateCspNonce();
  const csp = buildCspHeader(nonce);

  const response = NextResponse.next();
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('x-nonce', nonce);
  return response;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
