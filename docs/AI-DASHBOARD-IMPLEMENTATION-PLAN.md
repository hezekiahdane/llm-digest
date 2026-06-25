# AI Model Intelligence Dashboard — Implementation Plan

**Project:** Live AI model comparison dashboard
**Stack:** Next.js (App Router), Vercel KV, Vercel Cron, Recharts
**Deployment:** Vercel
**Access:** Public (no authentication)
**Goal:** A 24/7 running agent that fetches live data every hour and displays real-time status, benchmarks, releases, and pricing across OpenAI, Anthropic, Google, and Meta AI models.

---

## Overview

The system has two main parts: a **data agent** (hourly cron job that fetches and caches live data) and a **dashboard** (Next.js frontend that reads from the cache). Both live in the same Next.js repo and deploy together on Vercel.

---

## Phase 1 — Project setup

**Estimated time: 0.5 days**

Goals: get the repo scaffolded and all dependencies installed before writing any feature code.

### Tasks

1. Install dependencies in your existing Next.js project:
   ```bash
   npm install fast-xml-parser @vercel/kv recharts
   ```

2. Create a Vercel KV database from the Vercel dashboard (Storage tab → Create KV). Copy the four env vars it gives you.

3. Add environment variables to `.env.local`:
   ```
   CRON_SECRET=<generate a random string>
   KV_URL=
   KV_REST_API_URL=
   KV_REST_API_TOKEN=
   KV_REST_API_READ_ONLY_TOKEN=
   NEXT_PUBLIC_URL=http://localhost:3000
   ```

4. Add `vercel.json` to the project root to define the cron schedule:
   ```json
   {
     "crons": [
       {
         "path": "/api/cron/fetch-models",
         "schedule": "0 * * * *"
       }
     ]
   }
   ```

5. Create the folder structure:
   ```
   app/
     api/
       models/route.ts
       cron/fetch-models/route.ts
     dashboard/page.tsx
   lib/
     fetchers/
       status.ts
       releases.ts
       benchmarks.ts
     cache.ts
   components/
     Dashboard.tsx
     StatusGrid.tsx
     BenchmarkPanel.tsx
     PricingTable.tsx
     ActivityFeed.tsx
   ```

### Definition of done
- `npm run dev` starts without errors
- KV connection is verified (`kv.set` / `kv.get` round-trip in a test script)

---

## Phase 2 — Data fetchers

**Estimated time: 1 day**

Goals: write the three fetcher modules that pull live data from public sources. Each fetcher is a standalone async function — no side effects, just fetch and return.

### 2a. Status fetcher (`lib/fetchers/status.ts`)

Fetch the Statuspage.io JSON summary for each provider. All four use the same API format.

| Provider | Status URL |
|---|---|
| OpenAI | `https://status.openai.com/api/v2/summary.json` |
| Anthropic | `https://status.anthropic.com/api/v2/summary.json` |
| Google | `https://status.cloud.google.com/incidents.json` |
| Meta | `https://metastatus.com/api/v2/summary.json` |

Returns per provider: `{ provider, status, uptime, lastChecked }` where status is one of `operational | degraded | outage | unknown`.

Use `Promise.allSettled` so one failing provider doesn't break the others.

### 2b. Releases fetcher (`lib/fetchers/releases.ts`)

Parse RSS feeds from each provider's official blog using `fast-xml-parser`. Fetch the 5 most recent items per feed and merge into a single list sorted by date descending.

| Provider | RSS Feed |
|---|---|
| OpenAI | `https://openai.com/news/rss.xml` |
| Anthropic | `https://www.anthropic.com/rss.xml` |
| Google | `https://blog.google/products/gemini/rss` |
| Meta | `https://ai.meta.com/blog/rss` |

Returns: array of `{ provider, title, link, date, type: 'release' }` — latest 20 items overall.

### 2c. Benchmarks fetcher (`lib/fetchers/benchmarks.ts`)

Pull from the Artificial Analysis public API (`https://artificialanalysis.ai/api/v1/models`). Filter to the 8 target models and map to a clean schema.

Target models: `gpt-4o`, `gpt-4.1`, `o3`, `claude-opus-4`, `claude-sonnet-4-6`, `gemini-2.5-pro`, `gemini-2.5-flash`, `llama-4-maverick`.

Returns per model: `{ id, name, provider, mmlu, humaneval, math, inputPrice, outputPrice, latencyP50 }`.

> **Fallback:** If the AA API is unavailable or returns incomplete data, fall back to the last successfully cached benchmark data rather than writing nulls. Log a warning.

### Definition of done
- Each fetcher runs independently via a test script (`npx ts-node lib/fetchers/status.ts`) and returns valid data
- `Promise.allSettled` is used in all three so partial failures are handled gracefully

---

## Phase 3 — Cache layer and cron route

**Estimated time: 0.5 days**

Goals: wire the fetchers into an hourly cron job and persist the result to Vercel KV.

### 3a. Cache helpers (`lib/cache.ts`)

Two functions: `getCachedData()` and `setCachedData(data)`. KV key is `ai-models-data`. TTL is 7200 seconds (2-hour safety buffer beyond the 1-hour cron interval).

### 3b. Cron route (`app/api/cron/fetch-models/route.ts`)

