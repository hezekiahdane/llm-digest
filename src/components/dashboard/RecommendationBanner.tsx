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
