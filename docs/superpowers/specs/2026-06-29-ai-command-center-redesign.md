# AI Command Center Redesign

**Date:** 2026-06-29  
**Status:** Approved  
**Audience:** Internal leadership  
**Goal:** Transform the AI Digest Dashboard from a data table into a live, opinionated monitoring tool presentable in a business call

---

## Problem

The current dashboard answers "what are the numbers?" but leadership needs to know "what does this mean for us?" Three concrete failures:

1. **Doesn't feel live** — status and benchmark data look like a static table
2. **Data isn't compelling** — raw MMLU/HumanEval/MATH columns mean nothing to a business audience
3. **Visually rough** — not polished enough to present with confidence

## Solution: Option A — AI Command Center

Decision-first redesign. The page is restructured so the most important signal — a live recommendation — is the first thing anyone sees, supported by status context and a lean model comparison.

---

## Layout (top to bottom)

```
┌─────────────────────────────────────────────────────┐
│  AI Digest Dashboard          Last updated 4 min ago │
├─────────────────────────────────────────────────────┤
│  ★ RECOMMENDATION BANNER (full width, hero)          │
│  "Recommended for production: Claude Sonnet 4.6"     │
│  Anthropic · Operational · Best price/performance    │
├──────────────┬──────────────┬───────────────────────┤
│  OpenAI      │  Anthropic   │  Google               │
│  ● Operational│  ● Operational│  ● Degraded          │
│  99.8% uptime │  100% uptime │  97.1% uptime        │
│  [sparkline] │  [sparkline] │  [sparkline]          │
├─────────────────────────────────────────────────────┤
│  MODEL COMPARISON (lean table)                       │
│  Model · Provider · Input $/M · Output $/M · MMLU   │
│  + "Best for" tag per model                          │
├─────────────────────────────────────────────────────┤
│  WHAT CHANGED (curated feed, max 6 items)            │
│  New release · Incident · Price change — last 7 days │
└─────────────────────────────────────────────────────┘
```

Everything fits on a 1080p screen without scrolling.

---

## Components

### 1. Recommendation Banner (new)

Full-width card with indigo left-border accent. Displays:

- **Headline:** "Recommended for production" + model name (large, bold)
- **Subline:** Provider · operational status badge · one-line reason string

**Recommendation logic (pure function, `src/lib/recommendation.ts`):**

1. Filter `benchmarks` to models whose provider status is `operational`
2. Filter out models with null `mmlu` or null `outputPrice`
3. Score each model: `mmlu / outputPrice` (higher MMLU and lower price = better)
4. Select top scorer, generate reason string from the data (e.g., *"Best price-to-performance among operational models today"*)
4. Fallback: if all providers are degraded/outage, pick the provider with highest `uptime30d`

No additional API calls. Runs on the existing `DashboardSnapshot`.

### 2. Provider Status Cards (redesigned)

Three cards in a row. Each shows:

- Provider name
- Large status label: `Operational`, `Degraded`, or `Outage`
- 30-day uptime percentage
- 7-point status sparkline (one dot per day, colored by status)

Sparkline is built from the existing `history: StatusEntry[]` array in the snapshot — no new data needed. This is what makes the page feel live.

### 3. Model Comparison Table (new — replaces BenchmarkPanel + PricingTable)

Lean table with columns: **Model · Provider · Input $/M · Output $/M · MMLU · Best for**

- Drops HumanEval and MATH columns (too technical for audience)
- Adds a `Best for` tag per model (hardcoded alongside benchmark scores):

| Model | Best for |
|-------|----------|
| o3 | Reasoning |
| GPT-4.1 | Coding |
| GPT-4o | General |
| Claude Opus 4 | Writing |
| Claude Sonnet 4.6 | Cost-efficient |
| Gemini 2.5 Pro | Multimodal |
| Gemini 2.5 Flash | Speed |

- Recommended model row gets a subtle indigo highlight ring
- Numbers: monospaced, right-aligned

### 4. What Changed Feed (redesigned — replaces ActivityFeed)

Same data source (RSS releases + activity events), filtered to:

- Last 7 days only
- Maximum 6 items
- Each item: provider color dot + event type badge (`New Model`, `Incident`, `Resolved`, `Price Change`) + title link + relative timestamp

Removes the raw 20-item RSS dump. Only meaningful events surface.

---

## Visual Design

| Element | Value |
|---------|-------|
| Page background | `slate-950` |
| Card background | `slate-900` |
| Accent | `indigo-500` (banner border, recommended row) |
| Operational | `emerald-400` |
| Degraded | `amber-400` |
| Outage | `red-500` |
| Number font | Monospaced, right-aligned |
| Supporting labels | `slate-400` |

Dark theme throughout. No light/white backgrounds.

---

## What Changes vs. What Stays

### Deleted
- `src/components/dashboard/PricingTable.tsx` — merged into Model Comparison
- `src/components/dashboard/BenchmarkPanel.tsx` — merged into Model Comparison
- `src/components/dashboard/ActivityFeed.tsx` — replaced by What Changed

### New
- `src/lib/recommendation.ts` — pure recommendation logic
- `src/components/dashboard/RecommendationBanner.tsx`
- `src/components/dashboard/StatusCard.tsx` (replaces StatusGrid internals)
- `src/components/dashboard/ModelTable.tsx`
- `src/components/dashboard/WhatChanged.tsx`

### Restyled only (no logic changes)
- `src/components/dashboard/Dashboard.tsx` — new layout shell
- `src/components/dashboard/UpdatedAt.tsx`
- `src/components/dashboard/StatusGrid.tsx` — now wraps StatusCard

### Untouched
- All fetchers (`status.ts`, `releases.ts`, `benchmarks.ts`)
- Cache layer (`cache.ts`)
- Data agent (`data-agent.ts`)
- Cron route (`/api/cron/route.ts`)
- `DashboardSnapshot` type — same shape, no migrations
- Upstash Redis setup

---

## Out of Scope

- No new data sources or API integrations
- No backend changes
- No authentication
- No user preferences or filters
