/**
 * Supabase middleware client — use in middleware.ts to refresh auth sessions.
 *
 * This ensures the user's session is refreshed on every request, keeping
 * server-side auth state in sync with the browser.
 */

import { createServerClient } from '@supabase/ssr';
import type { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/core/env';
import type { Database } from '@/types/database';

export function createMiddlewareClient(
  request: NextRequest,
  response: NextResponse,
) {
  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL ??
      (() => {
        throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
      })(),
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      (() => {
        throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
      })(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );
}
