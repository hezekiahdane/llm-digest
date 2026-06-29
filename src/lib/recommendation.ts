import type { BenchmarkData, Provider, ProviderStatusData } from '@/types/dashboard';

export interface Recommendation {
  modelId: string;
  modelName: string;
  provider: Provider;
  reason: string;
}

export function getRecommendation(
  benchmarks: BenchmarkData[],
  statuses: ProviderStatusData[],
): Recommendation | null {
  const operationalProviders = new Set(
    statuses.filter((s) => s.status === 'operational').map((s) => s.provider),
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

  const fallback = [...statuses]
    .filter((s) => s.status !== 'outage')
    .sort((a, b) => b.uptime30d - a.uptime30d)[0];
  if (!fallback) return null;

  const fallbackModel = benchmarks.find(
    (b) => b.provider === fallback.provider,
  );
  if (!fallbackModel) return null;

  return {
    modelId: fallbackModel.id,
    modelName: fallbackModel.name,
    provider: fallbackModel.provider,
    reason:
      'Most reliable provider — all providers currently experiencing issues',
  };
}
