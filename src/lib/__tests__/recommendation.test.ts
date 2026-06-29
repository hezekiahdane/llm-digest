import { describe, expect, it } from 'vitest';
import type { BenchmarkData, ProviderStatusData } from '@/types/dashboard';
import { getRecommendation } from '../recommendation';

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

  it('does not recommend an outage provider in fallback', () => {
    const statuses: ProviderStatusData[] = [
      { ...ALL_OPERATIONAL[0], status: 'outage', uptime30d: 99 },   // outage, highest uptime
      { ...ALL_OPERATIONAL[1], status: 'degraded', uptime30d: 95 }, // degraded
      { ...ALL_OPERATIONAL[2], status: 'degraded', uptime30d: 80 }, // degraded
    ];
    const result = getRecommendation(BENCHMARKS, statuses);
    expect(result?.provider).not.toBe('openai');   // outage provider must be skipped
    expect(result?.provider).toBe('anthropic');    // highest-uptime non-outage provider
  });

  it('returns null when benchmarks are empty', () => {
    const result = getRecommendation([], ALL_OPERATIONAL);
    expect(result).toBeNull();
  });
});
