# AI Command Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the AI Digest Dashboard into a decision-first "AI Command Center" with a live recommendation banner, dark theme, sparkline status cards, lean model table, and a curated "What Changed" feed.

**Architecture:** Pure frontend redesign — all data fetchers, the cache layer, the cron route, and `DashboardSnapshot` are untouched. A new pure function (`getRecommendation`) scores benchmark data against live provider status to produce a single recommendation. All components are replaced with dark-themed equivalents; three old components are deleted.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript (strict), Tailwind CSS, Vitest

## Global Constraints

- Background: `slate-950`, card background: `slate-900`
- Accent: `indigo-500` (banner border-left, recommended row ring)
- Operational status color: `emerald-400`, Degraded: `amber-400`, Outage: `red-500`, Unknown: `slate-500`
- Numbers right-aligned with `tabular-nums`
- No new external dependencies
- No changes to: fetchers, cache, data-agent, cron route, `DashboardSnapshot` type, Upstash setup
- Tests use Vitest (`src/lib/__tests__/`)

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| **Create** | `src/lib/recommendation.ts` | Pure scoring function → `Recommendation` |
| **Create** | `src/lib/__tests__/recommendation.test.ts` | Unit tests for recommendation logic |
| **Create** | `src/components/dashboard/StatusCard.tsx` | Single provider card with sparkline |
| **Create** | `src/components/dashboard/RecommendationBanner.tsx` | Hero recommendation banner |
| **Create** | `src/components/dashboard/ModelTable.tsx` | Lean 6-column model comparison table |
| **Create** | `src/components/dashboard/WhatChanged.tsx` | Curated activity feed (7 days, max 6) |
| **Modify** | `src/components/dashboard/StatusGrid.tsx` | Wraps 3× StatusCard in a grid |
| **Modify** | `src/components/dashboard/Dashboard.tsx` | New dark layout shell, wires all components |
| **Modify** | `src/components/dashboard/UpdatedAt.tsx` | Restyle to slate-600 text |
| **Delete** | `src/components/dashboard/PricingTable.tsx` | Superseded by ModelTable |
| **Delete** | `src/components/dashboard/BenchmarkPanel.tsx` | Superseded by ModelTable |
| **Delete** | `src/components/dashboard/ActivityFeed.tsx` | Superseded by WhatChanged |

---

## Task 1: Recommendation Logic

**Files:**
- Create: `src/lib/recommendation.ts`
- Create: `src/lib/__tests__/recommendation.test.ts`

**Interfaces:**
- Consumes: `BenchmarkData[]`, `ProviderStatusData[]` from `@/types/dashboard`
- Produces: `getRecommendation(benchmarks, statuses): Recommendation | null` and exported `Recommendation` interface

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/recommendation.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { getRecommendation } from '../recommendation';
import type { BenchmarkData, ProviderStatusData } from '@/types/dashboard';

const BENCHMARKS: BenchmarkData[] = [
  {
    id: 'claude-sonnet-4-6',
    name: 'Claude Sonnet 4.6',
    provider: 'anthropic',
    mmlu: 91.2,
    humaneval: 88.5,
    math: 80.1,
    inputPrice: 3.0,
    outputPrice: 15.0,
    latencyP50: null,
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    mmlu: 88.7,
    humaneval: 90.2,
    math: 76.6,
    inputPrice: 5.0,
    outputPrice: 20.0,
    latencyP50: null,
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    mmlu: 95.0,
    humaneval: 90.0,
    math: 91.0,
    inputPrice: 1.25,
    outputPrice: 10.0,
    latencyP50: null,
  },
];

const ALL_OPERATIONAL: ProviderStatusData[] = [
  {
    provider: 'openai',
    status: 'operational',
    uptime30d: 99.8,
    lastChecked: '2026-06-29T00:00:00Z',
    history: [],
  },
  {
    provider: 'anthropic',
    status: 'operational',
    uptime30d: 100,
    lastChecked: '2026-06-29T00:00:00Z',
    history: [],
  },
  {
    provider: 'google',
    status: 'operational',
    uptime30d: 99.1,
    lastChecked: '2026-06-29T00:00:00Z',
    history: [],
  },
];

