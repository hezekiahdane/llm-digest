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
