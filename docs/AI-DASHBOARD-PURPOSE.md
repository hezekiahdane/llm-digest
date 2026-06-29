# AI Digest Dashboard — Purpose & Goals

**Document type:** Product brief
**Status:** Active
**Last updated:** June 2026

---

## What this is

The AI Digest Dashboard is a 24/7 automated agent and live web dashboard that continuously monitors the AI model landscape across the three major providers — OpenAI, Anthropic, and Google — and surfaces an actionable, opinionated view of which models to use and what has changed.

It runs without human intervention. Every hour, a background agent fetches live data from public sources, stores it, and makes it available to anyone who visits the dashboard. The output is not a table of numbers — it is a recommendation.

---

## The problem it solves

The AI model landscape moves faster than any team can manually track. In a single week, a provider might release a new model, change pricing, update benchmark scores, or experience a service outage — sometimes all at once. Right now, staying on top of this requires:

- Checking multiple provider status pages individually
- Following several blogs and RSS feeds
- Cross-referencing benchmark leaderboards on separate sites
- Manually comparing pricing documentation that changes without notice

There is no single place that shows the full picture, updated automatically, in a format that makes the answer obvious. Teams waste time on information-gathering that should be handled by a tool.

---

## Who it's for

**Primary users:** Developers and engineers who integrate AI models into products or workflows and need to know which model to use — right now — based on availability, cost, and capability.

**Secondary users:** Product managers and team leads who make decisions about which AI providers or models to use, and need a reliable, at-a-glance view without digging through provider documentation.

---

## What it does

The dashboard is structured around a single question: **what should we be using right now?**

**Recommendation** — The top of the dashboard surfaces a live recommendation: the best operational model for production use, selected automatically based on current provider status, benchmark performance, and pricing. This updates every hour.

**Provider status** — Is each provider's API operational right now? The dashboard shows current status (operational, degraded, or outage) with 30-day uptime history and a 7-day sparkline for OpenAI, Anthropic, and Google.

**Model comparison** — How do the flagship models compare? A lean table shows input/output pricing per million tokens, MMLU benchmark score, and a "Best for" tag per model (e.g., Reasoning, Coding, Cost-efficient, Multimodal). Only the columns that matter for a decision.

**What changed** — What has happened in the last 7 days? New model releases, pricing updates, and incidents are surfaced in a curated feed — filtered and limited to the events that actually matter, not a raw RSS dump.

---

## Goals

**Primary goal:** Eliminate manual AI model monitoring. No one should have to check three separate status pages or scan multiple blogs to know what's happening in the AI landscape. The dashboard does that work automatically and delivers a verdict.

**Secondary goal:** Make model selection faster and more confident. When evaluating whether to switch models or providers, the team should open one page, see the recommendation, and have the context to act — without stitching together information from multiple sources.

**Long-term goal:** Build a foundation for data-driven AI model decisions. By storing hourly snapshots over time, the system accumulates a historical record of how models and providers have changed — pricing trends, reliability patterns, benchmark improvements — that can inform future decisions.

---

## What success looks like

The dashboard is successful if:

- The first thing anyone sees is a clear recommendation they can act on
- The team stops manually checking provider status pages
- Model selection during planning no longer requires external research
- New model releases or pricing changes are noticed within hours, not days
- The dashboard runs for weeks without requiring manual intervention
- It can be opened during a meeting and understood by a non-technical stakeholder in under 30 seconds

---

## Scope and boundaries

This dashboard is a monitoring and decision-support tool, not a benchmarking platform. It does not run its own model evaluations — it aggregates data from trusted public sources (provider status APIs, OpenRouter for live pricing, published model cards for benchmark scores). The goal is reliable signal, not exhaustive coverage.

The current release covers three providers (OpenAI, Anthropic, Google) and their flagship models. Coverage can be expanded over time, but the priority is depth on the most relevant models over breadth across the entire ecosystem.

---

## Future extensions

The following are out of scope for the current release but are natural next steps:

- **Alerts** — Slack or email notifications when a provider goes down, a new model is released, or pricing changes
- **Historical charts** — Trend lines showing how benchmark scores, pricing, and uptime have evolved over time
- **Custom model selection** — Let users pin the specific models they care about rather than seeing all tracked models
- **Internal benchmarking** — Run standardized prompts against each model on a schedule and add first-party latency and quality data alongside the third-party scores
