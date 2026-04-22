# Security Hardening Plan — base_system
**Created:** 2026-04-22  
**Based on:** `docs/SECURITY-AUDIT-2026-04-22.md`  
**Priority order:** P0 (patch now) → P1 (this sprint) → P2 (next sprint)

---

## P0 — Dependency Patches (< 1 hour, zero risk)

Run these in a single commit. All are `npm install` upgrades with `audit fix`.

```bash
# Step 1: Fix auto-fixable CVEs
npm audit fix

# Step 2: Force-upgrade Next.js (outside stated range but patched)
npm install next@16.2.4

# Step 3: Verify
npm run build && npm run lint && npm audit --audit-level=high
```

**Fixes:** H2 (Next.js CVEs), H3 (next-intl open redirect), brace-expansion DoS  
**Note:** drizzle-orm@0.45.2+ is auto-fixed by `npm audit fix`.  
**Risk:** Low. The Next.js jump is a patch release (16.1.1 → 16.2.4). Verify E2E after.

---

## P1 — This Sprint (security gaps)

### Task 1 — Wire Nonce-Based CSP into Middleware (H5 + I3)

**Goal:** Replace `unsafe-inline` / `unsafe-eval` in the static CSP with nonce-based `strict-dynamic`.

**Files to change:**
1. `middleware.ts` — generate nonce, apply CSP header, forward nonce via response header
2. `next.config.ts` — remove the weak static CSP (keep other security headers)
3. `src/app/[locale]/layout.tsx` — read nonce from header, pass to `<Script nonce>` and inline styles

**Implementation outline:**

```ts
// middleware.ts — add before intlMiddleware call
import { generateCspNonce, buildCspHeader } from '@/lib/core/security/csp';

// Inside middleware():
const nonce = generateCspNonce();
const cspHeader = buildCspHeader(nonce);

const response = intlMiddleware(request);
response.headers.set('Content-Security-Policy', cspHeader);
response.headers.set('x-nonce', nonce); // pass nonce to layout
return response;
```

```ts
// src/app/[locale]/layout.tsx
import { headers } from 'next/headers';

const nonce = (await headers()).get('x-nonce') ?? '';
// Pass nonce to <Script nonce={nonce}> and any inline <style nonce={nonce}>
```

**Also update `buildCspHeader()` in csp.ts** to include Supabase URL in `connect-src` (fixes L2):
```ts
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
`connect-src 'self' ${supabaseUrl}`,
```

**Tests:** Update `src/lib/core/security/__tests__/csp.test.ts` to verify nonce format and header output.

---

### Task 2 — Fix Env Validation in Auth + Database Clients (M1 + M2)

**Goal:** Remove `process.env.*` direct reads and non-null assertions from auth and database clients.

**Files to change:**
1. `src/lib/core/env.ts` — add Supabase vars as required (or gracefully optional) server/client vars
2. `src/lib/auth/clients/server.ts` — replace `process.env.*!` with `env.*`
3. `src/lib/auth/clients/middleware.ts` — same
4. `src/lib/database/client.ts` — replace `process.env.DATABASE_URL` with `env.DATABASE_URL`

**env.ts additions:**
```ts
server: {
  // existing vars...
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  DATABASE_URL: z.string().url().optional(),
},
client: {
  // existing vars...
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
}
```

These are already defined as optional — the issue is the clients don't use them. Update clients:
```ts
// server.ts
import { env } from '@/lib/core/env';

const supabaseKey = options.useServiceRole
  ? env.SUPABASE_SERVICE_ROLE_KEY!  // still non-null but now validated
  : env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
```

Better: throw a descriptive error instead of non-null assert:
```ts
const supabaseKey = options.useServiceRole
  ? (env.SUPABASE_SERVICE_ROLE_KEY ?? (() => { throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for service role operations') })())
  : (env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? (() => { throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required') })());
```

---

### Task 3 — Fix Open Redirect in Auth Guard (M3)

**File:** `src/lib/auth/guard.ts`

**Change:** Validate the `redirect` pathname before setting it.

```ts
// Guard against open redirect: only allow relative paths
const isRelativePath =
  pathname.startsWith('/') && !pathname.startsWith('//') && !pathname.includes('://');
const safePath = isRelativePath ? pathname : '/';
loginUrl.searchParams.set('redirect', safePath);
```

**Also:** Add a corresponding validator on the login page when consuming the `redirect` param:
```ts
// On login success, validate before redirecting
const redirect = searchParams.get('redirect') ?? '/';
const isRelative = redirect.startsWith('/') && !redirect.startsWith('//');
router.push(isRelative ? redirect : '/');
```

**Tests:** Add test cases in `src/lib/auth/__tests__/guard.test.ts` for external URLs, `//evil.com`, and `http://` prefixes.

---

