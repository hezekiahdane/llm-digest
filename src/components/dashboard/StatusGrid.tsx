import type { ProviderStatusData } from '@/types/dashboard';
import { StatusCard } from './StatusCard';

interface StatusGridProps {
  statuses: ProviderStatusData[];
}

export function StatusGrid({ statuses }: StatusGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {statuses.map((s) => (
        <StatusCard key={s.provider} data={s} />
      ))}
    </div>
  );
}