describe('getRecommendation', () => {
  it('picks the model with best mmlu/outputPrice ratio among operational providers', () => {
    const result = getRecommendation(BENCHMARKS, ALL_OPERATIONAL);
    // Scores: gemini-2.5-pro=9.5, claude-sonnet-4-6=6.08, gpt-4o=4.435
    expect(result?.modelId).toBe('gemini-2.5-pro');
    expect(result?.reason).toBe(
      'Best price-to-performance among operational models today',
    );
  });

  it('excludes models from non-operational providers', () => {
    const statuses: ProviderStatusData[] = [
      { ...ALL_OPERATIONAL[0] },
      { ...ALL_OPERATIONAL[1] },
      { ...ALL_OPERATIONAL[2], status: 'outage' },
    ];
    const result = getRecommendation(BENCHMARKS, statuses);
    expect(result?.provider).not.toBe('google');
  });

  it('excludes models with null mmlu', () => {
    const benchmarks: BenchmarkData[] = [
      { ...BENCHMARKS[0], mmlu: null },
      { ...BENCHMARKS[1] },
    ];
    const result = getRecommendation(benchmarks, ALL_OPERATIONAL);
    expect(result?.modelId).toBe('gpt-4o');
  });

  it('excludes models with null outputPrice', () => {
    const benchmarks: BenchmarkData[] = [
      { ...BENCHMARKS[0], outputPrice: null },
      { ...BENCHMARKS[1] },
    ];
    const result = getRecommendation(benchmarks, ALL_OPERATIONAL);
    expect(result?.modelId).toBe('gpt-4o');
  });

  it('falls back to highest uptime provider when all are degraded', () => {
    const statuses: ProviderStatusData[] = [
      { ...ALL_OPERATIONAL[0], status: 'degraded', uptime30d: 97 },
      { ...ALL_OPERATIONAL[1], status: 'degraded', uptime30d: 99 },
      { ...ALL_OPERATIONAL[2], status: 'outage', uptime30d: 90 },
    ];
    const result = getRecommendation(BENCHMARKS, statuses);
    expect(result?.provider).toBe('anthropic');
    expect(result?.reason).toBe(
      'Most reliable provider — all providers currently experiencing issues',
    );
  });

  it('returns null when benchmarks are empty', () => {
    const result = getRecommendation([], ALL_OPERATIONAL);
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run src/lib/__tests__/recommendation.test.ts
```

Expected: FAIL — `Cannot find module '../recommendation'`

- [ ] **Step 3: Implement `src/lib/recommendation.ts`**

```typescript
import type { BenchmarkData, ProviderStatusData } from '@/types/dashboard';

export interface Recommendation {
  modelId: string;
  modelName: string;
  provider: string;
  reason: string;
}

export function getRecommendation(
  benchmarks: BenchmarkData[],
  statuses: ProviderStatusData[],
): Recommendation | null {
  const operationalProviders = new Set(
    statuses
      .filter((s) => s.status === 'operational')
      .map((s) => s.provider),
  );

  const scored = benchmarks
    .filter(
      (m) =>
        operationalProviders.has(m.provider) &&
        m.mmlu !== null &&
        m.outputPrice !== null &&
        m.outputPrice > 0,
    )
    .map((m) => ({
      model: m,
      score: (m.mmlu as number) / (m.outputPrice as number),
    }))
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    const { model } = scored[0];
    return {
      modelId: model.id,
      modelName: model.name,
      provider: model.provider,
      reason: 'Best price-to-performance among operational models today',
    };
  }

  const fallback = [...statuses].sort((a, b) => b.uptime30d - a.uptime30d)[0];
  if (!fallback) return null;

  const fallbackModel = benchmarks.find((b) => b.provider === fallback.provider);
  if (!fallbackModel) return null;

  return {
    modelId: fallbackModel.id,
    modelName: fallbackModel.name,
    provider: fallbackModel.provider,
    reason:
      'Most reliable provider — all providers currently experiencing issues',
  };
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npx vitest run src/lib/__tests__/recommendation.test.ts
```

Expected: PASS — 6 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/recommendation.ts src/lib/__tests__/recommendation.test.ts
git commit -m "feat: add recommendation engine with unit tests"
```

---

## Task 2: StatusCard Component

**Files:**
- Create: `src/components/dashboard/StatusCard.tsx`

**Interfaces:**
- Consumes: `ProviderStatusData` from `@/types/dashboard`, `PROVIDER_LABELS` from `@/lib/constants`
- Produces: `StatusCard({ data: ProviderStatusData })` — used by StatusGrid in Task 5

- [ ] **Step 1: Create `src/components/dashboard/StatusCard.tsx`**

```tsx
import { PROVIDER_LABELS } from '@/lib/constants';
import type { ProviderStatus, ProviderStatusData } from '@/types/dashboard';

const STATUS_DOT: Record<ProviderStatus, string> = {
  operational: 'bg-emerald-400',
  degraded: 'bg-amber-400',
  outage: 'bg-red-500',
  unknown: 'bg-slate-500',
};

const STATUS_LABEL: Record<ProviderStatus, string> = {
  operational: 'Operational',
  degraded: 'Degraded',
  outage: 'Outage',
  unknown: 'Unknown',
};

const STATUS_TEXT: Record<ProviderStatus, string> = {
  operational: 'text-emerald-400',
  degraded: 'text-amber-400',
  outage: 'text-red-500',
  unknown: 'text-slate-500',
};

interface StatusCardProps {
  data: ProviderStatusData;
}

export function StatusCard({ data }: StatusCardProps) {
  const sparkline = data.history.slice(-7);

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-slate-900 p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
        {PROVIDER_LABELS[data.provider] ?? data.provider}
      </p>
      <div className="flex items-center gap-2">
        <span
          className={`h-3 w-3 rounded-full ${STATUS_DOT[data.status]}`}
        />
        <span className={`text-lg font-bold ${STATUS_TEXT[data.status]}`}>
          {STATUS_LABEL[data.status]}
        </span>
      </div>
      <p className="text-sm text-slate-400">{data.uptime30d}% uptime (30d)</p>
      <div className="flex items-center gap-1.5">
        {sparkline.length === 0 ? (
          <span className="text-xs text-slate-600">No history yet</span>
        ) : (
          sparkline.map((entry, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full ${STATUS_DOT[entry.status]}`}
              title={`${entry.timestamp}: ${entry.status}`}
            />
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/StatusCard.tsx
git commit -m "feat: add StatusCard with 7-point sparkline"
```

---

## Task 3: RecommendationBanner Component

**Files:**
- Create: `src/components/dashboard/RecommendationBanner.tsx`

**Interfaces:**
- Consumes: `Recommendation` from `@/lib/recommendation`, `ProviderStatus` from `@/types/dashboard`
- Produces: `RecommendationBanner({ recommendation: Recommendation | null, providerStatus: ProviderStatus })` — used by Dashboard in Task 6

- [ ] **Step 1: Create `src/components/dashboard/RecommendationBanner.tsx`**

```tsx
import { PROVIDER_LABELS } from '@/lib/constants';
import type { Recommendation } from '@/lib/recommendation';
import type { ProviderStatus } from '@/types/dashboard';

const STATUS_BADGE: Record<ProviderStatus, string> = {
  operational: 'bg-emerald-400/20 text-emerald-400',
  degraded: 'bg-amber-400/20 text-amber-400',
  outage: 'bg-red-500/20 text-red-400',
  unknown: 'bg-slate-500/20 text-slate-400',
};

const STATUS_LABEL: Record<ProviderStatus, string> = {
  operational: 'Operational',
  degraded: 'Degraded',
  outage: 'Outage',
  unknown: 'Unknown',
};

interface RecommendationBannerProps {
  recommendation: Recommendation | null;
  providerStatus: ProviderStatus;
}

export function RecommendationBanner({
  recommendation,
  providerStatus,
}: RecommendationBannerProps) {
  if (!recommendation) {
    return (
      <div className="rounded-xl border-l-4 border-slate-700 bg-slate-900 p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Recommended for production
        </p>
        <p className="mt-2 text-xl font-bold text-slate-400">
          No recommendation available
        </p>
        <p className="mt-1 text-sm text-slate-600">
          Waiting for provider data
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-l-4 border-indigo-500 bg-slate-900 p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
        Recommended for production
      </p>
      <p className="mt-2 text-2xl font-bold text-white">
        {recommendation.modelName}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <span className="text-sm text-slate-400">
          {PROVIDER_LABELS[recommendation.provider as keyof typeof PROVIDER_LABELS] ??
            recommendation.provider}
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[providerStatus]}`}
        >
          {STATUS_LABEL[providerStatus]}
        </span>
        <span className="text-sm text-slate-500">{recommendation.reason}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/RecommendationBanner.tsx
git commit -m "feat: add RecommendationBanner hero component"
```

---

## Task 4: ModelTable Component

**Files:**
- Create: `src/components/dashboard/ModelTable.tsx`

**Interfaces:**
- Consumes: `BenchmarkData[]` from `@/types/dashboard`, `PROVIDER_LABELS` from `@/lib/constants`
- Produces: `ModelTable({ benchmarks: BenchmarkData[], recommendedId: string | null })` — used by Dashboard in Task 6

- [ ] **Step 1: Create `src/components/dashboard/ModelTable.tsx`**

```tsx
import { PROVIDER_LABELS } from '@/lib/constants';
import type { BenchmarkData } from '@/types/dashboard';

const BEST_FOR: Record<string, string> = {
  o3: 'Reasoning',
  'gpt-4.1': 'Coding',
  'gpt-4o': 'General',
  'claude-opus-4': 'Writing',
  'claude-sonnet-4-6': 'Cost-efficient',
  'gemini-2.5-pro': 'Multimodal',
  'gemini-2.5-flash': 'Speed',
};

const PROVIDER_DOT: Record<string, string> = {
  openai: 'bg-emerald-400',
  anthropic: 'bg-orange-400',
  google: 'bg-blue-400',
};

function formatPrice(price: number | null): string {
  if (price === null) return '—';
  return `$${price.toFixed(2)}`;
}

function formatMmlu(score: number | null): string {
  if (score === null) return '—';
  return score.toFixed(1);
}

interface ModelTableProps {
  benchmarks: BenchmarkData[];
  recommendedId: string | null;
}

export function ModelTable({ benchmarks, recommendedId }: ModelTableProps) {
  return (
    <div className="overflow-hidden rounded-xl bg-slate-900">
      <div className="border-b border-slate-800 px-5 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
          Model Comparison
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left text-xs text-slate-500">
              <th className="px-5 py-3 font-medium">Model</th>
              <th className="px-5 py-3 font-medium">Provider</th>
              <th className="px-5 py-3 text-right font-medium">Input $/M</th>
              <th className="px-5 py-3 text-right font-medium">Output $/M</th>
              <th className="px-5 py-3 text-right font-medium">MMLU</th>
              <th className="px-5 py-3 font-medium">Best for</th>
            </tr>
          </thead>
          <tbody>
            {benchmarks.map((m) => (
              <tr
                key={m.id}
                className={`border-b border-slate-800 last:border-0 ${
                  m.id === recommendedId
                    ? 'bg-indigo-500/5 ring-1 ring-inset ring-indigo-500/40'
                    : 'hover:bg-slate-800/50'
                }`}
              >
                <td className="px-5 py-3 font-medium text-white">
                  {m.id === recommendedId && (
                    <span className="mr-1.5 text-indigo-400">★</span>
                  )}
                  {m.name}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${PROVIDER_DOT[m.provider] ?? 'bg-slate-500'}`}
                    />
                    <span className="text-slate-400">
                      {PROVIDER_LABELS[m.provider] ?? m.provider}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-slate-300">
                  {formatPrice(m.inputPrice)}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-slate-300">
                  {formatPrice(m.outputPrice)}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-slate-300">
                  {formatMmlu(m.mmlu)}
                </td>
                <td className="px-5 py-3">
                  <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-300">
                    {BEST_FOR[m.id] ?? '—'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/ModelTable.tsx
git commit -m "feat: add ModelTable with Best-for tags and recommended row highlight"
```

---

## Task 5: WhatChanged Component

**Files:**
- Create: `src/components/dashboard/WhatChanged.tsx`

**Interfaces:**
- Consumes: `ActivityEvent[]` from `@/types/dashboard`, `PROVIDER_LABELS` from `@/lib/constants`
- Produces: `WhatChanged({ events: ActivityEvent[] })` — filters to last 7 days, max 6 items; used by Dashboard in Task 6

- [ ] **Step 1: Create `src/components/dashboard/WhatChanged.tsx`**

```tsx
import { PROVIDER_LABELS } from '@/lib/constants';
import type { ActivityEvent, ActivityEventType } from '@/types/dashboard';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const TYPE_LABEL: Record<ActivityEventType, string> = {
  release: 'New Model',
  incident: 'Incident',
  incident_resolved: 'Resolved',
  price_change: 'Price Change',
  benchmark_change: 'Benchmark',
};

const TYPE_COLOR: Record<ActivityEventType, string> = {
  release: 'bg-indigo-500/20 text-indigo-400',
  incident: 'bg-red-500/20 text-red-400',
  incident_resolved: 'bg-emerald-500/20 text-emerald-400',
  price_change: 'bg-amber-500/20 text-amber-400',
  benchmark_change: 'bg-purple-500/20 text-purple-400',
};

const PROVIDER_DOT: Record<string, string> = {
  openai: 'bg-emerald-400',
  anthropic: 'bg-orange-400',
  google: 'bg-blue-400',
};

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface WhatChangedProps {
  events: ActivityEvent[];
}

export function WhatChanged({ events }: WhatChangedProps) {
  const cutoff = Date.now() - SEVEN_DAYS_MS;
  const filtered = events
    .filter((e) => new Date(e.date).getTime() >= cutoff)
    .slice(0, 6);

  return (
    <div className="overflow-hidden rounded-xl bg-slate-900">
      <div className="border-b border-slate-800 px-5 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
          What Changed
        </h2>
      </div>
      {filtered.length === 0 ? (
        <p className="px-5 py-6 text-sm text-slate-600">
          No changes in the last 7 days.
        </p>
      ) : (
        <ul className="divide-y divide-slate-800">
          {filtered.map((event) => (
            <li
              key={event.id}
              className="flex items-start justify-between gap-4 px-5 py-4"
            >
              <div className="flex min-w-0 flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 flex-shrink-0 rounded-full ${PROVIDER_DOT[event.provider] ?? 'bg-slate-500'}`}
                  />
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLOR[event.type]}`}
                  >
                    {TYPE_LABEL[event.type]}
                  </span>
                  <span className="text-xs text-slate-600">
                    {PROVIDER_LABELS[event.provider] ?? event.provider}
                  </span>
                </div>
                {event.link ? (
                  <a
                    href={event.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-sm font-medium text-slate-200 hover:text-white"
                  >
                    {event.title}
                  </a>
                ) : (
                  <p className="truncate text-sm font-medium text-slate-200">
                    {event.title}
                  </p>
                )}
              </div>
              <time className="shrink-0 text-xs text-slate-600">
                {relativeTime(event.date)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/WhatChanged.tsx
git commit -m "feat: add WhatChanged curated activity feed (7 days, max 6)"
```

---

## Task 6: Wire Dashboard, Update StatusGrid, Restyle UpdatedAt, Delete Old Components

**Files:**
- Modify: `src/components/dashboard/Dashboard.tsx`
- Modify: `src/components/dashboard/StatusGrid.tsx`
- Modify: `src/components/dashboard/UpdatedAt.tsx`
- Delete: `src/components/dashboard/PricingTable.tsx`
- Delete: `src/components/dashboard/BenchmarkPanel.tsx`
- Delete: `src/components/dashboard/ActivityFeed.tsx`

**Interfaces:**
- Consumes: all components from Tasks 2–5, `getRecommendation` from Task 1
- Produces: final dashboard page

- [ ] **Step 1: Replace `src/components/dashboard/Dashboard.tsx`**

```tsx
import type { DashboardSnapshot, ProviderStatus } from '@/types/dashboard';
import { getRecommendation } from '@/lib/recommendation';
import { ModelTable } from './ModelTable';
import { RecommendationBanner } from './RecommendationBanner';
import { StatusGrid } from './StatusGrid';
import { UpdatedAt } from './UpdatedAt';
import { WhatChanged } from './WhatChanged';

interface DashboardProps {
  snapshot: DashboardSnapshot;
}

export function Dashboard({ snapshot }: DashboardProps) {
  const recommendation = getRecommendation(snapshot.benchmarks, snapshot.statuses);
  const providerStatus: ProviderStatus = recommendation
    ? (snapshot.statuses.find((s) => s.provider === recommendation.provider)
        ?.status ?? 'unknown')
    : 'unknown';

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white">
              AI Digest Dashboard
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Live monitoring across OpenAI, Anthropic, and Google
            </p>
          </div>
          <UpdatedAt fetchedAt={snapshot.fetchedAt} />
        </div>

        <div className="flex flex-col gap-5">
          <RecommendationBanner
            recommendation={recommendation}
            providerStatus={providerStatus}
          />
          <StatusGrid statuses={snapshot.statuses} />
          <ModelTable
            benchmarks={snapshot.benchmarks}
            recommendedId={recommendation?.modelId ?? null}
          />
          <WhatChanged events={snapshot.activity} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace `src/components/dashboard/StatusGrid.tsx`**

```tsx
import type { ProviderStatusData } from '@/types/dashboard';
import { StatusCard } from './StatusCard';

interface StatusGridProps {
  statuses: ProviderStatusData[];
}

export function StatusGrid({ statuses }: StatusGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {statuses.map((s) => (
        <StatusCard key={s.provider} data={s} />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Replace `src/components/dashboard/UpdatedAt.tsx`**

```tsx
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
    const id = setInterval(
      () => setMinutes(getMinutesAgo(fetchedAt)),
      60_000,
    );
    return () => clearInterval(id);
  }, [fetchedAt]);

  if (minutes === 0)
    return <span className="text-xs text-slate-600">Updated just now</span>;

  return (
    <span className="text-xs text-slate-600">
      Updated {minutes} {minutes === 1 ? 'minute' : 'minutes'} ago
    </span>
  );
}
```

- [ ] **Step 4: Delete old components**

```bash
rm src/components/dashboard/PricingTable.tsx
rm src/components/dashboard/BenchmarkPanel.tsx
rm src/components/dashboard/ActivityFeed.tsx
```

- [ ] **Step 5: Verify TypeScript and build**

```bash
npx tsc --noEmit
npm run build
```

Expected: zero errors, zero warnings

- [ ] **Step 6: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass (including the recommendation tests from Task 1)

- [ ] **Step 7: Commit**

```bash
git add src/components/dashboard/Dashboard.tsx \
        src/components/dashboard/StatusGrid.tsx \
        src/components/dashboard/UpdatedAt.tsx
git rm src/components/dashboard/PricingTable.tsx \
       src/components/dashboard/BenchmarkPanel.tsx \
       src/components/dashboard/ActivityFeed.tsx
git commit -m "feat: AI Command Center — dark dashboard with recommendation banner, status sparklines, model table, curated feed"
```
