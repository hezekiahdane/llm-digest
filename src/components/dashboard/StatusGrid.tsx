import type { ProviderStatus, ProviderStatusData } from '@/types/dashboard';

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  meta: 'Meta',
};

const STATUS_LABEL: Record<ProviderStatus, string> = {
  operational: 'Operational',
  degraded: 'Degraded',
  outage: 'Outage',
  unknown: 'Unknown',
};

const STATUS_COLOR: Record<ProviderStatus, string> = {
  operational: 'bg-green-500',
  degraded: 'bg-yellow-500',
  outage: 'bg-red-500',
  unknown: 'bg-gray-400',
};

const STATUS_TEXT: Record<ProviderStatus, string> = {
  operational: 'text-green-700',
  degraded: 'text-yellow-700',
  outage: 'text-red-700',
  unknown: 'text-gray-600',
};

interface StatusGridProps {
  statuses: ProviderStatusData[];
}

export function StatusGrid({ statuses }: StatusGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {statuses.map((s) => (
        <div
          key={s.provider}
          className="rounded-lg border bg-card p-4 shadow-sm"
        >
          <div className="mb-2 flex items-center gap-2">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${STATUS_COLOR[s.status]}`}
            />
            <span className="font-semibold">
              {PROVIDER_LABELS[s.provider] ?? s.provider}
            </span>
          </div>
          <p className={`text-sm font-medium ${STATUS_TEXT[s.status]}`}>
            {STATUS_LABEL[s.status]}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            30d uptime: <span>{s.uptime30d}%</span>
          </p>
        </div>
      ))}
    </div>
  );
}
