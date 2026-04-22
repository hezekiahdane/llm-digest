# Security Audit — base_system
**Date:** 2026-04-22  
**Auditor:** Claude Code (automated)  
**Scope:** Full codebase — dependencies, API layer, auth, CSP, rate limiting, input validation

---

## Executive Summary

The base_system has a solid security foundation: `withApi` enforces CSRF + rate limiting + Zod validation on all API routes, Arcjet protects against bots and abuse, React Email prevents email XSS, and all security headers are set. However, three **HIGH** severity vulnerabilities in installed packages need immediate patching, and several **MEDIUM** design gaps weaken the runtime defenses.

**Finding totals:** 2 Critical-adjacent (CVE upgrades) · 5 High · 7 Medium · 6 Low · 5 Improvements

---

## Severity: HIGH — Patch Immediately

### H1 — drizzle-orm@0.45.1: SQL Injection via Identifier Escaping
**File:** `package.json` → `drizzle-orm: ^0.45.1`  
**CVE:** GHSA-gpj5-g38j-94v9  
**Detail:** Drizzle ORM versions below `0.45.2` improperly escape SQL identifiers, allowing SQL injection through identifier names (table/column names) passed as dynamic parameters.  
**Impact:** Full database compromise if any code path allows user-controlled identifier names.  
**Fix:** `npm install drizzle-orm@latest` (pinned to ≥0.45.2).

---

### H2 — next@16.1.1: Multiple High-Severity CVEs
**File:** `package.json` → `next: 16.1.1`  
**CVEs:** GHSA-mq59-m269-xvcx · GHSA-jcc7-9wpm-mj36 · GHSA-ggv3-7p47-pfv8 · GHSA-h25m-26qc-wcjf · GHSA-9g9p-9gw9-jx7f · GHSA-h27x-g6w4-24gq · GHSA-5f7q-jpqc-wp7h · GHSA-q4gf-8mx6-v5v3  

| CVE | Vulnerability | Severity |
|-----|--------------|----------|
| GHSA-mq59-m269-xvcx | `null` origin bypasses Server Actions CSRF checks | HIGH |
| GHSA-jcc7-9wpm-mj36 | `null` origin bypasses dev HMR WebSocket CSRF | MEDIUM |
| GHSA-ggv3-7p47-pfv8 | HTTP request smuggling via rewrites | HIGH |
| GHSA-h25m-26qc-wcjf | RSC HTTP request deserialization DoS | HIGH |
| GHSA-9g9p-9gw9-jx7f | Image Optimizer DoS via remotePatterns | MEDIUM |
| GHSA-h27x-g6w4-24gq · GHSA-5f7q-jpqc-wp7h | PPR memory exhaustion | MEDIUM |
| GHSA-q4gf-8mx6-v5v3 | Server Components DoS | MEDIUM |

**Critical note:** The `null` origin CSRF bypass (GHSA-mq59-m269-xvcx) directly undermines `validateCsrfOrigin()` in `src/lib/core/security/csrf.ts`. A request with `Origin: null` passes the existing custom CSRF check AND bypasses Next.js's built-in protection.  
**Fix:** `npm install next@16.2.4` (minimum patched version).

---

### H3 — next-intl@4.7.0: Open Redirect
**File:** `package.json` → `next-intl: ^4.7.0`  
**CVE:** GHSA-8f24-v5vv-gm5j  
**Detail:** next-intl below 4.9.1 has an open redirect vulnerability in locale routing. An attacker can craft a URL that redirects users to an arbitrary external site.  
**Fix:** `npm install next-intl@latest` (≥4.9.1).

---

### H4 — In-Memory Rate Limiter Ineffective on Vercel
**File:** `src/lib/rate-limit.ts`  
**Detail:** `createRateLimiter` uses an in-process `Map` for state. On Vercel (serverless), each Lambda invocation has isolated memory — the map is always empty on cold starts. The rate limiter provides **zero protection** in production.  
**Note:** The Arcjet-backed `checkRateLimit` in `src/lib/core/security/arcjet.ts` does work (external service), but `rate-limit.ts` is also exported and could be used independently. The `contactFormLimiter` and `apiLimiter` exports give a false sense of security.  
**Fix:** Remove or clearly deprecate `src/lib/rate-limit.ts`; ensure all routes use `withApi({ rateLimit: 'contact' })` which calls Arcjet.

---