### Task 4 — Deprecate In-Memory Rate Limiter (H4)

**Goal:** Prevent future routes from accidentally using the serverless-ineffective `rate-limit.ts`.

**Files to change:**
1. `src/lib/rate-limit.ts` — add deprecation warning and a hard error in production
2. `SECURITY.md` — document that `withApi({ rateLimit })` is the only approved rate limiting approach

```ts
// src/lib/rate-limit.ts — add at top
if (process.env.NODE_ENV === 'production') {
  console.error(
    '[rate-limit] In-memory rate limiter is ineffective in serverless environments. Use withApi({ rateLimit }) instead.'
  );
}
```

**Long term:** Delete `src/lib/rate-limit.ts` in a future PR once all consumers are migrated.

---

### Task 5 — Add Max-Length to Contact Schema + Email Error Logging (L1 + M5)

**File 1:** `src/lib/validators/contact.schema.ts`
```ts
export const contactSchema = z.object({
  name: z.string().min(2).max(100, 'Name must be under 100 characters'),
  company: z.string().min(2).max(200, 'Company must be under 200 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(7).max(20, 'Phone number must be under 20 characters'),
  businessType: z.enum(['Bank', 'Insurer', 'OEM', 'Other']),
  message: z.string().min(10).max(5000, 'Message must be under 5000 characters').optional(),
});
```

**File 2:** `src/lib/email/service.ts` — fill in the empty error blocks:
```ts
if (adminResult.status === 'rejected') {
  console.error('[email] Failed to send admin notification:', adminResult.reason);
}
if (userResult.status === 'rejected') {
  console.error('[email] Failed to send user confirmation:', userResult.reason);
}
```

**Tests:** Update `src/lib/validators/__tests__/contact-schema.test.ts` to cover max-length violations.

---

### Task 6 — Protect Health Endpoint (M7 + L4)

**File:** `src/app/api/health/route.ts`

```ts
import { withApi } from '@/lib/core/api/with-api';
import { successResponse } from '@/lib/core/api/response';

export const GET = withApi({ csrf: false, rateLimit: 'api' }, async () => {
  return successResponse({
    status: 'ok',
    timestamp: new Date().toISOString(),
    // version removed from public response
  });
});
```

---

### Task 7 — Conditional HSTS (M6)

**File:** `next.config.ts`

```ts
const isProd = process.env.NEXT_PUBLIC_VERCEL_ENV === 'production';

const securityHeaders = [
  // ... other headers unchanged ...
  ...(isProd
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
    : []),
];
```

---

## P2 — Next Sprint (improvements)

### Task 8 — Add HTTP Method Enforcement to `withApi` (I1)

Add an `allowedMethods?: ('GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE')[]` option:

```ts
// In withApi, before CSRF check:
if (options.allowedMethods && !options.allowedMethods.includes(request.method as any)) {
  return NextResponse.json(errorResponse('Method not allowed'), {
    status: 405,
    headers: { Allow: options.allowedMethods.join(', ') },
  });
}
```

---

### Task 9 — Add Pagination to `BaseRepository.findAll()` (I5)

```ts
async findAll(opts?: { limit?: number; offset?: number }): Promise<TRow[]> {
  const db = getDb();
  const query = db.select().from(this.table as any);
  if (opts?.limit) query.limit(opts.limit);
  if (opts?.offset) query.offset(opts.offset);
  return query as Promise<TRow[]>;
}
```

---

### Task 10 — Audit Logging for Auth Events (I4)

Add structured logging in:
- `src/lib/auth/guard.ts` — log redirected auth failures
- Any future login/logout handlers — log auth events

Use Sentry breadcrumbs or a dedicated audit log table via `BaseRepository`.

---

### Task 11 — Export `PROTECTED_ROUTES` from Config (L3)

**New file:** `src/config/auth.config.ts`
```ts
export const PROTECTED_ROUTES = ['/dashboard', '/settings', '/admin'] as const;
```

Update `src/lib/auth/guard.ts` to import from config. Document this as a required customization point in `CLAUDE.md`.

---

## Verification Checklist

After completing P0 + P1:

- [ ] `npm audit --audit-level=high` returns 0 findings
- [ ] `npm run build` passes with zero errors
- [ ] `npm run lint` passes with zero warnings
- [ ] CSP header in browser DevTools shows `nonce-` and `strict-dynamic`, no `unsafe-inline`
- [ ] `connect-src` includes Supabase URL
- [ ] Auth guard open redirect test passes
- [ ] Contact form rejects fields over max length
- [ ] `/api/health` returns 429 after 60 req/min
- [ ] HSTS header absent on `localhost` / preview URLs
- [ ] Email errors appear in server logs when Resend is misconfigured
- [ ] E2E: contact form → email received end-to-end
- [ ] E2E: unauthenticated access to `/dashboard` → redirect to `/login`
