# Base System

Industry-grade Next.js base system. Clone this for every new project — it ships with i18n, Resend email, Supabase, security headers, testing infrastructure, and CI/CD pre-configured.

## Tech Stack

| Layer      | Technology               |
| ---------- | ------------------------ |
| Framework  | Next.js 16 (App Router)  |
| Language   | TypeScript (strict)      |
| Styling    | Tailwind CSS + shadcn/ui |
| i18n       | next-intl (en, jp)       |
| Email      | Resend + React Email     |
| Database   | Supabase (PostgreSQL)    |
| Validation | Zod                      |
| Testing    | Vitest + Playwright      |
| CI/CD      | GitHub Actions           |

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url> my-project && cd my-project
npm install

# 2. Configure environment
cp .env.example .env.local
# Fill in RESEND_API_KEY, NEXT_PUBLIC_SUPABASE_URL, etc.

# 3. Start dev server
npm run dev
```

## Project Structure

```
src/
  app/          Next.js App Router (pages, layouts, API routes)
  components/   Shared UI components (layout/, common/, ui/)
  features/     Feature-based modules (home/, contact/)
  hooks/        Global custom hooks
  lib/          Utilities, clients, services
  config/       Site-wide configuration
  types/        TypeScript type definitions
  i18n/         Internationalisation config
  test/         Test setup, mocks, E2E tests
```

See [CONVENTIONS.md](./CONVENTIONS.md) for the full folder structure and naming rules.

## Available Scripts

| Script                  | Description                |
| ----------------------- | -------------------------- |
| `npm run dev`           | Start development server   |
| `npm run build`         | Production build           |
| `npm run start`         | Start production server    |
| `npm run lint`          | Run ESLint                 |
| `npm run format`        | Format with Prettier       |
| `npm run format:check`  | Check formatting (CI)      |
| `npm run type-check`    | TypeScript type checking   |
| `npm run test`          | Run unit/integration tests |
| `npm run test:watch`    | Watch mode                 |
| `npm run test:coverage` | Tests with coverage report |
| `npm run test:e2e`      | Playwright E2E tests       |
| `npm run db:types`      | Regenerate Supabase types  |
| `npm run analyze`       | Bundle size analysis       |

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
RESEND_API_KEY=re_...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

All variables are validated at startup via `src/lib/env.ts`. Missing required variables cause an immediate startup failure with a clear error.

## i18n

Supported locales are defined in `src/i18n/routing.ts`. Translation files live in `messages/`.

To add a new locale:

1. Add the locale code to `src/i18n/routing.ts`
2. Create `messages/<locale>.json`
3. Update the middleware matcher in `middleware.ts`

## Email (Resend)

Email templates use React Email (`src/lib/resend/templates/`). This ensures:

- All user input is automatically escaped (no XSS)
- Templates are type-safe
- Templates can be previewed with `npx email dev`

To send an email, call functions from `src/lib/resend/service.ts`.

## Database (Supabase)

Three client types for Next.js App Router:

- `src/lib/supabase/client.ts` — browser client (Client Components)
- `src/lib/supabase/server.ts` — server client (Server Components, Route Handlers)
- `src/lib/supabase/middleware.ts` — middleware client (session refresh)

After schema changes, regenerate types:

```bash
npm run db:types
```

Use `BaseRepository` from `src/lib/supabase/repository.ts` as a base class for data access.

## Security

See [SECURITY.md](./SECURITY.md) for the full security posture, OWASP coverage, and incident response steps.

Key measures:

- Security headers (CSP, HSTS, X-Frame-Options) via `next.config.ts`
- Rate limiting on all API routes (`src/lib/rate-limit.ts`)
- CSRF origin validation (`src/lib/csrf.ts`)
- Input validation with Zod at all API boundaries
- Env vars validated at startup with fail-fast behavior

## Testing

```bash
npm run test:coverage    # unit + integration (must stay above 80%)
npm run test:e2e         # Playwright end-to-end
```

Tests live next to their source in `__tests__/` directories. E2E tests live in `src/test/e2e/`.

## Contributing

1. Branch from `main` with a descriptive name (`feat/add-auth`, `fix/rate-limit-bug`)
2. Follow [CONVENTIONS.md](./CONVENTIONS.md)
3. Ensure `npm run test:coverage` passes (80%+ coverage)
4. Ensure `npm run build` succeeds
5. Open a pull request — CI will run automatically
