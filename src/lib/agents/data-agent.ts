import { appendStatusHistory, getCachedSnapshot } from '@/lib/cache';
import { fetchBenchmarks } from '@/lib/fetchers/benchmarks';
import { fetchAllReleases } from '@/lib/fetchers/releases';
import { fetchAllStatuses } from '@/lib/fetchers/status';
import type {
  ActivityEvent,
  BenchmarkData,
  DashboardSnapshot,
  Provider,
  ProviderStatusData,
  RawBenchmark,
  RawProviderStatus,
  ReleaseItem,
  StatusEntry,
} from '@/types/dashboard';

const MAX_ACTIVITY = 50;
const PROVIDERS: Provider[] = ['openai', 'anthropic', 'google'];

function computeUptime(history: StatusEntry[]): number {
  if (history.length === 0) return 100;
  const operational = history.filter((e) => e.status === 'operational').length;
  return Math.round((operational / history.length) * 1000) / 10;
}

async function buildStatusData(
  raw: RawProviderStatus,
): Promise<ProviderStatusData> {
  const history = await appendStatusHistory(raw.provider, {
    timestamp: raw.lastChecked,
    status: raw.status,
  });
  return {
    provider: raw.provider,
    status: raw.status,
    uptime30d: computeUptime(history),
    lastChecked: raw.lastChecked,
    history,
  };
}

function detectIncidents(
  prev: DashboardSnapshot | null,
  next: ProviderStatusData[],
  now: string,
): ActivityEvent[] {
  if (!prev) return [];
  const events: ActivityEvent[] = [];

  for (const current of next) {
    const previous = prev.statuses.find((s) => s.provider === current.provider);
    const wasOk = !previous || previous.status === 'operational';
    const isDown: boolean =
      current.status === 'degraded' || current.status === 'outage';
    const wasDown: boolean =
      previous?.status === 'degraded' || previous?.status === 'outage';
    const isNowOk = current.status === 'operational';

    if (wasOk && isDown) {
      events.push({
        id: `${current.provider}-incident-${now}`,
        provider: current.provider,
        type: 'incident',
        title: `${current.provider} API ${current.status}`,
        description: `${current.provider} is reporting ${current.status} status.`,
        date: now,
      });
    } else if (wasDown && isNowOk) {
      events.push({
        id: `${current.provider}-resolved-${now}`,
        provider: current.provider,
        type: 'incident_resolved',
        title: `${current.provider} incident resolved`,
        description: `${current.provider} has returned to operational status.`,
        date: now,
      });
    }
  }
  return events;
}

function detectPriceChanges(
  prev: DashboardSnapshot | null,
  next: RawBenchmark[],
  now: string,
): ActivityEvent[] {
  if (!prev || prev.benchmarks.length === 0) return [];
  const events: ActivityEvent[] = [];

  for (const newModel of next) {
    const oldModel = prev.benchmarks.find((m) => m.id === newModel.id);
    if (!oldModel) continue;

    const inputChanged =
      oldModel.inputPrice !== null &&
      newModel.inputPrice !== null &&
      Math.abs(oldModel.inputPrice - newModel.inputPrice) > 0.001;
    const outputChanged =
      oldModel.outputPrice !== null &&
      newModel.outputPrice !== null &&
      Math.abs(oldModel.outputPrice - newModel.outputPrice) > 0.001;

    if (inputChanged || outputChanged) {
      events.push({
        id: `${newModel.provider}-price-${now}`,
        provider: newModel.provider,
        type: 'price_change',
        title: `${newModel.name} pricing updated`,
        description: `Input: $${oldModel.inputPrice} → $${newModel.inputPrice}/1M tokens. Output: $${oldModel.outputPrice} → $${newModel.outputPrice}/1M tokens.`,
        date: now,
      });
    }
  }
  return events;
}

function detectBenchmarkChanges(
  prev: DashboardSnapshot | null,
  next: RawBenchmark[],
  now: string,
): ActivityEvent[] {
  if (!prev || prev.benchmarks.length === 0) return [];
  const events: ActivityEvent[] = [];

  for (const newModel of next) {
    const oldModel = prev.benchmarks.find((m) => m.id === newModel.id);
    if (!oldModel) continue;

    const mmluChanged =
      oldModel.mmlu !== null &&
      newModel.mmlu !== null &&
      Math.abs(oldModel.mmlu - newModel.mmlu) > 1.0;

    if (mmluChanged) {
      events.push({
        id: `${newModel.provider}-benchmark-${now}`,
        provider: newModel.provider,
        type: 'benchmark_change',
        title: `${newModel.name} benchmark scores updated`,
        description: `MMLU: ${oldModel.mmlu} → ${newModel.mmlu}`,
        date: now,
      });
    }
  }
  return events;
}

function releaseToEvent(release: ReleaseItem): ActivityEvent {
  return {
    id: `release-${release.id}`,
    provider: release.provider,
    type: 'release',
    title: release.title,
    description: `New release from ${release.provider}.`,
    date: release.date,
    link: release.link,
  };
}

function detectNewReleases(
  prev: DashboardSnapshot | null,
  next: ReleaseItem[],
): ActivityEvent[] {
  if (!prev) return next.map(releaseToEvent);
  const knownIds = new Set(prev.releases.map((r) => r.id));
  return next.filter((r) => !knownIds.has(r.id)).map(releaseToEvent);
}

export async function runDataAgent(): Promise<DashboardSnapshot> {
  const now = new Date().toISOString();

  const [rawStatuses, releases, rawBenchmarks, prevSnapshot] =
    await Promise.all([
      fetchAllStatuses(now),
      fetchAllReleases(),
      fetchBenchmarks(),
      getCachedSnapshot(),
    ]);

  // Ensure all 4 providers are represented (fallback to unknown)
  const completeStatuses: RawProviderStatus[] = PROVIDERS.map((provider) => {
    const found = rawStatuses.find((s) => s.provider === provider);
    return (
      found ?? {
        provider,
        status: 'unknown',
        lastChecked: now,
      }
    );
  });

  const statuses = await Promise.all(completeStatuses.map(buildStatusData));

  const benchmarks: BenchmarkData[] = rawBenchmarks.map((b) => ({
    id: b.id,
    name: b.name,
    provider: b.provider,
    mmlu: b.mmlu,
    humaneval: b.humaneval,
    math: b.math,
    inputPrice: b.inputPrice,
    outputPrice: b.outputPrice,
    latencyP50: b.latencyP50,
  }));

  // Fall back to cached benchmarks if fetcher returned empty
  const finalBenchmarks =
    benchmarks.length > 0 ? benchmarks : (prevSnapshot?.benchmarks ?? []);

  const newEvents: ActivityEvent[] = [
    ...detectIncidents(prevSnapshot, statuses, now),
    ...detectPriceChanges(prevSnapshot, rawBenchmarks, now),
    ...detectBenchmarkChanges(prevSnapshot, rawBenchmarks, now),
    ...detectNewReleases(prevSnapshot, releases),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const existingActivity = prevSnapshot?.activity ?? [];
  const mergedActivity = [...newEvents, ...existingActivity].slice(
    0,
    MAX_ACTIVITY,
  );

  return {
    fetchedAt: now,
    statuses,
    benchmarks: finalBenchmarks,
    releases,
    activity: mergedActivity,
  };
}
