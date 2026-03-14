# Security Policy

## OWASP Top 10 Coverage

| #   | Vulnerability                      | Status       | Implementation                                                                |
| --- | ---------------------------------- | ------------ | ----------------------------------------------------------------------------- |
| A1  | Broken Access Control              | ✅ Addressed | Supabase RLS policies; route-level auth checks                                |
| A2  | Cryptographic Failures             | ✅ Addressed | HSTS header; HTTPS enforced; no secrets in source                             |
| A3  | Injection                          | ✅ Addressed | Zod validation; parameterized Supabase queries; `escapeHtml()` for plain HTML |
| A4  | Insecure Design                    | ✅ Addressed | Rate limiting; fail-fast env validation; minimal API surface                  |
| A5  | Security Misconfiguration          | ✅ Addressed | Security headers in `next.config.ts`; CSP; `poweredByHeader: false`           |
| A6  | Vulnerable Components              | ⚠️ Ongoing   | Run `npm audit` regularly; keep deps updated                                  |
| A7  | Authentication Failures            | ✅ Addressed | Supabase Auth; session cookies with `SameSite=Lax`                            |
| A8  | Software & Data Integrity Failures | ✅ Addressed | No `eval()`; CSP blocks unsigned scripts                                      |
| A9  | Security Logging & Monitoring      | ⚠️ Partial   | Server-side `console.error` logging; add Sentry/Datadog for production        |
| A10 | SSRF                               | ✅ Addressed | No user-controlled URLs used in server-side fetches                           |

## Security Headers

Set in `next.config.ts` for all routes:

| Header                      | Value                                          |
| --------------------------- | ---------------------------------------------- |
| `X-Content-Type-Options`    | `nosniff`                                      |
| `X-Frame-Options`           | `DENY`                                         |
| `X-XSS-Protection`          | `0` (CSP preferred)                            |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`              |
| `Permissions-Policy`        | `camera=(), microphone=(), geolocation=()`     |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `Content-Security-Policy`   | See `next.config.ts`                           |

## Secret Management

- **NEVER** hardcode secrets in source code.
- Store secrets in `.env.local` (git-ignored) or your hosting provider's environment variable system.
- All required variables are validated at startup via `src/lib/env.ts`. Missing variables cause an immediate startup failure with a clear error.
- Rotate any secret that may have been exposed immediately.

## Pre-Commit Security Checklist

Before every commit:

- [ ] No secrets in staged files (`git diff --staged | grep -i 'api_key\|password\|secret'`)
- [ ] All user inputs validated with Zod at API boundaries
- [ ] New API routes include rate limiting (`contactFormLimiter` or `apiLimiter`)
- [ ] New API routes call `validateCsrfOrigin(req)` for state-changing methods
- [ ] No `dangerouslySetInnerHTML` with unescaped user input
- [ ] No raw HTML string interpolation — use React Email or `escapeHtml()`
- [ ] `npm audit` passes with no critical/high vulnerabilities

## Rate Limiting

- **Contact form**: 5 requests per minute per IP (`contactFormLimiter`)
- **General API**: 60 requests per minute per IP (`apiLimiter`)
- **Production recommendation**: Use [Upstash Redis Rate Limit](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview) for serverless/multi-instance deployments.

## Incident Response

1. **Stop** — take the affected service offline if actively exploited
2. **Assess** — determine the blast radius (which data, which users)
3. **Revoke** — rotate all secrets that may have been exposed
4. **Fix** — patch the vulnerability in a hotfix branch
5. **Deploy** — deploy the fix and re-enable the service
6. **Review** — audit similar patterns across the codebase
7. **Document** — update this file with the incident and resolution

## Dependency Audits

Run regularly (recommended: weekly in CI):

```bash
npm audit
npm audit fix   # auto-fix non-breaking vulnerabilities
```

Add to CI pipeline:

```yaml
- name: Audit dependencies
  run: npm audit --audit-level=high
```