### H5 — CSP `unsafe-inline` + `unsafe-eval` in next.config.ts
**File:** `next.config.ts` — `securityHeaders` array, `Content-Security-Policy` entry  
**Detail:** The static CSP header includes `'unsafe-inline'` and `'unsafe-eval'` in `script-src`. This completely defeats XSS mitigation — any injected script can execute. A nonce-based CSP (`src/lib/core/security/csp.ts`) with `strict-dynamic` exists but is **not wired into middleware**, so the weaker static header is what browsers receive.  
**Impact:** XSS attacks can run arbitrary JavaScript despite the CSP being present.  
**Fix:** Wire `generateCspNonce()` + `buildCspHeader()` into `middleware.ts` and set the CSP header dynamically per-request. Remove `unsafe-inline` and `unsafe-eval` from the static fallback.

---

## Severity: MEDIUM

### M1 — Auth Clients Bypass Env Validation
**Files:** `src/lib/auth/clients/server.ts:24`, `src/lib/auth/clients/middleware.ts:17-18`  
**Detail:** Both files use `process.env.NEXT_PUBLIC_SUPABASE_URL!` and related vars with non-null assertions, bypassing the validated `env` object from `@/lib/core/env`. This violates base_system Rule #1 and means if vars are missing, the app fails with a cryptic runtime error instead of a clear startup error.  
**Fix:** Replace all `process.env.*` reads with `import { env } from '@/lib/core/env'` and add the Supabase vars as required fields in `env.ts`.

---

### M2 — Database Client Bypasses Env Validation
**File:** `src/lib/database/client.ts:5`  
**Detail:** `const connectionString = process.env.DATABASE_URL;` reads directly from `process.env`. Same rule violation as M1.  
**Fix:** Use `env.DATABASE_URL` from the validated env object.

---

### M3 — Open Redirect in Auth Guard
**File:** `src/lib/auth/guard.ts:20`  
**Detail:**
```ts
loginUrl.searchParams.set('redirect', pathname);
```
`pathname` comes from `request.nextUrl.pathname` which is controlled by the URL. After login, if the app blindly redirects to `redirect`, an attacker could craft a URL that redirects users to an external domain.  
**Fix:** Validate that the `redirect` value is a relative path before setting or consuming it:
```ts
const safePath = pathname.startsWith('/') && !pathname.startsWith('//') ? pathname : '/';
loginUrl.searchParams.set('redirect', safePath);
```
Also validate on the login page when consuming the redirect param.

---

### M4 — X-Forwarded-For Header Spoofable in Rate Limiting
**File:** `src/lib/core/api/with-api.ts:44`  
**Detail:**
```ts
const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'anonymous';
```
`x-forwarded-for` can be set by any client. An attacker can send `X-Forwarded-For: 1.2.3.4` to impersonate a different IP and bypass per-IP rate limits. On Vercel, the trusted header is `x-vercel-forwarded-for` or the first entry in the Arcjet decision (which uses its own IP detection).  
**Note:** Arcjet internally uses its own IP resolution, so this mainly affects the fallback path. Still, it should be hardened.  
**Fix:** Use a Vercel-specific trusted header or rely entirely on Arcjet's IP resolution (pass the full request object, not just the IP string).

---

### M5 — Silent Email Error Swallowing
**File:** `src/lib/email/service.ts:57-62`  
**Detail:**
```ts
if (adminResult.status === 'rejected') {
  // empty — no log, no metric, no alert
}
if (userResult.status === 'rejected') {
  // empty — no log, no metric, no alert
}
```
Failed email sends are completely invisible. In production, contact form submissions can silently drop without any record.  
**Fix:** Add `console.error` (server-side) or Sentry capture for rejected email sends.

---

### M6 — HSTS Header Active in Non-HTTPS Environments
**File:** `next.config.ts` — `Strict-Transport-Security` header  
**Detail:** `max-age=63072000; includeSubDomains; preload` is applied globally including in development and preview (HTTP) environments. HSTS on HTTP can cause browsers to permanently refuse HTTP connections to `localhost`, breaking development.  
**Fix:** Conditionally apply HSTS only when `NEXT_PUBLIC_VERCEL_ENV === 'production'`.

---

### M7 — Health Endpoint Unprotected
**File:** `src/app/api/health/route.ts`  
**Detail:** The health endpoint is the only API route not using `withApi`. It has no rate limiting, no error handling pipeline, and exposes `npm_package_version` publicly.  
**Fix:** Wrap with `withApi({ csrf: false, rateLimit: 'api' })` and strip the version from the public response (keep it internal/logged-only).

---

## Severity: LOW

### L1 — Contact Schema Missing Max-Length Validation
**File:** `src/lib/validators/contact.schema.ts`  
**Detail:** All fields have `min()` validation but no `max()`. A malicious actor can submit multi-megabyte `message` or `name` values that pass validation and get sent through Resend.  
**Fix:** Add `.max()` constraints: `name: z.string().min(2).max(100)`, `company: z.string().min(2).max(200)`, `message: z.string().min(10).max(5000).optional()`, `phone: z.string().min(7).max(20)`.