- Verify `Authorization: Bearer <CRON_SECRET>` header — Vercel sets this automatically when calling cron routes
- Run all three fetchers in parallel with `Promise.all`
- Write the merged result to KV with `setCachedData`
- Return `{ ok: true, fetchedAt }` on success

> This route should also be callable manually via curl for testing:
> ```bash
> curl -H "Authorization: Bearer <your-secret>" https://your-app.vercel.app/api/cron/fetch-models
> ```

### 3c. Public data route (`app/api/models/route.ts`)

Simple read-through: call `getCachedData()` and return it as JSON. Return a `503` with `{ error: 'No data yet' }` if the cache is empty (first deploy before the cron has run).

### Definition of done
- Hitting the cron route manually populates KV
- Hitting `/api/models` returns the cached payload
- Empty cache returns 503, not a 500

---

## Phase 4 — Dashboard UI

**Estimated time: 1–1.5 days**

Goals: build the React components that consume the `/api/models` endpoint and render the four dashboard sections.

### Data fetching (server component)

`app/dashboard/page.tsx` is an async server component. It fetches from `/api/models` with `next: { revalidate: 3600 }` so Next.js automatically revalidates the page every hour, matching the cron interval.

### Components to build

**`StatusGrid`** — 4 provider cards showing operational/degraded/outage status, latest models tracked, and 30-day uptime bar. Data source: `statuses[]` from cache.

**`BenchmarkPanel`** — Tabbed bar chart (MMLU / HumanEval / MATH / Latency) with switchable views. Use Recharts (`BarChart`, `Bar`, `XAxis`, `YAxis`, `Tooltip`). Data source: `benchmarks[]` from cache.

**`PricingTable`** — Input/output price per 1M tokens for each flagship model with provider badges. Data source: `benchmarks[].inputPrice` / `outputPrice`.

**`ActivityFeed`** — Reverse-chronological list of releases, incidents, and benchmark updates with color-coded tags. Data source: `releases[]` merged with any incidents from `statuses[]`.

**`Dashboard`** — Top-level wrapper that receives the full data payload as props and composes the four panels. Also displays the `fetchedAt` timestamp and an auto-incrementing "updated N minutes ago" counter (client component).

### Responsive layout

- Desktop: 2-column grid for benchmarks + pricing, full-width for status and feed
- Mobile: single column stack

### Definition of done
- Dashboard loads data from the real `/api/models` endpoint (not mock data)
- All four sections render correctly with real provider data
- `fetchedAt` timestamp is visible on the page

---

## Phase 5 — Deploy

**Estimated time: 0.5 days**

### Steps

1. Push to your main branch — Vercel auto-deploys
2. Add all env vars to Vercel project settings (Settings → Environment Variables)
3. Set `NEXT_PUBLIC_URL` to your production URL
4. Trigger the cron manually once to pre-populate KV before the first scheduled run:
   ```bash
   curl -H "Authorization: Bearer <CRON_SECRET>" https://your-app.vercel.app/api/cron/fetch-models
   ```
5. Verify `/api/models` returns live data
6. Check the Vercel dashboard (Cron Jobs tab) to confirm the schedule is registered

### Free tier limits to be aware of

| Resource | Vercel Free Limit | This project's usage |
|---|---|---|
| Cron jobs | 2 per project | 1 (hourly fetch) |
| KV reads | 30,000/month | ~720/month |
| KV writes | 3,000/month | ~720/month |
| Function executions | 100,000/month | ~1,440/month |

All well within the free tier.

---

## Delivery timeline

| Phase | Task | Duration | Dependency |
|---|---|---|---|
| 1 | Project setup | 0.5d | — |
| 2 | Data fetchers | 1d | Phase 1 |
| 3 | Cache + cron route | 0.5d | Phase 2 |
| 4 | Dashboard UI | 1–1.5d | Phase 3 |
| 5 | Deploy | 0.5d | Phase 4 |
| **Total** | | **3.5–4 days** | |

---

## Key decisions and tradeoffs

**Why Vercel KV instead of a database?** The data payload is small (< 50KB), updated at most once per hour, and read by a single route. A full database would be over-engineered. KV is zero-setup and free at this scale.

**Why not stream updates in real-time?** Provider status pages update infrequently (incidents last hours, not minutes). Hourly polling is sufficient and avoids rate-limiting. If real-time status becomes a requirement, add a WebSocket or SSE route later.

**Why Artificial Analysis for benchmarks?** They maintain a normalized, up-to-date dataset covering all four providers in a consistent format. Scraping each provider's benchmark claims individually would require brittle HTML parsers and produce incomparable numbers.

**Why `revalidate: 3600` on the page instead of client-side fetching?** ISR (Incremental Static Regeneration) means the dashboard loads instantly from a pre-rendered page. The data is at most 1 hour stale, which is acceptable. No loading spinners, no client-side fetch waterfalls.

---

## Resolved decisions

| Question | Decision |
|---|---|
| Deployment target | Vercel — cron jobs and KV are native to the platform |
| Chart library | Recharts — install via `npm install recharts` in Phase 1 |
| Dashboard access | Public — no authentication layer needed |
| Alerts at launch | Deferred — can be added as a future extension without changes to the core architecture |
