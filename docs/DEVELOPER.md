# Developer Guide

Technical walkthrough of the base_system architecture. Read this to understand how the codebase works before building features.

## Prerequisites

- Node.js 20+
- npm
- Git

Optional (per module):

- A Supabase project (auth + database modules)
- A Resend account with verified sender domain (email module)
- An Arcjet account (security rate limiting)
- A Sentry project (monitoring module)

## Local Setup

```bash
# 1. Clone the repository
git clone <repo-url> my-project && cd my-project

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local — see docs/ENV.md for all variables

# 4. Start the dev server
npm run dev
```

The project builds and runs with **zero env vars** configured. Opt-in modules degrade gracefully when their vars are missing. See [Build-Safe Environment](#build-safe-environment) for details.

## Architecture Overview

```
src/
  app/              Next.js App Router (pages, layouts, API routes)
  components/       Shared UI (layout/, common/, ui/)
  features/         Feature-based modules (home/, contact/)
  hooks/            Global custom hooks
  lib/              Core + opt-in modules
    core/           [Required] Env, security, API utilities, config
    auth/           [Opt-in]  Supabase Auth
    database/       [Opt-in]  Drizzle ORM
    email/          [Opt-in]  Resend + React Email
    monitoring/     [Opt-in]  Sentry + Vercel Analytics
    validators/     [Standalone] Shared Zod schemas
  config/           Site-wide configuration
  types/            TypeScript type definitions
  i18n/             Internationalization config
  test/             Test setup, mocks, E2E
```

### Module System

The `src/lib/` directory is organized into self-contained modules. Each module:

- Has a barrel `index.ts` that re-exports its public API
- Manages its own dependencies (clients, services, types)
- Never imports from another module's internals
- Degrades gracefully when its env vars are missing

**`core/`** is the only required module. Everything else is opt-in — delete a module's folder to remove it from the project with no further config changes.

### Data Flow

```
Browser Request
  -> Next.js App Router
    -> middleware.ts (i18n locale detection, auth session refresh)
    -> Page (Server Component) or API Route
      -> API Route uses withApi pipeline:
         CSRF -> Rate Limit -> Auth -> Zod Validation -> Handler -> Response
      -> Page renders with next-intl translations
```

## Module Deep Dives

### core/ — Always Required

The foundation module. Everything else depends on it.

#### Environment Validation (`core/env.ts`)

Uses `@t3-oss/env-nextjs` with Zod schemas to validate all env vars at startup.

```typescript
import { env } from '@/lib/core/env';

// Type-safe, validated at startup
const url = env.NEXT_PUBLIC_SITE_URL;
```

**Never use `process.env` directly.** Always import from `@/lib/core/env`.

The env schema defines which vars are required vs optional. Optional vars return `undefined` when not set — modules check for this and disable themselves gracefully.

#### Security (`core/security/`)

| File | Purpose |
|------|---------|
| `arcjet.ts` | Rate limiting via Arcjet (falls back to allow-all if `ARCJET_KEY` is missing) |
| `csrf.ts` | Origin-based CSRF validation |
| `csp.ts` | Content Security Policy header generation |
| `sanitize.ts` | HTML escaping and stripping utilities |

#### API Utilities (`core/api/`)

| File | Purpose |
|------|---------|
| `with-api.ts` | The `withApi` wrapper — handles CSRF, rate limiting, auth, validation, errors |
| `response.ts` | `ApiResponse<T>` type, `successResponse()`, `errorResponse()` |
| `errors.ts` | Typed error classes: `AppError`, `ValidationError`, `NotFoundError`, etc. |

#### Site Config (`core/config/site.ts`)

Centralized config for site name, URL, OG image, locales, nav links, and social links. All pages and components reference this instead of hardcoding values.

### auth/ — Supabase Authentication

Three client types for Next.js App Router:

| File | Context | Usage |
|------|---------|-------|
| `clients/browser.ts` | Client Components | `createBrowserClient()` |
| `clients/server.ts` | Server Components, Route Handlers | `createServerClient()` |
| `clients/middleware.ts` | Middleware | `createMiddlewareClient()` |

Additional files:

- `guard.ts` — `requireAuth()` helper that throws `UnauthorizedError` if no session
- `hooks.ts` — `useUser()` and `useSession()` React hooks
- `types.ts` — Auth-related TypeScript types

**Required env vars:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

### database/ — Drizzle ORM

| File | Purpose |
|------|---------|
| `client.ts` | `getDb()` lazy factory — creates the Drizzle client on first call |
| `schema/index.ts` | Drizzle table definitions (add your tables here) |
| `repository.ts` | `BaseRepository<TTable>` — generic CRUD base class |

#### BaseRepository

```typescript
import { BaseRepository } from '@/lib/database/repository';
import { users } from '@/lib/database/schema';

class UserRepository extends BaseRepository<typeof users> {
  constructor() {
    super(users);
  }

  // Built-in: findAll(), create(), delete()

  // Add custom queries:
  async findByEmail(email: string) {
    const db = getDb();
    return db.select().from(this.table).where(eq(this.table.email, email));
  }
}

export const userRepo = new UserRepository();
```

**Required env vars:** `DATABASE_URL` (pooled connection), `DATABASE_URL_DIRECT` (direct connection for migrations)

### email/ — Resend + React Email

| File | Purpose |
|------|---------|
| `client.ts` | `getResend()` lazy factory |
| `service.ts` | High-level email functions (e.g., `sendContactEmails()`) |
| `templates/` | React Email components (type-safe, XSS-safe by default) |

**Never construct email HTML with string interpolation.** Always use React Email components:

```tsx
// src/lib/email/templates/welcome.tsx
import { Html, Head, Body, Text } from '@react-email/components';

interface WelcomeEmailProps {
  name: string;
}

export function WelcomeEmail({ name }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Body>
        <Text>Welcome, {name}!</Text>
      </Body>
    </Html>
  );
}
```

**Required env vars:** `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_ADMIN_EMAIL`

### monitoring/ — Sentry + Vercel Analytics

| File | Purpose |
|------|---------|
| `sentry.ts` | Sentry initialization and error reporting |
| `analytics.ts` | Vercel Analytics and SpeedInsights components |

Vercel Analytics and SpeedInsights are wired into the root layout and activate automatically on Vercel deployments. Sentry requires `SENTRY_DSN` and `SENTRY_AUTH_TOKEN`.

### validators/ — Shared Zod Schemas

Standalone module with no dependencies on other modules. Houses Zod schemas shared across features and API routes.

```
src/lib/validators/
  index.ts              Barrel export
  contact.schema.ts     Contact form validation
```

Add new schemas here when they're used by multiple features. Feature-specific schemas can live in `src/features/<feature>/validators/` instead.

## The withApi Pipeline

Every API route uses the `withApi` wrapper. Here's what it does, step by step:

```
Request arrives
  |
  1. CSRF Check (default: enabled for mutations)
  |   - Validates request origin matches NEXT_PUBLIC_SITE_URL
  |   - Returns 403 if origin mismatch
  |
  2. Rate Limiting (if configured)
  |   - Checks IP against Arcjet rate limiter
  |   - Returns 429 with Retry-After header if exceeded
  |
  3. Auth Check (if configured)
  |   - Dynamically imports auth module
  |   - Validates Supabase session
  |   - Returns 401 if no valid session
  |   - Returns 500 if auth module not installed
  |
  4. Zod Validation (if schema provided)
  |   - Parses request body against schema
  |   - Returns 422 with flattened errors if invalid
  |
  5. Handler Execution
  |   - Your business logic runs here
  |   - Receives { data, request, user } context
  |   - Return successResponse(result) or throw AppError
  |
  6. Error Handling (automatic)
      - AppError subclasses -> their status code + message
      - Unknown errors -> 500 "Internal server error"
```

### Configuration Options

```typescript
withApi(
  {
    schema: myZodSchema,     // Zod schema for body validation (optional)
    rateLimit: 'api',        // Rate limit preset: 'api' | 'contact' (optional)
    csrf: true,              // CSRF check (default: true)
    auth: false,             // Require authenticated user (default: false)
  },
  handler,
);
```

## How To: Add a New Feature

Example: adding a "testimonials" feature.

### 1. Create the feature folder

```
src/features/testimonials/
  components/
    TestimonialCard.tsx
    TestimonialGrid.tsx
  sections/
    TestimonialsSection.tsx
```

### 2. Add a Zod schema (if needed)

```typescript
// src/lib/validators/testimonial.schema.ts
import { z } from 'zod';

export const testimonialSchema = z.object({
  author: z.string().min(1).max(100),
  company: z.string().min(1).max(100),
  quote: z.string().min(10).max(500),
  rating: z.number().int().min(1).max(5),
});

export type TestimonialFormData = z.infer<typeof testimonialSchema>;
```

Re-export from `src/lib/validators/index.ts`.

### 3. Create the API route

```typescript
// src/app/api/testimonials/route.ts
import { withApi } from '@/lib/core/api/with-api';
import { successResponse } from '@/lib/core/api/response';
import { testimonialSchema } from '@/lib/validators';

export const POST = withApi(
  { schema: testimonialSchema, rateLimit: 'api', csrf: true },
  async ({ data }) => {
    // Save to database, send notification, etc.
    return successResponse({ id: '123', ...data });
  },
);
```

### 4. Add i18n keys

```json
// messages/en.json
{
  "testimonials": {
    "title": "What Our Clients Say",
    "submitButton": "Submit Testimonial"
  }
}
```

Add the same keys to every locale file (`messages/jp.json`, etc.).

### 5. Write tests

```typescript
// src/features/testimonials/components/__tests__/TestimonialCard.test.tsx
import { render, screen } from '@/test/utils';
import { TestimonialCard } from '../TestimonialCard';

describe('TestimonialCard', () => {
  it('renders author name and quote', () => {
    render(<TestimonialCard author="Jane" quote="Great product!" />);
    expect(screen.getByText('Jane')).toBeInTheDocument();
    expect(screen.getByText('Great product!')).toBeInTheDocument();
  });
});
```

### 6. Add the section to a page

```tsx
// src/app/[locale]/page.tsx
import { TestimonialsSection } from '@/features/testimonials/sections/TestimonialsSection';

export default function HomePage() {
  return (
    <>
      {/* ... other sections */}
      <TestimonialsSection />
    </>
  );
}
```

## How To: Add a New Locale

1. Add the locale code to `src/i18n/routing.ts`:

   ```typescript
   export const routing = defineRouting({
     locales: ['en', 'jp', 'ko'],  // added 'ko'
     defaultLocale: 'en',
   });
   ```

2. Create the translation file `messages/ko.json` with all keys from `messages/en.json`.

3. Update `src/lib/core/config/site.ts`:

   ```typescript
   locales: ['en', 'jp', 'ko'] as const,
   ```

4. Restart the dev server.

**Important:** Every key in `messages/en.json` must exist in every locale file. Missing keys cause runtime errors.

## How To: Add a New Module

Example: adding a `payments/` module for Stripe.

### 1. Create the module folder

```
src/lib/payments/
  index.ts          Barrel export
  client.ts         Lazy Stripe client factory
  service.ts        High-level payment functions
  types.ts          Payment-related types
```

### 2. Create the lazy client factory

```typescript
// src/lib/payments/client.ts
import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripeInstance) return stripeInstance;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');

  stripeInstance = new Stripe(key);
  return stripeInstance;
}
```

**Critical:** Never initialize at module scope. Always use a lazy factory.

### 3. Add env vars to the schema

```typescript
// src/lib/core/env.ts — add to the server object:
STRIPE_SECRET_KEY: z.string().min(1).optional(),
STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),

// Add to runtimeEnv:
STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
```

Mark as `.optional()` so the build doesn't fail when the var is missing.

### 4. Export from barrel

```typescript
// src/lib/payments/index.ts
export { getStripe } from './client';
export { createCheckoutSession, handleWebhook } from './service';
export type { PaymentIntent, CheckoutSession } from './types';
```

### 5. Document in CLAUDE.md

Add the module to the Project-Specific Overrides section:

```markdown
- **payments/** — Stripe integration for checkout and webhooks
  - Required env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
```

## How To: Extend BaseRepository

```typescript
import { eq, and, gte } from 'drizzle-orm';
import { BaseRepository } from '@/lib/database/repository';
import { getDb } from '@/lib/database/client';
import { orders } from '@/lib/database/schema';

class OrderRepository extends BaseRepository<typeof orders> {
  constructor() {
    super(orders);
  }

  async findByUser(userId: string) {
    const db = getDb();
    return db
      .select()
      .from(this.table)
      .where(eq(this.table.userId, userId));
  }

  async findRecentByUser(userId: string, since: Date) {
    const db = getDb();
    return db
      .select()
      .from(this.table)
      .where(
        and(
          eq(this.table.userId, userId),
          gte(this.table.createdAt, since),
        ),
      );
  }
}

export const orderRepo = new OrderRepository();
```

Always add custom query methods rather than writing raw queries in route handlers. This keeps data access logic centralized and testable.

## Build-Safe Environment

### How env validation works

`src/lib/core/env.ts` uses `@t3-oss/env-nextjs` to validate env vars at startup. The schema defines:

- **Required vars** (`.min(1)`) — app crashes at startup if missing
- **Optional vars** (`.optional()`) — returns `undefined` if missing, module degrades gracefully
- **Defaulted vars** (`.default('value')`) — uses the default if not set

### Current defaults

| Variable | Default |
|----------|---------|
| `NODE_ENV` | `development` |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` |
| `NEXT_PUBLIC_SITE_NAME` | `My App` |

### Build with zero env vars

A fresh clone builds successfully with no `.env.local` file because all module-specific vars are optional. This means:

- `npm run build` succeeds on a fresh clone
- Vercel preview deployments work even before env vars are configured
- CI pipelines don't need runtime secrets for build steps

If you add a new env var to the schema, **always make it `.optional()`** unless the entire app cannot function without it.

### SKIP_ENV_VALIDATION

Set `SKIP_ENV_VALIDATION=1` to bypass validation entirely. Use this only in CI pipelines where runtime secrets aren't available during the build step.

### Vercel deployment checklist

Before the **first production deploy**:

1. Set `NEXT_PUBLIC_SITE_URL` to the production domain (e.g., `https://myproject.com`)
2. Set `NEXT_PUBLIC_SITE_NAME` to the project name
3. Set env vars for every opt-in module you're using (see table in `docs/ENV.md`)
4. Trigger a redeploy after setting env vars — Vercel only reads them at build time

## Testing

### Unit & Integration (Vitest)

```bash
npm run test              # run once
npm run test:watch        # watch mode
npm run test:coverage     # with coverage report (target: 80%+)
```

- Tests live in `__tests__/` directories next to the code they test
- Mock external APIs with MSW handlers in `src/test/mocks/handlers.ts`
- Custom render helper with providers in `src/test/utils.tsx`
- Coverage thresholds enforced in `vitest.config.ts` (80% lines, functions, branches, statements)

### End-to-End (Playwright)

```bash
npm run test:e2e
```

- E2E specs live in `src/test/e2e/`
- Set `PLAYWRIGHT_BASE_URL` in `.env.local` to override the test target URL
- Playwright config is in `playwright.config.ts`

### TDD Workflow

1. Write the test first (RED) — it should fail
2. Write minimal implementation (GREEN) — make the test pass
3. Refactor (IMPROVE) — clean up while keeping tests green
4. Verify coverage is at 80%+

## Deployment

See `docs/RUNBOOK.md` for full deployment procedures.

### Quick reference

- **Vercel (recommended):** Push to `main` — auto-deploys. Set env vars in Vercel Dashboard.
- **Manual:** `npm ci && npm run build && npm run start` with `NODE_ENV=production`.
- **Health check:** `GET /api/health` returns 200 when healthy.
- **Rollback:** Vercel Dashboard -> Deployments -> Promote previous deployment.

## Troubleshooting

### Build fails with "Cannot find module '@/lib/auth'"

The auth module is not installed. Either:
- Install it: ensure `src/lib/auth/` exists with the required files
- Remove the reference: check your code for imports from `@/lib/auth` and remove them

### Build fails with env validation error

A required env var is missing. Either:
- Set the var in `.env.local` or Vercel Dashboard
- Make the var optional in `src/lib/core/env.ts` (change `.min(1)` to `.optional()`)
- Set `SKIP_ENV_VALIDATION=1` as a temporary workaround

### Smart/curly quotes breaking Turbopack

`messages/*.json` files contain Unicode curly quotes (U+201C/U+201D) instead of straight ASCII quotes. Common source: copy-pasting from WhatsApp, Notion, or rich text editors. Find and replace them:

```bash
grep -rn '[\x{201C}\x{201D}]' messages/
```

### Rate limiting during development

The contact endpoint enforces rate limits via Arcjet. If you hit limits during testing, either:
- Wait 60 seconds
- Restart the dev server (resets in-memory state)
- Remove `ARCJET_KEY` from `.env.local` (disables rate limiting entirely)

### CSRF validation failing in development

Ensure `NEXT_PUBLIC_SITE_URL` matches the actual origin of your requests, including the port number (e.g., `http://localhost:3000`).

### Supabase types out of date

After schema changes, regenerate types:

```bash
npm run db:types
```

Requires `SUPABASE_PROJECT_ID` in `.env.local`.
