import type { DashboardSnapshot } from '@/types/dashboard';
import { ActivityFeed } from './ActivityFeed';
import { BenchmarkPanel } from './BenchmarkPanel';
import { PricingTable } from './PricingTable';
import { StatusGrid } from './StatusGrid';
import { UpdatedAt } from './UpdatedAt';

interface DashboardProps {
  snapshot: DashboardSnapshot;
}

export function Dashboard({ snapshot }: DashboardProps) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            AI Digest Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live monitoring across OpenAI, Anthropic, and Google
          </p>
        </div>
        <UpdatedAt fetchedAt={snapshot.fetchedAt} />
      </div>

      <div className="flex flex-col gap-6">
        <StatusGrid statuses={snapshot.statuses} />

        <div className="grid gap-6 lg:grid-cols-2">
          <BenchmarkPanel benchmarks={snapshot.benchmarks} />
          <PricingTable benchmarks={snapshot.benchmarks} />
        </div>

        <ActivityFeed events={snapshot.activity} />
      </div>
    </div>
  );
}
