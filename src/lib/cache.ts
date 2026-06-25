import { kv } from '@vercel/kv';
import type { DashboardSnapshot, Provider, StatusEntry } from '@/types/dashboard';

const SNAPSHOT_KEY = 'snapshot';
const STATUS_HISTORY_KEY = (provider: Provider) => `status-history:${provider}`;
const MAX_HISTORY = 720;

export async function getCachedSnapshot(): Promise<DashboardSnapshot | null> {
  return kv.get<DashboardSnapshot>(SNAPSHOT_KEY);
}

export async function setCachedSnapshot(data: DashboardSnapshot): Promise<void> {
  await kv.set(SNAPSHOT_KEY, data, { ex: 7200 });
}

export async function getStatusHistory(provider: Provider): Promise<StatusEntry[]> {
  return (await kv.get<StatusEntry[]>(STATUS_HISTORY_KEY(provider))) ?? [];
}

export async function appendStatusHistory(
  provider: Provider,
  entry: StatusEntry,
): Promise<StatusEntry[]> {
  const history = await getStatusHistory(provider);
  const updated = [...history, entry].slice(-MAX_HISTORY);
  await kv.set(STATUS_HISTORY_KEY(provider), updated);
  return updated;
}
