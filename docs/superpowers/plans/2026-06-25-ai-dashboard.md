# AI Intelligence Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 24/7 automated AI model intelligence dashboard that fetches status, benchmarks, pricing, and releases hourly for OpenAI, Anthropic, Google, and Meta — and renders them in a public Next.js dashboard at `/dashboard`.

**Architecture:** A Vercel Cron job calls `/api/cron/fetch-models` every hour. The data agent runs three fetchers in parallel, diffs against the previous KV snapshot to detect changes (price shifts, new incidents, new releases), and writes a full `DashboardSnapshot` to Vercel KV. The `/dashboard` page is an async server component with `revalidate: 3600` that reads from `/api/models` — a thin KV read-through. Status history (30-day uptime) is stored as a rolling 720-entry array per provider in KV.

**Tech Stack:** Next.js 16 App Router · Vercel KV (`@vercel/kv`) · Recharts · `fast-xml-parser` · Vitest + MSW (unit) · Playwright (E2E) · Biome (lint/format)

## Global Constraints

- TypeScript strict — no `any` except explicit vitest/MSW escape hatches
- All dates stored and returned as ISO 8601 strings
- All fetchers use `Promise.allSettled` — one provider failure never blocks others
- Never use `withApi()` for GET-only or cron routes — use `NextResponse` directly
- Cron route auth: check `Authorization: Bearer <CRON_SECRET>` header only
- KV keys: `snapshot` (current data), `status-history:{provider}` (max 720 entries)
- Run `npm run lint` before every commit; fix all Biome errors
- TDD: write failing test → implement → verify passing → commit

## Parallel Execution Map

```
Task 1 (Foundation) ─────────────────────────────────────────────────────┐
                                                                          ↓
Tasks 2, 3, 4, 5, 8 run in PARALLEL ─────────────────────────────────────┤
  Task 2: Cache layer                                                      │
  Task 3: Status fetcher                                                   │
  Task 4: Releases fetcher                                                 │
  Task 5: Benchmarks fetcher                                               │
  Task 8: UI components                                                    │
                                                                          ↓
Task 6 (Data agent) — needs 2+3+4+5 ─────────────────────────────────────┤
                                                                          ↓
Task 7 (API routes) — needs 6 ────────────────────────────────────────────┤
                                                                          ↓
Task 9 (Dashboard page + E2E) — needs 7+8 ───────────────────────────────┘
```

## File Map

```
src/
  types/
    dashboard.ts              NEW — all shared types
  lib/
    cache.ts                  NEW — KV get/set helpers
    fetchers/
      status.ts               NEW — Statuspage.io + Google status
      releases.ts             NEW — RSS feeds via fast-xml-parser
      benchmarks.ts           NEW — Artificial Analysis API
    agents/
      data-agent.ts           NEW — orchestration + change detection
  app/
    api/
      cron/
        fetch-models/
          route.ts            NEW — hourly cron, verify secret, call agent
      models/
        route.ts              NEW — read-through from KV
    dashboard/
      page.tsx                NEW — async server component, ISR 3600s
  components/
    dashboard/
      Dashboard.tsx           NEW — top-level wrapper + grid layout
      StatusGrid.tsx          NEW — 4 provider status cards
      BenchmarkPanel.tsx      NEW — tabbed Recharts bar chart (client)
      PricingTable.tsx        NEW — input/output price per 1M tokens
      ActivityFeed.tsx        NEW — reverse-chrono event list
      UpdatedAt.tsx           NEW — "updated N min ago" (client)
  test/
    mocks/
      handlers.ts             MODIFY — add all external API mocks
vercel.json                   NEW — cron schedule
src/lib/core/config/site.ts   MODIFY — remove i18n refs, update copy
```

---

## Task 1: Foundation

**Files:**
- Create: `vercel.json`
- Create: `src/types/dashboard.ts`
- Modify: `src/lib/core/config/site.ts`
- Modify: `src/test/mocks/handlers.ts`
- Run: `npm install @vercel/kv recharts fast-xml-parser`

**Interfaces:**
- Produces: all shared types consumed by Tasks 2–9

- [ ] **Step 1: Install dependencies**

```bash
npm install @vercel/kv recharts fast-xml-parser
```

Expected output: three packages added to `package.json` dependencies with no peer-dep errors.

- [ ] **Step 2: Create vercel.json**

Create `vercel.json` in the project root:

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

- [ ] **Step 3: Create src/types/dashboard.ts**

```typescript
export type Provider = 'openai' | 'anthropic' | 'google' | 'meta';
export type ProviderStatus = 'operational' | 'degraded' | 'outage' | 'unknown';
export type ActivityEventType =
  | 'release'
  | 'incident'
  | 'incident_resolved'
  | 'price_change'
  | 'benchmark_change';

export interface StatusEntry {
  timestamp: string;
  status: ProviderStatus;
}

export interface ProviderStatusData {
  provider: Provider;
  status: ProviderStatus;
  uptime30d: number;
  lastChecked: string;
  history: StatusEntry[];
}

export interface BenchmarkData {
  id: string;
  name: string;
  provider: Provider;
  mmlu: number | null;
  humaneval: number | null;
  math: number | null;
  inputPrice: number | null;
  outputPrice: number | null;
  latencyP50: number | null;
}

export interface ReleaseItem {
  id: string;
  provider: Provider;
  title: string;
  link: string;
  date: string;
}

export interface ActivityEvent {
  id: string;
  provider: Provider;
  type: ActivityEventType;
  title: string;
  description: string;
  date: string;
  link?: string;
}

export interface DashboardSnapshot {
  fetchedAt: string;
  statuses: ProviderStatusData[];
  benchmarks: BenchmarkData[];
  releases: ReleaseItem[];
  activity: ActivityEvent[];
}

/** Raw output from the status fetcher — history managed by data agent */
export interface RawProviderStatus {
  provider: Provider;
  status: ProviderStatus;
  lastChecked: string;
}

/** Raw output from the benchmarks fetcher */
export interface RawBenchmark {
  id: string;
  name: string;
  provider: Provider;
  mmlu: number | null;
  humaneval: number | null;
  math: number | null;
  inputPrice: number | null;
  outputPrice: number | null;
  latencyP50: number | null;
}
```

- [ ] **Step 4: Update src/lib/core/config/site.ts**

Replace the entire file:

```typescript
import { env } from '@/lib/core/env';
import type { SitemapPage } from './site.types';

export const siteConfig = {
  name: env.NEXT_PUBLIC_SITE_NAME,
  description:
    'Live AI model comparison — status, benchmarks, pricing, and releases across OpenAI, Anthropic, Google, and Meta.',
  url: env.NEXT_PUBLIC_SITE_URL,
  ogImage: '/og-image.png',
  social: {
    twitter: '',
    linkedin: '',
    github: '',
  },
  pages: [
    { path: '/dashboard', priority: 1.0, changeFrequency: 'hourly' as const },
  ] satisfies SitemapPage[],
} as const;

export type SiteConfig = typeof siteConfig;
```

Create `src/lib/core/config/site.types.ts`:

```typescript
export type SitemapChangeFrequency =
  | 'always'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'never';

export interface SitemapPage {
  path: string;
  priority: number;
  changeFrequency: SitemapChangeFrequency;
}
```

- [ ] **Step 5: Update src/test/mocks/handlers.ts**

Replace the entire file:

```typescript
import { HttpResponse, http } from 'msw';

const mockStatuspageResponse = (indicator: 'none' | 'minor' | 'major') => ({
  status: { indicator },
  incidents: [],
});

const mockRssItem = (provider: string, num = 1) =>
  `<?xml version="1.0"?><rss version="2.0"><channel>${Array.from({ length: num }, (_, i) => `<item><title>${provider} Update ${i + 1}</title><link>https://${provider}.com/blog/${i + 1}</link><pubDate>Wed, 25 Jun 2026 00:00:00 +0000</pubDate><guid>https://${provider}.com/blog/${i + 1}</guid></item>`).join('')}</channel></rss>`;

export const handlers = [
  // Statuspage.io — OpenAI, Anthropic, Meta
  http.get('https://status.openai.com/api/v2/summary.json', () =>
    HttpResponse.json(mockStatuspageResponse('none')),
  ),
  http.get('https://status.anthropic.com/api/v2/summary.json', () =>
    HttpResponse.json(mockStatuspageResponse('none')),
  ),
  http.get('https://metastatus.com/api/v2/summary.json', () =>
    HttpResponse.json(mockStatuspageResponse('none')),
  ),
  // Google Cloud Status
  http.get('https://status.cloud.google.com/incidents.json', () =>
    HttpResponse.json({ items: [] }),
  ),
  // RSS feeds
  http.get('https://openai.com/news/rss.xml', () =>
    HttpResponse.text(mockRssItem('openai', 3)),
  ),
  http.get('https://www.anthropic.com/rss.xml', () =>
    HttpResponse.text(mockRssItem('anthropic', 3)),
  ),
  http.get('https://blog.google/products/gemini/rss', () =>
    HttpResponse.text(mockRssItem('google', 3)),
  ),
  http.get('https://ai.meta.com/blog/rss', () =>
    HttpResponse.text(mockRssItem('meta', 3)),
  ),
  // Artificial Analysis
  http.get('https://artificialanalysis.ai/api/v1/models', () =>
    HttpResponse.json({
      models: [
        {
          id: 'gpt-4o',
          name: 'GPT-4o',
          provider: 'openai',
          quality_index: 88.7,
          coding_index: 90.2,
          math_index: 76.6,
          input_price: 2.5,
          output_price: 10.0,
          median_output_tokens_per_second: 2.2,
        },
        {
          id: 'claude-sonnet-4-6',
          name: 'Claude Sonnet 4.6',
          provider: 'anthropic',
          quality_index: 91.2,
          coding_index: 88.5,
          math_index: 80.1,
          input_price: 3.0,
          output_price: 15.0,
          median_output_tokens_per_second: 1.9,
        },
      ],
    }),
  ),
];
```

- [ ] **Step 6: Commit**

```bash
git add vercel.json src/types/dashboard.ts src/lib/core/config/site.ts src/lib/core/config/site.types.ts src/test/mocks/handlers.ts package.json package-lock.json
git commit -m "feat: foundation — types, vercel.json, deps, MSW handlers"
```

---

## Task 2: Cache Layer

**Files:**
- Create: `src/lib/cache.ts`
- Create: `src/lib/__tests__/cache.test.ts`

**Interfaces:**
- Consumes: `DashboardSnapshot`, `Provider`, `StatusEntry` from `@/types/dashboard`
- Produces:
  - `getCachedSnapshot(): Promise<DashboardSnapshot | null>`
  - `setCachedSnapshot(data: DashboardSnapshot): Promise<void>`
  - `getStatusHistory(provider: Provider): Promise<StatusEntry[]>`
  - `appendStatusHistory(provider: Provider, entry: StatusEntry): Promise<StatusEntry[]>`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/cache.test.ts`:

```typescript
import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockKv = {
  get: vi.fn(),
  set: vi.fn(),
};

vi.mock('@vercel/kv', () => ({ kv: mockKv }));

import {
  getCachedSnapshot,
  setCachedSnapshot,
  getStatusHistory,
  appendStatusHistory,
} from '../cache';
import type { DashboardSnapshot, StatusEntry } from '@/types/dashboard';

const MOCK_SNAPSHOT: DashboardSnapshot = {
  fetchedAt: '2026-06-25T00:00:00.000Z',
  statuses: [],
  benchmarks: [],
  releases: [],
  activity: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getCachedSnapshot', () => {
  it('returns null when cache is empty', async () => {
    mockKv.get.mockResolvedValue(null);
    const result = await getCachedSnapshot();
    expect(result).toBeNull();
    expect(mockKv.get).toHaveBeenCalledWith('snapshot');
  });

  it('returns cached snapshot when present', async () => {
    mockKv.get.mockResolvedValue(MOCK_SNAPSHOT);
    const result = await getCachedSnapshot();
    expect(result).toEqual(MOCK_SNAPSHOT);
  });
});

describe('setCachedSnapshot', () => {
  it('writes snapshot with 2-hour TTL', async () => {
    mockKv.set.mockResolvedValue('OK');
    await setCachedSnapshot(MOCK_SNAPSHOT);
    expect(mockKv.set).toHaveBeenCalledWith('snapshot', MOCK_SNAPSHOT, { ex: 7200 });
  });
});

describe('getStatusHistory', () => {
  it('returns empty array when no history exists', async () => {
    mockKv.get.mockResolvedValue(null);
    const result = await getStatusHistory('openai');
    expect(result).toEqual([]);
    expect(mockKv.get).toHaveBeenCalledWith('status-history:openai');
  });

  it('returns stored history', async () => {
    const history: StatusEntry[] = [
      { timestamp: '2026-06-25T00:00:00.000Z', status: 'operational' },
    ];
    mockKv.get.mockResolvedValue(history);
    const result = await getStatusHistory('anthropic');
    expect(result).toEqual(history);
  });
});

