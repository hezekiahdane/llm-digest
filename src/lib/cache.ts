import { Redis } from '@upstash/redis';
import type {
  DashboardSnapshot,
  Provider,
  StatusEntry,
} from '@/types/dashboard';

const redis = new Redis({
  url: process.env.KV_REST_API_URL ?? '',
  token: process.env.KV_REST_API_TOKEN ?? '',
});

const SNAPSHOT_KEY = 'snapshot';
const STATUS_HISTORY_KEY = (provider: Provider) => `status-history:${provider}`;
const MAX_HISTORY = 720;

export async function getCachedSnapshot(): Promise<DashboardSnapshot | null> {
  return redis.get<DashboardSnapshot>(SNAPSHOT_KEY);
}

export async function setCachedSnapshot(
  data: DashboardSnapshot,
): Promise<void> {
  await redis.set(SNAPSHOT_KEY, data, { ex: 7200 });
}

export async function getStatusHistory(
  provider: Provider,
): Promise<StatusEntry[]> {
  return (await redis.get<StatusEntry[]>(STATUS_HISTORY_KEY(provider))) ?? [];
}

export async function appendStatusHistory(
  provider: Provider,
  entry: StatusEntry,
): Promise<StatusEntry[]> {
  const history = await getStatusHistory(provider);
  const updated = [...history, entry].slice(-MAX_HISTORY);
  await redis.set(STATUS_HISTORY_KEY(provider), updated);
  return updated;
}
