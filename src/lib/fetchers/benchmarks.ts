import type { Provider, RawBenchmark } from '@/types/dashboard';

// OpenRouter model IDs mapped to our provider + display name
const OPENROUTER_MODELS: Record<
  string,
  { id: string; name: string; provider: Provider }
> = {
  'openai/gpt-4o': { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
  'openai/gpt-4.1': { id: 'gpt-4.1', name: 'GPT-4.1', provider: 'openai' },
  'openai/o3': { id: 'o3', name: 'o3', provider: 'openai' },
  'anthropic/claude-opus-4': {
    id: 'claude-opus-4',
    name: 'Claude Opus 4',
    provider: 'anthropic',
  },
  'anthropic/claude-sonnet-4.6': {
    id: 'claude-sonnet-4-6',
    name: 'Claude Sonnet 4.6',
    provider: 'anthropic',
  },
  'google/gemini-2.5-pro': {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'google',
  },
  'google/gemini-2.5-flash': {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'google',
  },
  'meta-llama/llama-4-maverick': {
    id: 'llama-4-maverick',
    name: 'Llama 4 Maverick',
    provider: 'meta',
  },
};

// Publicly available benchmark scores — stable after model release
// Sources: model cards, MMLU/HumanEval/MATH leaderboards
const BENCHMARK_SCORES: Record<
  string,
  { mmlu: number | null; humaneval: number | null; math: number | null }
> = {
  'gpt-4o': { mmlu: 88.7, humaneval: 90.2, math: 76.6 },
  'gpt-4.1': { mmlu: 90.0, humaneval: 92.0, math: 82.0 },
  o3: { mmlu: 96.7, humaneval: 96.7, math: 97.1 },
  'claude-opus-4': { mmlu: 95.0, humaneval: 92.0, math: 90.0 },
  'claude-sonnet-4-6': { mmlu: 91.2, humaneval: 88.5, math: 80.1 },
  'gemini-2.5-pro': { mmlu: 95.0, humaneval: 90.0, math: 91.0 },
  'gemini-2.5-flash': { mmlu: 89.0, humaneval: 85.0, math: 80.0 },
  'llama-4-maverick': { mmlu: 88.0, humaneval: 82.0, math: 73.0 },
};

interface OpenRouterModel {
  id: string;
  pricing?: {
    prompt?: string;
    completion?: string;
  };
  context_length?: number;
}

interface OpenRouterResponse {
  data: OpenRouterModel[];
}

function toPricePerMillion(perToken: string | undefined): number | null {
  if (!perToken) return null;
  const n = Number.parseFloat(perToken);
  return Number.isNaN(n) ? null : Math.round(n * 1_000_000 * 100) / 100;
}

export async function fetchBenchmarks(): Promise<RawBenchmark[]> {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      cache: 'no-store',
    });
    if (!res.ok) return [];

    const data: OpenRouterResponse = await res.json();
    const modelMap = new Map(data.data.map((m) => [m.id, m]));

    return Object.entries(OPENROUTER_MODELS).map(([orId, meta]) => {
      const orModel = modelMap.get(orId);
      const scores = BENCHMARK_SCORES[meta.id] ?? {
        mmlu: null,
        humaneval: null,
        math: null,
      };

      return {
        id: meta.id,
        name: meta.name,
        provider: meta.provider,
        mmlu: scores.mmlu,
        humaneval: scores.humaneval,
        math: scores.math,
        inputPrice: toPricePerMillion(orModel?.pricing?.prompt),
        outputPrice: toPricePerMillion(orModel?.pricing?.completion),
        latencyP50: null,
      };
    });
  } catch {
    return [];
  }
}
