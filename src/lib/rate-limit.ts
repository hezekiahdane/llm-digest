/**
 * Simple sliding-window rate limiter using in-memory storage.
 *
 * ⚠️  In-memory storage is ONLY suitable for single-instance deployments.
 * For Vercel/serverless, use Upstash Redis: https://upstash.com/docs/redis/sdks/ratelimit-ts/overview
 *
 * Usage:
 *   const limiter = createRateLimiter({ limit: 5, windowMs: 60_000 });
 *
 *   export async function POST(req: Request) {
 *     const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
 *     const { success } = limiter.check(ip);
 *     if (!success) return NextResponse.json(errorResponse('Too many requests'), { status: 429 });
 *     ...
 *   }
 */

if (process.env.NODE_ENV === 'production') {
  // biome-ignore lint/suspicious/noConsole: intentional production deprecation warning
  console.warn(
    '[rate-limit] WARNING: In-memory rate limiting is not suitable for production ' +
      'multi-instance deployments (e.g. Vercel serverless). ' +
      'Migrate to a distributed store such as Upstash Redis: ' +
      'https://upstash.com/docs/redis/sdks/ratelimit-ts/overview',
  );
}

interface RateLimiterOptions {
  /** Maximum number of requests allowed within the window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export function createRateLimiter(options: RateLimiterOptions) {
  const { limit, windowMs } = options;
  const store = new Map<string, RateLimitEntry>();

  return {
    check(key: string): RateLimitResult {
      const now = Date.now();
      const entry = store.get(key);

      if (!entry || now > entry.resetAt) {
        const newEntry: RateLimitEntry = { count: 1, resetAt: now + windowMs };
        store.set(key, newEntry);
        return {
          success: true,
          remaining: limit - 1,
          resetAt: newEntry.resetAt,
        };
      }

      if (entry.count >= limit) {
        return { success: false, remaining: 0, resetAt: entry.resetAt };
      }

      entry.count += 1;
      return {
        success: true,
        remaining: limit - entry.count,
        resetAt: entry.resetAt,
      };
    },

    /** Prune expired entries to prevent unbounded memory growth */
    cleanup() {
      const now = Date.now();
      for (const [key, entry] of store.entries()) {
        if (now > entry.resetAt) store.delete(key);
      }
    },
  };
}

/** Pre-configured limiter for contact form (5 requests per minute per IP) */
export const contactFormLimiter = createRateLimiter({
  limit: 5,
  windowMs: 60_000,
});

/** Pre-configured limiter for general API routes (60 requests per minute per IP) */
export const apiLimiter = createRateLimiter({ limit: 60, windowMs: 60_000 });