describe('appendStatusHistory', () => {
  it('appends entry to existing history', async () => {
    const existing: StatusEntry[] = [
      { timestamp: '2026-06-24T23:00:00.000Z', status: 'operational' },
    ];
    mockKv.get.mockResolvedValue(existing);
    mockKv.set.mockResolvedValue('OK');

    const newEntry: StatusEntry = {
      timestamp: '2026-06-25T00:00:00.000Z',
      status: 'operational',
    };
    const result = await appendStatusHistory('openai', newEntry);

    expect(result).toEqual([...existing, newEntry]);
    expect(mockKv.set).toHaveBeenCalledWith('status-history:openai', [...existing, newEntry]);
  });

  it('caps history at 720 entries', async () => {
    const existing: StatusEntry[] = Array.from({ length: 720 }, (_, i) => ({
      timestamp: new Date(2026, 0, 1, i % 24).toISOString(),
      status: 'operational' as const,
    }));
    mockKv.get.mockResolvedValue(existing);
    mockKv.set.mockResolvedValue('OK');

    const newEntry: StatusEntry = {
      timestamp: '2026-06-25T00:00:00.000Z',
      status: 'operational',
    };
    const result = await appendStatusHistory('openai', newEntry);

    expect(result).toHaveLength(720);
    expect(result[719]).toEqual(newEntry);
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm test src/lib/__tests__/cache.test.ts
```

Expected: FAIL — `Cannot find module '../cache'`

- [ ] **Step 3: Implement src/lib/cache.ts**

```typescript
import { kv } from '@vercel/kv';
import type { DashboardSnapshot, Provider, StatusEntry } from '@/types/dashboard';

const SNAPSHOT_KEY = 'snapshot';
const STATUS_HISTORY_KEY = (provider: Provider) => `status-history:${provider}`;
const MAX_HISTORY = 720;

export async function getCachedSnapshot(): Promise<DashboardSnapshot | null> {
  return kv.get<DashboardSnapshot>(SNAPSHOT_KEY);
}

export async function setCachedSnapshot(data: DashboardSnapshot): Promise<void> {
  await kv.set(SNAPSHOT_KEY, data, { ex: 7200 });
}

export async function getStatusHistory(provider: Provider): Promise<StatusEntry[]> {
  return (await kv.get<StatusEntry[]>(STATUS_HISTORY_KEY(provider))) ?? [];
}

export async function appendStatusHistory(
  provider: Provider,
  entry: StatusEntry,
): Promise<StatusEntry[]> {
  const history = await getStatusHistory(provider);
  const updated = [...history, entry].slice(-MAX_HISTORY);
  await kv.set(STATUS_HISTORY_KEY(provider), updated);
  return updated;
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npm test src/lib/__tests__/cache.test.ts
```

Expected: PASS (4 test suites, all green)

- [ ] **Step 5: Commit**

```bash
git add src/lib/cache.ts src/lib/__tests__/cache.test.ts
git commit -m "feat: cache layer — KV snapshot and status history helpers"
```

---

## Task 3: Status Fetcher

**Files:**
- Create: `src/lib/fetchers/status.ts`
- Create: `src/lib/fetchers/__tests__/status.test.ts`

**Interfaces:**
- Produces: `fetchAllStatuses(now: string): Promise<RawProviderStatus[]>`
  where `RawProviderStatus = { provider: Provider; status: ProviderStatus; lastChecked: string }`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/fetchers/__tests__/status.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { fetchAllStatuses } from '../status';

const NOW = '2026-06-25T00:00:00.000Z';

describe('fetchAllStatuses', () => {
  it('returns operational for all providers when no incidents', async () => {
    const results = await fetchAllStatuses(NOW);
    expect(results).toHaveLength(4);
    expect(results.every(r => r.status === 'operational')).toBe(true);
    expect(results.every(r => r.lastChecked === NOW)).toBe(true);
  });

  it('returns degraded for Anthropic when status is minor', async () => {
    server.use(
      http.get('https://status.anthropic.com/api/v2/summary.json', () =>
        HttpResponse.json({ status: { indicator: 'minor' }, incidents: [] }),
      ),
    );

    const results = await fetchAllStatuses(NOW);
    const anthropic = results.find(r => r.provider === 'anthropic');
    expect(anthropic?.status).toBe('degraded');
  });

  it('returns outage for OpenAI when status is major', async () => {
    server.use(
      http.get('https://status.openai.com/api/v2/summary.json', () =>
        HttpResponse.json({ status: { indicator: 'major' }, incidents: [] }),
      ),
    );

    const results = await fetchAllStatuses(NOW);
    const openai = results.find(r => r.provider === 'openai');
    expect(openai?.status).toBe('outage');
  });

  it('returns degraded for Google when active incident exists', async () => {
    server.use(
      http.get('https://status.cloud.google.com/incidents.json', () =>
        HttpResponse.json({
          items: [{ end: null, severity: 'medium' }],
        }),
      ),
    );

    const results = await fetchAllStatuses(NOW);
    const google = results.find(r => r.provider === 'google');
    expect(google?.status).toBe('degraded');
  });

  it('returns unknown when a provider fetch fails', async () => {
    server.use(
      http.get('https://metastatus.com/api/v2/summary.json', () =>
        HttpResponse.error(),
      ),
    );

    const results = await fetchAllStatuses(NOW);
    const meta = results.find(r => r.provider === 'meta');
    expect(meta?.status).toBe('unknown');
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm test src/lib/fetchers/__tests__/status.test.ts
```

Expected: FAIL — `Cannot find module '../status'`

- [ ] **Step 3: Implement src/lib/fetchers/status.ts**

```typescript
import type { Provider, ProviderStatus, RawProviderStatus } from '@/types/dashboard';

interface StatuspageResponse {
  status: { indicator: 'none' | 'minor' | 'major' | 'critical' };
}

interface GoogleStatusResponse {
  items: Array<{ end?: string | null; severity?: string }>;
}

const STATUSPAGE_PROVIDERS: Array<{ provider: Provider; url: string }> = [
  { provider: 'openai', url: 'https://status.openai.com/api/v2/summary.json' },
  { provider: 'anthropic', url: 'https://status.anthropic.com/api/v2/summary.json' },
  { provider: 'meta', url: 'https://metastatus.com/api/v2/summary.json' },
];

function indicatorToStatus(indicator: string): ProviderStatus {
  if (indicator === 'none') return 'operational';
  if (indicator === 'minor') return 'degraded';
  return 'outage';
}

async function fetchStatuspageStatus(
  provider: Provider,
  url: string,
  now: string,
): Promise<RawProviderStatus> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: StatuspageResponse = await res.json();
  return { provider, status: indicatorToStatus(data.status.indicator), lastChecked: now };
}

async function fetchGoogleStatus(now: string): Promise<RawProviderStatus> {
  const res = await fetch('https://status.cloud.google.com/incidents.json', {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: GoogleStatusResponse = await res.json();
  const active = data.items.filter(i => i.end === null || i.end === undefined);
  let status: ProviderStatus = 'operational';
  if (active.length > 0) {
    status = active.some(i => i.severity === 'high') ? 'outage' : 'degraded';
  }
  return { provider: 'google', status, lastChecked: now };
}

export async function fetchAllStatuses(now: string): Promise<RawProviderStatus[]> {
  const statuspagePromises = STATUSPAGE_PROVIDERS.map(({ provider, url }) =>
    fetchStatuspageStatus(provider, url, now),
  );

  const results = await Promise.allSettled([
    ...statuspagePromises,
    fetchGoogleStatus(now),
  ]);

  const providers: Provider[] = ['openai', 'anthropic', 'meta', 'google'];

  return results.map((result, i) => {
    if (result.status === 'fulfilled') return result.value;
    return { provider: providers[i], status: 'unknown' as ProviderStatus, lastChecked: now };
  });
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npm test src/lib/fetchers/__tests__/status.test.ts
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/fetchers/status.ts src/lib/fetchers/__tests__/status.test.ts
git commit -m "feat: status fetcher — Statuspage.io + Google Cloud status"
```

---

## Task 4: Releases Fetcher

**Files:**
- Create: `src/lib/fetchers/releases.ts`
- Create: `src/lib/fetchers/__tests__/releases.test.ts`

**Interfaces:**
- Produces: `fetchAllReleases(): Promise<ReleaseItem[]>`
  Returns up to 20 items sorted by date descending, deduplicated by `id`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/fetchers/__tests__/releases.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { fetchAllReleases } from '../releases';

describe('fetchAllReleases', () => {
  it('returns releases from all 4 providers', async () => {
    const results = await fetchAllReleases();
    const providers = new Set(results.map(r => r.provider));
    expect(providers.has('openai')).toBe(true);
    expect(providers.has('anthropic')).toBe(true);
    expect(providers.has('google')).toBe(true);
    expect(providers.has('meta')).toBe(true);
  });

  it('returns at most 20 items total', async () => {
    const results = await fetchAllReleases();
    expect(results.length).toBeLessThanOrEqual(20);
  });

  it('returns items sorted by date descending', async () => {
    const results = await fetchAllReleases();
    for (let i = 1; i < results.length; i++) {
      expect(new Date(results[i - 1].date).getTime()).toBeGreaterThanOrEqual(
        new Date(results[i].date).getTime(),
      );
    }
  });

  it('each item has required fields', async () => {
    const results = await fetchAllReleases();
    for (const item of results) {
      expect(item.id).toBeTruthy();
      expect(item.provider).toBeTruthy();
      expect(item.title).toBeTruthy();
      expect(item.link).toBeTruthy();
      expect(item.date).toBeTruthy();
    }
  });

  it('returns empty array when all feeds fail', async () => {
    const { server } = await import('../../test/mocks/server');
    const { http, HttpResponse } = await import('msw');
    server.use(
      http.get('https://openai.com/news/rss.xml', () => HttpResponse.error()),
      http.get('https://www.anthropic.com/rss.xml', () => HttpResponse.error()),
      http.get('https://blog.google/products/gemini/rss', () => HttpResponse.error()),
      http.get('https://ai.meta.com/blog/rss', () => HttpResponse.error()),
    );
    const results = await fetchAllReleases();
    expect(results).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm test src/lib/fetchers/__tests__/releases.test.ts
```

Expected: FAIL — `Cannot find module '../releases'`

- [ ] **Step 3: Implement src/lib/fetchers/releases.ts**

```typescript
import { XMLParser } from 'fast-xml-parser';
import type { Provider, ReleaseItem } from '@/types/dashboard';

interface RssItem {
  title: string;
  link: string;
  pubDate?: string;
  guid?: string | { '#text': string };
}

interface RssFeed {
  rss: { channel: { item: RssItem | RssItem[] } };
}

const FEEDS: Array<{ provider: Provider; url: string }> = [
  { provider: 'openai', url: 'https://openai.com/news/rss.xml' },
  { provider: 'anthropic', url: 'https://www.anthropic.com/rss.xml' },
  { provider: 'google', url: 'https://blog.google/products/gemini/rss' },
  { provider: 'meta', url: 'https://ai.meta.com/blog/rss' },
];

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

function extractGuid(guid: RssItem['guid']): string {
  if (!guid) return '';
  if (typeof guid === 'string') return guid;
  return guid['#text'] ?? '';
}

async function fetchFeed(provider: Provider, url: string): Promise<ReleaseItem[]> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  const parsed: RssFeed = parser.parse(xml);
  const rawItems = parsed.rss?.channel?.item;
  if (!rawItems) return [];

  const items = Array.isArray(rawItems) ? rawItems : [rawItems];

  return items.slice(0, 5).map(item => {
    const guid = extractGuid(item.guid) || item.link;
    return {
      id: `${provider}-${Buffer.from(guid).toString('base64').slice(0, 16)}`,
      provider,
      title: item.title,
      link: item.link,
      date: item.pubDate ? new Date(item.pubDate).toISOString() : new Date(0).toISOString(),
    };
  });
}

export async function fetchAllReleases(): Promise<ReleaseItem[]> {
  const results = await Promise.allSettled(
    FEEDS.map(({ provider, url }) => fetchFeed(provider, url)),
  );

  const all = results.flatMap(r => (r.status === 'fulfilled' ? r.value : []));

  return all
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 20);
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npm test src/lib/fetchers/__tests__/releases.test.ts
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/fetchers/releases.ts src/lib/fetchers/__tests__/releases.test.ts
git commit -m "feat: releases fetcher — RSS feeds via fast-xml-parser"
```

---

## Task 5: Benchmarks Fetcher

**Files:**
- Create: `src/lib/fetchers/benchmarks.ts`
- Create: `src/lib/fetchers/__tests__/benchmarks.test.ts`

**Interfaces:**
- Produces: `fetchBenchmarks(): Promise<RawBenchmark[]>`
  Returns data for the 8 target models; falls back to empty array (caller uses cached data) on failure.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/fetchers/__tests__/benchmarks.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { fetchBenchmarks } from '../benchmarks';

describe('fetchBenchmarks', () => {
  it('returns benchmark data normalized to our schema', async () => {
    const results = await fetchBenchmarks();
    expect(results.length).toBeGreaterThan(0);
    for (const model of results) {
      expect(model.id).toBeTruthy();
      expect(model.name).toBeTruthy();
      expect(model.provider).toBeTruthy();
    }
  });

  it('returns only target models', async () => {
    const TARGET_IDS = [
      'gpt-4o', 'gpt-4.1', 'o3',
      'claude-opus-4', 'claude-sonnet-4-6',
      'gemini-2.5-pro', 'gemini-2.5-flash',
      'llama-4-maverick',
    ];
    const results = await fetchBenchmarks();
    for (const model of results) {
      expect(TARGET_IDS).toContain(model.id);
    }
  });

  it('maps provider correctly from API response', async () => {
    const results = await fetchBenchmarks();
    const openai = results.find(m => m.id === 'gpt-4o');
    expect(openai?.provider).toBe('openai');
    const anthropic = results.find(m => m.id === 'claude-sonnet-4-6');
    expect(anthropic?.provider).toBe('anthropic');
  });

  it('returns empty array when API is unavailable', async () => {
    const { server } = await import('../../test/mocks/server');
    server.use(
      http.get('https://artificialanalysis.ai/api/v1/models', () =>
        HttpResponse.error(),
      ),
    );
    const results = await fetchBenchmarks();
    expect(results).toEqual([]);
  });

  it('returns null for missing benchmark fields', async () => {
    const { server } = await import('../../test/mocks/server');
    server.use(
      http.get('https://artificialanalysis.ai/api/v1/models', () =>
        HttpResponse.json({
          models: [{ id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' }],
        }),
      ),
    );
    const results = await fetchBenchmarks();
    const model = results.find(m => m.id === 'gpt-4o');
    expect(model?.mmlu).toBeNull();
    expect(model?.inputPrice).toBeNull();
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm test src/lib/fetchers/__tests__/benchmarks.test.ts
```

Expected: FAIL — `Cannot find module '../benchmarks'`

- [ ] **Step 3: Implement src/lib/fetchers/benchmarks.ts**

```typescript
import type { Provider, RawBenchmark } from '@/types/dashboard';

interface AaModel {
  id: string;
  name: string;
  provider: string;
  quality_index?: number;
  coding_index?: number;
  math_index?: number;
  input_price?: number;
  output_price?: number;
  median_output_tokens_per_second?: number;
}

interface AaResponse {
  models: AaModel[];
}

const TARGET_MODELS: Record<string, Provider> = {
  'gpt-4o': 'openai',
  'gpt-4.1': 'openai',
  'o3': 'openai',
  'claude-opus-4': 'anthropic',
  'claude-sonnet-4-6': 'anthropic',
  'gemini-2.5-pro': 'google',
  'gemini-2.5-flash': 'google',
  'llama-4-maverick': 'meta',
};

function tokensPerSecToLatencyMs(tps: number | undefined): number | null {
  if (!tps || tps <= 0) return null;
  // Approximate: assuming 4 chars/token average, convert to p50 latency proxy
  return Math.round(1000 / tps);
}

function toNullable(value: number | undefined): number | null {
  return value !== undefined && !Number.isNaN(value) ? value : null;
}

export async function fetchBenchmarks(): Promise<RawBenchmark[]> {
  try {
    const res = await fetch('https://artificialanalysis.ai/api/v1/models', {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data: AaResponse = await res.json();

    return data.models
      .filter(m => Object.hasOwn(TARGET_MODELS, m.id))
      .map(m => ({
        id: m.id,
        name: m.name,
        provider: TARGET_MODELS[m.id],
        mmlu: toNullable(m.quality_index),
        humaneval: toNullable(m.coding_index),
        math: toNullable(m.math_index),
        inputPrice: toNullable(m.input_price),
        outputPrice: toNullable(m.output_price),
        latencyP50: tokensPerSecToLatencyMs(m.median_output_tokens_per_second),
      }));
  } catch {
    return [];
  }
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npm test src/lib/fetchers/__tests__/benchmarks.test.ts
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/fetchers/benchmarks.ts src/lib/fetchers/__tests__/benchmarks.test.ts
git commit -m "feat: benchmarks fetcher — Artificial Analysis API, 8 target models"
```

---

## Task 6: Data Agent

**Files:**
- Create: `src/lib/agents/data-agent.ts`
- Create: `src/lib/agents/__tests__/data-agent.test.ts`

**Interfaces:**
- Consumes:
  - `fetchAllStatuses(now)` from `@/lib/fetchers/status`
  - `fetchAllReleases()` from `@/lib/fetchers/releases`
  - `fetchBenchmarks()` from `@/lib/fetchers/benchmarks`
  - `getCachedSnapshot()`, `getStatusHistory()`, `appendStatusHistory()` from `@/lib/cache`
- Produces: `runDataAgent(): Promise<DashboardSnapshot>`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/agents/__tests__/data-agent.test.ts`:

```typescript
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { DashboardSnapshot, RawProviderStatus, RawBenchmark, ReleaseItem } from '@/types/dashboard';

vi.mock('@/lib/fetchers/status', () => ({
  fetchAllStatuses: vi.fn(),
}));
vi.mock('@/lib/fetchers/releases', () => ({
  fetchAllReleases: vi.fn(),
}));
vi.mock('@/lib/fetchers/benchmarks', () => ({
  fetchBenchmarks: vi.fn(),
}));
vi.mock('@/lib/cache', () => ({
  getCachedSnapshot: vi.fn(),
  setCachedSnapshot: vi.fn(),
  getStatusHistory: vi.fn(),
  appendStatusHistory: vi.fn(),
}));

import { runDataAgent } from '../data-agent';
import { fetchAllStatuses } from '@/lib/fetchers/status';
import { fetchAllReleases } from '@/lib/fetchers/releases';
import { fetchBenchmarks } from '@/lib/fetchers/benchmarks';
import { getCachedSnapshot, getStatusHistory, appendStatusHistory } from '@/lib/cache';

const mockStatuses: RawProviderStatus[] = [
  { provider: 'openai', status: 'operational', lastChecked: '2026-06-25T00:00:00.000Z' },
  { provider: 'anthropic', status: 'operational', lastChecked: '2026-06-25T00:00:00.000Z' },
  { provider: 'google', status: 'operational', lastChecked: '2026-06-25T00:00:00.000Z' },
  { provider: 'meta', status: 'operational', lastChecked: '2026-06-25T00:00:00.000Z' },
];

const mockBenchmarks: RawBenchmark[] = [
  {
    id: 'gpt-4o', name: 'GPT-4o', provider: 'openai',
    mmlu: 88.7, humaneval: 90.2, math: 76.6,
    inputPrice: 2.5, outputPrice: 10.0, latencyP50: 450,
  },
];

const mockReleases: ReleaseItem[] = [
  {
    id: 'openai-abc123', provider: 'openai',
    title: 'GPT-4o update', link: 'https://openai.com/blog', date: '2026-06-25T00:00:00.000Z',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchAllStatuses).mockResolvedValue(mockStatuses);
  vi.mocked(fetchAllReleases).mockResolvedValue(mockReleases);
  vi.mocked(fetchBenchmarks).mockResolvedValue(mockBenchmarks);
  vi.mocked(getCachedSnapshot).mockResolvedValue(null);
  vi.mocked(getStatusHistory).mockResolvedValue([]);
  vi.mocked(appendStatusHistory).mockImplementation(async (provider, entry) => [entry]);
});

describe('runDataAgent', () => {
  it('returns a valid DashboardSnapshot with all fields', async () => {
    const snapshot = await runDataAgent();
    expect(snapshot.fetchedAt).toBeTruthy();
    expect(snapshot.statuses).toHaveLength(4);
    expect(snapshot.benchmarks).toHaveLength(1);
    expect(snapshot.releases).toHaveLength(1);
    expect(Array.isArray(snapshot.activity)).toBe(true);
  });

  it('computes uptime from history', async () => {
    vi.mocked(appendStatusHistory).mockResolvedValue([
      { timestamp: '2026-06-25T00:00:00.000Z', status: 'operational' },
      { timestamp: '2026-06-24T00:00:00.000Z', status: 'operational' },
    ]);
    const snapshot = await runDataAgent();
    expect(snapshot.statuses[0].uptime30d).toBe(100);
  });

  it('detects price change and emits activity event', async () => {
    const prev: DashboardSnapshot = {
      fetchedAt: '2026-06-24T23:00:00.000Z',
      statuses: [],
      benchmarks: [{ ...mockBenchmarks[0], inputPrice: 5.0 }],
      releases: [],
      activity: [],
    };
    vi.mocked(getCachedSnapshot).mockResolvedValue(prev);

    const snapshot = await runDataAgent();
    const priceEvent = snapshot.activity.find(e => e.type === 'price_change');
    expect(priceEvent).toBeDefined();
    expect(priceEvent?.provider).toBe('openai');
  });

  it('detects new incident and emits activity event', async () => {
    vi.mocked(fetchAllStatuses).mockResolvedValue([
      { provider: 'openai', status: 'degraded', lastChecked: '2026-06-25T00:00:00.000Z' },
      { provider: 'anthropic', status: 'operational', lastChecked: '2026-06-25T00:00:00.000Z' },
      { provider: 'google', status: 'operational', lastChecked: '2026-06-25T00:00:00.000Z' },
      { provider: 'meta', status: 'operational', lastChecked: '2026-06-25T00:00:00.000Z' },
    ]);
    const prev: DashboardSnapshot = {
      fetchedAt: '2026-06-24T23:00:00.000Z',
      statuses: [
        { provider: 'openai', status: 'operational', uptime30d: 100, lastChecked: '2026-06-24T23:00:00.000Z', history: [] },
      ],
      benchmarks: [],
      releases: [],
      activity: [],
    };
    vi.mocked(getCachedSnapshot).mockResolvedValue(prev);

    const snapshot = await runDataAgent();
    const incident = snapshot.activity.find(e => e.type === 'incident');
    expect(incident).toBeDefined();
    expect(incident?.provider).toBe('openai');
  });

  it('carries forward existing activity (max 50 events)', async () => {
    const existingActivity = Array.from({ length: 50 }, (_, i) => ({
      id: `event-${i}`,
      provider: 'openai' as const,
      type: 'release' as const,
      title: `Release ${i}`,
      description: '',
      date: '2026-06-24T00:00:00.000Z',
    }));
    vi.mocked(getCachedSnapshot).mockResolvedValue({
      fetchedAt: '2026-06-24T23:00:00.000Z',
      statuses: [],
      benchmarks: [],
      releases: [],
      activity: existingActivity,
    });

    const snapshot = await runDataAgent();
    expect(snapshot.activity.length).toBeLessThanOrEqual(50);
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm test src/lib/agents/__tests__/data-agent.test.ts
```

Expected: FAIL — `Cannot find module '../data-agent'`

- [ ] **Step 3: Implement src/lib/agents/data-agent.ts**

```typescript
import { fetchAllStatuses } from '@/lib/fetchers/status';
import { fetchAllReleases } from '@/lib/fetchers/releases';
import { fetchBenchmarks } from '@/lib/fetchers/benchmarks';
import {
  getCachedSnapshot,
  getStatusHistory,
  appendStatusHistory,
} from '@/lib/cache';
import type {
  ActivityEvent,
  BenchmarkData,
  DashboardSnapshot,
  Provider,
  ProviderStatus,
  ProviderStatusData,
  RawBenchmark,
  RawProviderStatus,
  ReleaseItem,
} from '@/types/dashboard';

const MAX_ACTIVITY = 50;
const PROVIDERS: Provider[] = ['openai', 'anthropic', 'google', 'meta'];

function computeUptime(history: Array<{ status: ProviderStatus }>): number {
  if (history.length === 0) return 100;
  const operational = history.filter(e => e.status === 'operational').length;
  return Math.round((operational / history.length) * 1000) / 10;
}

async function buildStatusData(
  raw: RawProviderStatus,
): Promise<ProviderStatusData> {
  const history = await appendStatusHistory(raw.provider, {
    timestamp: raw.lastChecked,
    status: raw.status,
  });
  return {
    provider: raw.provider,
    status: raw.status,
    uptime30d: computeUptime(history),
    lastChecked: raw.lastChecked,
    history,
  };
}

function detectIncidents(
  prev: DashboardSnapshot | null,
  next: ProviderStatusData[],
  now: string,
): ActivityEvent[] {
  if (!prev) return [];
  const events: ActivityEvent[] = [];

  for (const current of next) {
    const previous = prev.statuses.find(s => s.provider === current.provider);
    const wasOk = !previous || previous.status === 'operational';
    const isDown = current.status === 'degraded' || current.status === 'outage';
    const wasDown = previous?.status === 'degraded' || previous?.status === 'outage';
    const isNowOk = current.status === 'operational';

    if (wasOk && isDown) {
      events.push({
        id: `${current.provider}-incident-${now}`,
        provider: current.provider,
        type: 'incident',
        title: `${current.provider} API ${current.status}`,
        description: `${current.provider} is reporting ${current.status} status.`,
        date: now,
      });
    } else if (wasDown && isNowOk) {
      events.push({
        id: `${current.provider}-resolved-${now}`,
        provider: current.provider,
        type: 'incident_resolved',
        title: `${current.provider} incident resolved`,
        description: `${current.provider} has returned to operational status.`,
        date: now,
      });
    }
  }
  return events;
}

function detectBenchmarkChanges(
  prev: DashboardSnapshot | null,
  next: RawBenchmark[],
  now: string,
): ActivityEvent[] {
  if (!prev || prev.benchmarks.length === 0) return [];
  const events: ActivityEvent[] = [];

  for (const newModel of next) {
    const oldModel = prev.benchmarks.find(m => m.id === newModel.id);
    if (!oldModel) continue;

    const mmlуChanged =
      oldModel.mmlu !== null && newModel.mmlu !== null &&
      Math.abs(oldModel.mmlu - newModel.mmlu) > 1.0;

    if (mmlуChanged) {
      events.push({
        id: `${newModel.provider}-benchmark-${now}`,
        provider: newModel.provider,
        type: 'benchmark_change',
        title: `${newModel.name} benchmark scores updated`,
        description: `MMLU: ${oldModel.mmlu} → ${newModel.mmlu}`,
        date: now,
      });
    }
  }
  return events;
}

function detectPriceChanges(
  prev: DashboardSnapshot | null,
  next: RawBenchmark[],
  now: string,
): ActivityEvent[] {
  if (!prev || prev.benchmarks.length === 0) return [];
  const events: ActivityEvent[] = [];

  for (const newModel of next) {
    const oldModel = prev.benchmarks.find(m => m.id === newModel.id);
    if (!oldModel) continue;

    const inputChanged =
      oldModel.inputPrice !== null &&
      newModel.inputPrice !== null &&
      Math.abs(oldModel.inputPrice - newModel.inputPrice) > 0.001;
    const outputChanged =
      oldModel.outputPrice !== null &&
      newModel.outputPrice !== null &&
      Math.abs(oldModel.outputPrice - newModel.outputPrice) > 0.001;

    if (inputChanged || outputChanged) {
      events.push({
        id: `${newModel.provider}-price-${now}`,
        provider: newModel.provider,
        type: 'price_change',
        title: `${newModel.name} pricing updated`,
        description: `Input: $${oldModel.inputPrice} → $${newModel.inputPrice}/1M tokens. Output: $${oldModel.outputPrice} → $${newModel.outputPrice}/1M tokens.`,
        date: now,
      });
    }
  }
  return events;
}

function detectNewReleases(
  prev: DashboardSnapshot | null,
  next: ReleaseItem[],
): ActivityEvent[] {
  if (!prev) return next.map(r => releaseToEvent(r));
  const knownIds = new Set(prev.releases.map(r => r.id));
  return next.filter(r => !knownIds.has(r.id)).map(releaseToEvent);
}

function releaseToEvent(release: ReleaseItem): ActivityEvent {
  return {
    id: `release-${release.id}`,
    provider: release.provider,
    type: 'release',
    title: release.title,
    description: `New release from ${release.provider}.`,
    date: release.date,
    link: release.link,
  };
}

export async function runDataAgent(): Promise<DashboardSnapshot> {
  const now = new Date().toISOString();

  const [rawStatuses, releases, rawBenchmarks, prevSnapshot] = await Promise.all([
    fetchAllStatuses(now),
    fetchAllReleases(),
    fetchBenchmarks(),
    getCachedSnapshot(),
  ]);

  // Ensure all 4 providers are represented (fallback to unknown)
  const completeStatuses: RawProviderStatus[] = PROVIDERS.map(provider => {
    const found = rawStatuses.find(s => s.provider === provider);
    return found ?? { provider, status: 'unknown', lastChecked: now };
  });

  const statuses = await Promise.all(completeStatuses.map(buildStatusData));

  const benchmarks: BenchmarkData[] = rawBenchmarks.map(b => ({
    id: b.id,
    name: b.name,
    provider: b.provider,
    mmlu: b.mmlu,
    humaneval: b.humaneval,
    math: b.math,
    inputPrice: b.inputPrice,
    outputPrice: b.outputPrice,
    latencyP50: b.latencyP50,
  }));

  // If AA API was unavailable, fall back to cached benchmarks
  const finalBenchmarks =
    benchmarks.length > 0 ? benchmarks : (prevSnapshot?.benchmarks ?? []);

  const newEvents: ActivityEvent[] = [
    ...detectIncidents(prevSnapshot, statuses, now),
    ...detectPriceChanges(prevSnapshot, rawBenchmarks, now),
    ...detectBenchmarkChanges(prevSnapshot, rawBenchmarks, now),
    ...detectNewReleases(prevSnapshot, releases),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const existingActivity = prevSnapshot?.activity ?? [];
  const mergedActivity = [...newEvents, ...existingActivity].slice(0, MAX_ACTIVITY);

  return {
    fetchedAt: now,
    statuses,
    benchmarks: finalBenchmarks,
    releases,
    activity: mergedActivity,
  };
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npm test src/lib/agents/__tests__/data-agent.test.ts
```

Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/agents/data-agent.ts src/lib/agents/__tests__/data-agent.test.ts
git commit -m "feat: data agent — orchestration, change detection, activity events"
```

---

## Task 7: API Routes

**Files:**
- Create: `src/app/api/cron/fetch-models/route.ts`
- Create: `src/app/api/cron/fetch-models/__tests__/route.test.ts`
- Create: `src/app/api/models/route.ts`
- Create: `src/app/api/models/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `runDataAgent()` from `@/lib/agents/data-agent`, `getCachedSnapshot()`, `setCachedSnapshot()` from `@/lib/cache`
- Produces: `GET /api/models` → `DashboardSnapshot | 503`, `POST /api/cron/fetch-models` → `{ ok: true, fetchedAt }`

- [ ] **Step 1: Write failing tests for cron route**

Create `src/app/api/cron/fetch-models/__tests__/route.test.ts`:

```typescript
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { DashboardSnapshot } from '@/types/dashboard';

vi.mock('@/lib/agents/data-agent', () => ({
  runDataAgent: vi.fn(),
}));
vi.mock('@/lib/cache', () => ({
  setCachedSnapshot: vi.fn(),
}));

import { GET } from '../route';
import { runDataAgent } from '@/lib/agents/data-agent';
import { setCachedSnapshot } from '@/lib/cache';

const MOCK_SNAPSHOT: DashboardSnapshot = {
  fetchedAt: '2026-06-25T00:00:00.000Z',
  statuses: [], benchmarks: [], releases: [], activity: [],
};

function makeRequest(secret: string | null) {
  return new Request('http://localhost/api/cron/fetch-models', {
    method: 'GET',
    headers: secret ? { Authorization: `Bearer ${secret}` } : {},
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = 'test-secret';
  vi.mocked(runDataAgent).mockResolvedValue(MOCK_SNAPSHOT);
  vi.mocked(setCachedSnapshot).mockResolvedValue(undefined);
});

describe('GET /api/cron/fetch-models', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const res = await GET(makeRequest(null));
    expect(res.status).toBe(401);
  });

  it('returns 401 when secret is wrong', async () => {
    const res = await GET(makeRequest('wrong-secret'));
    expect(res.status).toBe(401);
  });

  it('runs data agent and writes to cache on valid secret', async () => {
    const res = await GET(makeRequest('test-secret'));
    expect(res.status).toBe(200);
    expect(runDataAgent).toHaveBeenCalledOnce();
    expect(setCachedSnapshot).toHaveBeenCalledWith(MOCK_SNAPSHOT);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.fetchedAt).toBe(MOCK_SNAPSHOT.fetchedAt);
  });

  it('returns 500 if data agent throws', async () => {
    vi.mocked(runDataAgent).mockRejectedValue(new Error('fetch failed'));
    const res = await GET(makeRequest('test-secret'));
    expect(res.status).toBe(500);
  });
});
```

- [ ] **Step 2: Write failing tests for models route**

Create `src/app/api/models/__tests__/route.test.ts`:

```typescript
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { DashboardSnapshot } from '@/types/dashboard';

vi.mock('@/lib/cache', () => ({
  getCachedSnapshot: vi.fn(),
}));

import { GET } from '../route';
import { getCachedSnapshot } from '@/lib/cache';

const MOCK_SNAPSHOT: DashboardSnapshot = {
  fetchedAt: '2026-06-25T00:00:00.000Z',
  statuses: [], benchmarks: [], releases: [], activity: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/models', () => {
  it('returns 503 when cache is empty', async () => {
    vi.mocked(getCachedSnapshot).mockResolvedValue(null);
    const req = new Request('http://localhost/api/models');
    const res = await GET(req);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it('returns 200 with snapshot when cache is populated', async () => {
    vi.mocked(getCachedSnapshot).mockResolvedValue(MOCK_SNAPSHOT);
    const req = new Request('http://localhost/api/models');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.fetchedAt).toBe(MOCK_SNAPSHOT.fetchedAt);
  });

  it('returns 500 when KV throws', async () => {
    vi.mocked(getCachedSnapshot).mockRejectedValue(new Error('KV error'));
    const req = new Request('http://localhost/api/models');
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});
```

- [ ] **Step 3: Run tests — verify they fail**

```bash
npm test src/app/api/cron/fetch-models/__tests__/route.test.ts src/app/api/models/__tests__/route.test.ts
```

Expected: FAIL — modules not found

- [ ] **Step 4: Implement src/app/api/cron/fetch-models/route.ts**

```typescript
import { NextResponse } from 'next/server';
import { runDataAgent } from '@/lib/agents/data-agent';
import { setCachedSnapshot } from '@/lib/cache';

export async function GET(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const snapshot = await runDataAgent();
    await setCachedSnapshot(snapshot);
    return NextResponse.json({ ok: true, fetchedAt: snapshot.fetchedAt });
  } catch (err) {
    console.error('[cron] fetch-models failed:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 5: Implement src/app/api/models/route.ts**

```typescript
import { NextResponse } from 'next/server';
import { getCachedSnapshot } from '@/lib/cache';

export async function GET(_request: Request): Promise<NextResponse> {
  try {
    const snapshot = await getCachedSnapshot();
    if (!snapshot) {
      return NextResponse.json(
        { error: 'No data yet — cron has not run. Try again shortly.' },
        { status: 503 },
      );
    }
    return NextResponse.json(snapshot);
  } catch (err) {
    console.error('[api/models] KV read failed:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 6: Run tests — verify they pass**

```bash
npm test src/app/api/cron/fetch-models/__tests__/route.test.ts src/app/api/models/__tests__/route.test.ts
```

Expected: PASS (7 tests total)

- [ ] **Step 7: Commit**

```bash
git add src/app/api/cron/fetch-models/route.ts src/app/api/cron/fetch-models/__tests__/route.test.ts src/app/api/models/route.ts src/app/api/models/__tests__/route.test.ts
git commit -m "feat: cron route + models API — hourly trigger and KV read-through"
```

---

## Task 8: UI Components

**Files:**
- Create: `src/components/dashboard/UpdatedAt.tsx`
- Create: `src/components/dashboard/StatusGrid.tsx`
- Create: `src/components/dashboard/BenchmarkPanel.tsx`
- Create: `src/components/dashboard/PricingTable.tsx`
- Create: `src/components/dashboard/ActivityFeed.tsx`
- Create: `src/components/dashboard/Dashboard.tsx`
- Create: `src/components/dashboard/__tests__/StatusGrid.test.tsx`
- Create: `src/components/dashboard/__tests__/PricingTable.test.tsx`
- Create: `src/components/dashboard/__tests__/ActivityFeed.test.tsx`

**Can run in parallel with Tasks 2–5 — only requires types from Task 1.**

**Interfaces:**
- Consumes: `DashboardSnapshot`, all sub-types from `@/types/dashboard`
- Produces: `<Dashboard snapshot={DashboardSnapshot} />` — the top-level render tree

- [ ] **Step 1: Write failing tests**

Create `src/components/dashboard/__tests__/StatusGrid.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusGrid } from '../StatusGrid';
import type { ProviderStatusData } from '@/types/dashboard';

const MOCK_STATUSES: ProviderStatusData[] = [
  { provider: 'openai', status: 'operational', uptime30d: 99.9, lastChecked: '2026-06-25T00:00:00.000Z', history: [] },
  { provider: 'anthropic', status: 'degraded', uptime30d: 95.0, lastChecked: '2026-06-25T00:00:00.000Z', history: [] },
  { provider: 'google', status: 'outage', uptime30d: 88.0, lastChecked: '2026-06-25T00:00:00.000Z', history: [] },
  { provider: 'meta', status: 'unknown', uptime30d: 100, lastChecked: '2026-06-25T00:00:00.000Z', history: [] },
];

describe('StatusGrid', () => {
  it('renders a card for each provider', () => {
    render(<StatusGrid statuses={MOCK_STATUSES} />);
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
    expect(screen.getByText('Anthropic')).toBeInTheDocument();
    expect(screen.getByText('Google')).toBeInTheDocument();
    expect(screen.getByText('Meta')).toBeInTheDocument();
  });

  it('displays uptime percentages', () => {
    render(<StatusGrid statuses={MOCK_STATUSES} />);
    expect(screen.getByText('99.9%')).toBeInTheDocument();
  });

  it('shows operational status label', () => {
    render(<StatusGrid statuses={MOCK_STATUSES} />);
    expect(screen.getByText('Operational')).toBeInTheDocument();
  });

  it('shows degraded status label', () => {
    render(<StatusGrid statuses={MOCK_STATUSES} />);
    expect(screen.getByText('Degraded')).toBeInTheDocument();
  });

  it('shows outage status label', () => {
    render(<StatusGrid statuses={MOCK_STATUSES} />);
    expect(screen.getByText('Outage')).toBeInTheDocument();
  });
});
```

Create `src/components/dashboard/__tests__/PricingTable.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PricingTable } from '../PricingTable';
import type { BenchmarkData } from '@/types/dashboard';

const MOCK_BENCHMARKS: BenchmarkData[] = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', mmlu: 88.7, humaneval: 90.2, math: 76.6, inputPrice: 2.5, outputPrice: 10.0, latencyP50: 450 },
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', provider: 'anthropic', mmlu: 91.2, humaneval: null, math: null, inputPrice: 3.0, outputPrice: 15.0, latencyP50: null },
];

describe('PricingTable', () => {
  it('renders a row for each model', () => {
    render(<PricingTable benchmarks={MOCK_BENCHMARKS} />);
    expect(screen.getByText('GPT-4o')).toBeInTheDocument();
    expect(screen.getByText('Claude Sonnet 4.6')).toBeInTheDocument();
  });

  it('formats prices with dollar sign', () => {
    render(<PricingTable benchmarks={MOCK_BENCHMARKS} />);
    expect(screen.getByText('$2.50')).toBeInTheDocument();
    expect(screen.getByText('$10.00')).toBeInTheDocument();
  });

  it('shows dash for null prices', () => {
    const noPrice = [{ ...MOCK_BENCHMARKS[0], inputPrice: null, outputPrice: null }];
    render(<PricingTable benchmarks={noPrice} />);
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });
});
```

Create `src/components/dashboard/__tests__/ActivityFeed.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ActivityFeed } from '../ActivityFeed';
import type { ActivityEvent } from '@/types/dashboard';

const MOCK_EVENTS: ActivityEvent[] = [
  { id: 'e1', provider: 'openai', type: 'release', title: 'GPT-5 launched', description: 'New release.', date: '2026-06-25T00:00:00.000Z', link: 'https://openai.com' },
  { id: 'e2', provider: 'anthropic', type: 'incident', title: 'Anthropic API degraded', description: 'Incident in progress.', date: '2026-06-24T12:00:00.000Z' },
  { id: 'e3', provider: 'google', type: 'price_change', title: 'Gemini pricing updated', description: 'Price changed.', date: '2026-06-24T06:00:00.000Z' },
];

describe('ActivityFeed', () => {
  it('renders all events', () => {
    render(<ActivityFeed events={MOCK_EVENTS} />);
    expect(screen.getByText('GPT-5 launched')).toBeInTheDocument();
    expect(screen.getByText('Anthropic API degraded')).toBeInTheDocument();
    expect(screen.getByText('Gemini pricing updated')).toBeInTheDocument();
  });

  it('renders event type badges', () => {
    render(<ActivityFeed events={MOCK_EVENTS} />);
    expect(screen.getByText('Release')).toBeInTheDocument();
    expect(screen.getByText('Incident')).toBeInTheDocument();
    expect(screen.getByText('Price')).toBeInTheDocument();
  });

  it('renders empty state when no events', () => {
    render(<ActivityFeed events={[]} />);
    expect(screen.getByText(/no recent activity/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test src/components/dashboard/__tests__/
```

Expected: FAIL — components not found

- [ ] **Step 3: Implement src/components/dashboard/UpdatedAt.tsx**

```typescript
'use client';

import { useEffect, useState } from 'react';

interface UpdatedAtProps {
  fetchedAt: string;
}

function getMinutesAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
}

export function UpdatedAt({ fetchedAt }: UpdatedAtProps) {
  const [minutes, setMinutes] = useState(() => getMinutesAgo(fetchedAt));

  useEffect(() => {
    const id = setInterval(() => setMinutes(getMinutesAgo(fetchedAt)), 60_000);
    return () => clearInterval(id);
  }, [fetchedAt]);

  if (minutes === 0) return <span className="text-sm text-muted-foreground">Updated just now</span>;
  return (
    <span className="text-sm text-muted-foreground">
      Updated {minutes} {minutes === 1 ? 'minute' : 'minutes'} ago
    </span>
  );
}
```

- [ ] **Step 4: Implement src/components/dashboard/StatusGrid.tsx**

```typescript
import type { ProviderStatusData, ProviderStatus } from '@/types/dashboard';

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  meta: 'Meta',
};

const STATUS_LABEL: Record<ProviderStatus, string> = {
  operational: 'Operational',
  degraded: 'Degraded',
  outage: 'Outage',
  unknown: 'Unknown',
};

const STATUS_COLOR: Record<ProviderStatus, string> = {
  operational: 'bg-green-500',
  degraded: 'bg-yellow-500',
  outage: 'bg-red-500',
  unknown: 'bg-gray-400',
};

const STATUS_TEXT: Record<ProviderStatus, string> = {
  operational: 'text-green-700',
  degraded: 'text-yellow-700',
  outage: 'text-red-700',
  unknown: 'text-gray-600',
};

interface StatusGridProps {
  statuses: ProviderStatusData[];
}

export function StatusGrid({ statuses }: StatusGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {statuses.map(s => (
        <div key={s.provider} className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${STATUS_COLOR[s.status]}`} />
            <span className="font-semibold">{PROVIDER_LABELS[s.provider] ?? s.provider}</span>
          </div>
          <p className={`text-sm font-medium ${STATUS_TEXT[s.status]}`}>
            {STATUS_LABEL[s.status]}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">30d uptime: {s.uptime30d}%</p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Implement src/components/dashboard/BenchmarkPanel.tsx**

```typescript
'use client';

import { useState } from 'react';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { BenchmarkData } from '@/types/dashboard';

type Tab = 'mmlu' | 'humaneval' | 'math' | 'latency';

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'mmlu', label: 'MMLU' },
  { key: 'humaneval', label: 'HumanEval' },
  { key: 'math', label: 'MATH' },
  { key: 'latency', label: 'Latency (ms)' },
];

interface BenchmarkPanelProps {
  benchmarks: BenchmarkData[];
}

export function BenchmarkPanel({ benchmarks }: BenchmarkPanelProps) {
  const [active, setActive] = useState<Tab>('mmlu');

  const data = benchmarks
    .map(m => ({ name: m.name, value: m[active] }))
    .filter(d => d.value !== null)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-base font-semibold">Benchmark Performance</h2>
      <div className="mb-4 flex gap-2">
        {TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
              active === tab.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
          <XAxis type="number" tick={{ fontSize: 12 }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
          <Tooltip formatter={(v: number) => v.toFixed(1)} />
          <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 6: Implement src/components/dashboard/PricingTable.tsx**

```typescript
import type { BenchmarkData } from '@/types/dashboard';

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  meta: 'Meta',
};

const PROVIDER_COLORS: Record<string, string> = {
  openai: 'bg-emerald-100 text-emerald-800',
  anthropic: 'bg-orange-100 text-orange-800',
  google: 'bg-blue-100 text-blue-800',
  meta: 'bg-purple-100 text-purple-800',
};

function formatPrice(price: number | null): string {
  if (price === null) return '—';
  return `$${price.toFixed(2)}`;
}

interface PricingTableProps {
  benchmarks: BenchmarkData[];
}

export function PricingTable({ benchmarks }: PricingTableProps) {
  const sorted = [...benchmarks].sort((a, b) =>
    a.provider.localeCompare(b.provider),
  );

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <div className="border-b px-4 py-3">
        <h2 className="text-base font-semibold">Pricing per 1M Tokens</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
              <th className="px-4 py-2 font-medium">Provider</th>
              <th className="px-4 py-2 font-medium">Model</th>
              <th className="px-4 py-2 text-right font-medium">Input</th>
              <th className="px-4 py-2 text-right font-medium">Output</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(m => (
              <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-2">
                  <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${PROVIDER_COLORS[m.provider] ?? 'bg-gray-100 text-gray-800'}`}>
                    {PROVIDER_LABELS[m.provider] ?? m.provider}
                  </span>
                </td>
                <td className="px-4 py-2 font-medium">{m.name}</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatPrice(m.inputPrice)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatPrice(m.outputPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Implement src/components/dashboard/ActivityFeed.tsx**

```typescript
import type { ActivityEvent, ActivityEventType } from '@/types/dashboard';

const TYPE_LABEL: Record<ActivityEventType, string> = {
  release: 'Release',
  incident: 'Incident',
  incident_resolved: 'Resolved',
  price_change: 'Price',
  benchmark_change: 'Benchmark',
};

const TYPE_COLOR: Record<ActivityEventType, string> = {
  release: 'bg-blue-100 text-blue-800',
  incident: 'bg-red-100 text-red-800',
  incident_resolved: 'bg-green-100 text-green-800',
  price_change: 'bg-yellow-100 text-yellow-800',
  benchmark_change: 'bg-purple-100 text-purple-800',
};

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  meta: 'Meta',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface ActivityFeedProps {
  events: ActivityEvent[];
}

export function ActivityFeed({ events }: ActivityFeedProps) {
  if (events.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-3 text-base font-semibold">Recent Activity</h2>
        <p className="text-sm text-muted-foreground">No recent activity to display.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <div className="border-b px-4 py-3">
        <h2 className="text-base font-semibold">Recent Activity</h2>
      </div>
      <ul className="divide-y">
        {events.map(event => (
          <li key={event.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${TYPE_COLOR[event.type]}`}>
                    {TYPE_LABEL[event.type]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {PROVIDER_LABELS[event.provider] ?? event.provider}
                  </span>
                </div>
                {event.link ? (
                  <a
                    href={event.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium hover:underline"
                  >
                    {event.title}
                  </a>
                ) : (
                  <p className="text-sm font-medium">{event.title}</p>
                )}
                <p className="text-xs text-muted-foreground">{event.description}</p>
              </div>
              <time className="shrink-0 text-xs text-muted-foreground">
                {formatDate(event.date)}
              </time>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 8: Implement src/components/dashboard/Dashboard.tsx**

```typescript
import type { DashboardSnapshot } from '@/types/dashboard';
import { ActivityFeed } from './ActivityFeed';
import { BenchmarkPanel } from './BenchmarkPanel';
import { PricingTable } from './PricingTable';
import { StatusGrid } from './StatusGrid';
import { UpdatedAt } from './UpdatedAt';

interface DashboardProps {
  snapshot: DashboardSnapshot;
}

export function Dashboard({ snapshot }: DashboardProps) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Intelligence Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live monitoring across OpenAI, Anthropic, Google, and Meta
          </p>
        </div>
        <UpdatedAt fetchedAt={snapshot.fetchedAt} />
      </div>

      <div className="flex flex-col gap-6">
        <StatusGrid statuses={snapshot.statuses} />

        <div className="grid gap-6 lg:grid-cols-2">
          <BenchmarkPanel benchmarks={snapshot.benchmarks} />
          <PricingTable benchmarks={snapshot.benchmarks} />
        </div>

        <ActivityFeed events={snapshot.activity} />
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Run tests — verify they pass**

```bash
npm test src/components/dashboard/__tests__/
```

Expected: PASS (all tests across 3 files)

- [ ] **Step 10: Commit**

```bash
git add src/components/dashboard/
git commit -m "feat: dashboard UI — StatusGrid, BenchmarkPanel, PricingTable, ActivityFeed, UpdatedAt"
```

---

## Task 9: Dashboard Page + Wiring

**Files:**
- Create: `src/app/dashboard/page.tsx`
- Modify: `src/app/sitemap.ts`
- Create: `src/test/e2e/dashboard.spec.ts`

**Interfaces:**
- Consumes: `Dashboard` from `@/components/dashboard/Dashboard`, `/api/models` endpoint

- [ ] **Step 1: Write failing E2E test**

Create `src/test/e2e/dashboard.spec.ts`:

```typescript
import { expect, test } from '@playwright/test';

test.describe('Dashboard page', () => {
  test('renders the dashboard heading', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /AI Intelligence Dashboard/i })).toBeVisible();
  });

  test('shows all 4 provider status cards', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText('OpenAI')).toBeVisible();
    await expect(page.getByText('Anthropic')).toBeVisible();
    await expect(page.getByText('Google')).toBeVisible();
    await expect(page.getByText('Meta')).toBeVisible();
  });

  test('shows benchmark panel with tabs', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText('MMLU')).toBeVisible();
    await expect(page.getByText('HumanEval')).toBeVisible();
    await expect(page.getByText('MATH')).toBeVisible();
  });

  test('shows pricing table', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText(/per 1M Tokens/i)).toBeVisible();
  });

  test('root / redirects to /dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
```

- [ ] **Step 2: Implement src/app/dashboard/page.tsx**

```typescript
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Dashboard } from '@/components/dashboard/Dashboard';
import type { DashboardSnapshot } from '@/types/dashboard';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Live AI model status, benchmarks, pricing, and releases.',
};

async function getSnapshot(): Promise<DashboardSnapshot | null> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  try {
    const res = await fetch(`${baseUrl}/api/models`, { next: { revalidate: 3600 } });
    if (res.status === 503) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const snapshot = await getSnapshot();

  if (!snapshot) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Dashboard initializing</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Data is being fetched for the first time. Check back in a few minutes.
          </p>
        </div>
      </div>
    );
  }

  return <Dashboard snapshot={snapshot} />;
}
```

- [ ] **Step 3: Update src/app/sitemap.ts**

Read the current file first, then replace its content:

```typescript
import { siteConfig } from '@/lib/core/config/site';

export default function sitemap() {
  return siteConfig.pages.map(page => ({
    url: `${siteConfig.url}${page.path}`,
    lastModified: new Date().toISOString(),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
```

- [ ] **Step 4: Run lint**

```bash
npm run lint
```

Fix any Biome errors before continuing.

- [ ] **Step 5: Run all unit tests**

```bash
npm test
```

Expected: all tests pass, coverage ≥ 80%

- [ ] **Step 6: Run E2E tests (requires running dev server)**

In one terminal:
```bash
npm run dev
```

In another:
```bash
npm run test:e2e -- --project=chromium src/test/e2e/dashboard.spec.ts
```

Note: The dashboard will show the "initializing" state unless KV is configured. The heading and redirect tests will still pass. Provider cards, benchmark, and pricing tests require a populated KV — these can be verified after the first manual cron trigger in Step 7.

- [ ] **Step 7: Commit**

```bash
git add src/app/dashboard/page.tsx src/app/sitemap.ts src/test/e2e/dashboard.spec.ts
git commit -m "feat: dashboard page — async server component, ISR 3600s, empty state"
```

- [ ] **Step 8: Push to remote**

```bash
git push origin main
```

---

## Post-Deploy Checklist

After Vercel deploys:

- [ ] Add all env vars in Vercel → Settings → Environment Variables:
  `KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_REST_API_READ_ONLY_TOKEN`, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`

- [ ] Trigger the cron manually to pre-populate KV:
  ```bash
  curl -H "Authorization: Bearer <CRON_SECRET>" https://your-app.vercel.app/api/cron/fetch-models
  ```

- [ ] Verify live data returns from the API:
  ```bash
  curl https://your-app.vercel.app/api/models | jq '.fetchedAt'
  ```

- [ ] Open the dashboard and confirm all four panels render with real data

- [ ] Check Vercel dashboard → Cron Jobs tab — confirm schedule is registered
