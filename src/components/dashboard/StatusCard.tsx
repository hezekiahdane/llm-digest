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
          sparkline.map((entry) => (
            <span
              key={entry.timestamp}
              className={`h-2 w-2 rounded-full ${STATUS_DOT[entry.status]}`}
              title={`${entry.timestamp}: ${entry.status}`}
            />
          ))
        )}
      </div>
    </div>
  );
}