---

### L2 — CSP `connect-src 'self'` Blocks Supabase Client-Side Auth
**File:** `next.config.ts` and `src/lib/core/security/csp.ts`  
**Detail:** `connect-src 'self'` does not include `NEXT_PUBLIC_SUPABASE_URL`. Client-side Supabase auth calls (`supabase.auth.signIn`, token refresh) will be blocked by the browser CSP.  
**Fix:** Add the Supabase URL to `connect-src` in both the static header and the dynamic CSP builder. Since the URL is a `NEXT_PUBLIC_*` var, it can be interpolated at build time.

---

### L3 — Hardcoded Protected Routes in Auth Guard
**File:** `src/lib/auth/guard.ts:4`  
**Detail:** `const PROTECTED_ROUTES = ['/dashboard', '/settings', '/admin']` is hardcoded. Projects cloning base_system may add protected routes and forget to update this list.  
**Fix:** Document this as a required customization point in `CLAUDE.md`. Better: export a `PROTECTED_ROUTES` config from `src/config/` so it's harder to miss.

---

### L4 — Health Endpoint Exposes Package Version
**File:** `src/app/api/health/route.ts:9`  
**Detail:** `version: process.env.npm_package_version ?? '0.1.0'` is returned in the public response. Version disclosure helps attackers identify known CVEs for the exact dependency versions in use.  
**Fix:** Remove the version from the public response or gate it behind an internal secret header.

---

### L5 — rate-limit.ts Mutates Map Entry
**File:** `src/lib/rate-limit.ts:59`  
**Detail:** `entry.count += 1` mutates an object retrieved from the store, violating the immutability convention. While functionally correct in single-threaded JS, it's inconsistent with the codebase style and could cause subtle bugs if the store implementation changes.  
**Fix:** `store.set(key, { ...entry, count: entry.count + 1 });`

---

### L6 — Missing Standard `RateLimit-*` Response Headers
**File:** `src/lib/core/api/with-api.ts`  
**Detail:** When rate limiting is active, only a `Retry-After` header is returned on 429 responses. Standard `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset` headers are absent, making it harder for clients to implement proper backoff.  
**Fix:** Add these headers to both 429 responses and successful responses when rate limiting is configured.

---

## Improvements (Non-Security)

### I1 — No HTTP Method Enforcement in `withApi`
`withApi` applies to any HTTP method. A `POST`-only route can silently accept `GET`, `PUT`, `DELETE`. Add an `allowedMethods` option.

### I2 — No Request Body Size Limit
`request.json()` has no explicit size guard. Large bodies (e.g., 10MB JSON) will be parsed. Next.js has a default body limit (4MB), but it should be explicitly set per route.

### I3 — Nonce-Based CSP Not Wired Up
`src/lib/core/security/csp.ts` implements correct nonce-based CSP but is never called. The middleware doesn't use it. Either wire it in or remove the file to avoid confusion.

### I4 — No Audit Logging
There is no structured audit trail for auth events (login, logout, failed attempts) or admin actions. Sentry captures runtime errors but not security events.

### I5 — `BaseRepository.findAll()` Has No Pagination
`BaseRepository.findAll()` returns all rows with no limit. On large tables this causes memory pressure and slow responses. Add `limit`/`offset` parameters with sensible defaults.

---

## Dependency Audit Summary

| Package | Installed | Patched | Severity |
|---------|-----------|---------|----------|
| `next` | 16.1.1 | 16.2.4 | HIGH (multiple CVEs) |
| `drizzle-orm` | 0.45.1 | 0.45.2+ | HIGH (SQL injection) |
| `next-intl` | 4.7.0 | 4.9.1+ | MODERATE (open redirect) |
| `brace-expansion` | (transitive) | fixed via audit fix | MODERATE (DoS) |
| `esbuild` (drizzle-kit) | (transitive) | breaking change required | MODERATE (dev only) |

---

## What's Already Done Well

- `withApi` pipeline enforces CSRF + rate limit + Zod on every route by default
- Arcjet shields against bots and provides DDoS-grade rate limiting
- React Email prevents HTML injection in email templates
- `escapeHtml()` utility available for plain-string contexts
- All security headers present (HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy)
- Env validation via `@t3-oss/env-nextjs` at startup
- `poweredByHeader: false` removes Next.js fingerprinting
- `.gitignore` correctly excludes `.env*` and `.env*.local`
- Supabase SSR cookies (not localStorage) for auth tokens
- No hardcoded secrets found in source code
