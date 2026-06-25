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
  o3: 'openai',
  'claude-opus-4': 'anthropic',
  'claude-sonnet-4-6': 'anthropic',
  'gemini-2.5-pro': 'google',
  'gemini-2.5-flash': 'google',
  'llama-4-maverick': 'meta',
};

function tokensPerSecToLatencyMs(tps: number | undefined): number | null {
  if (!tps || tps <= 0) return null;
  // Approximate: convert tokens per second to p50 latency in milliseconds
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
      .filter((m) => Object.hasOwn(TARGET_MODELS, m.id))
      .map((m) => ({
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
