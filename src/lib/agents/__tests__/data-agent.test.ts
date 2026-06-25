import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  DashboardSnapshot,
  RawBenchmark,
  RawProviderStatus,
  ReleaseItem,
} from '@/types/dashboard';

vi.mock('@/lib/fetchers/status', () => ({
  fetchAllStatuses: vi.fn(),
}));
vi.mock('@/lib/fetchers/releases', () => ({
  fetchAllReleases: vi.fn(),
}));
vi.mock('@/lib/fetchers/benchmarks', () => ({
  fetchBenchmarks: vi.fn(),
}));
vi.mock('@/lib/cache', () => ({
  getCachedSnapshot: vi.fn(),
  setCachedSnapshot: vi.fn(),
  appendStatusHistory: vi.fn(),
}));

import { appendStatusHistory, getCachedSnapshot } from '@/lib/cache';
import { fetchBenchmarks } from '@/lib/fetchers/benchmarks';
import { fetchAllReleases } from '@/lib/fetchers/releases';
import { fetchAllStatuses } from '@/lib/fetchers/status';
import { runDataAgent } from '../data-agent';

const mockStatuses: RawProviderStatus[] = [
  {
    provider: 'openai',
    status: 'operational',
    lastChecked: '2026-06-25T00:00:00.000Z',
  },
  {
    provider: 'anthropic',
    status: 'operational',
    lastChecked: '2026-06-25T00:00:00.000Z',
  },
  {
    provider: 'google',
    status: 'operational',
    lastChecked: '2026-06-25T00:00:00.000Z',
  },
];

const mockBenchmarks: RawBenchmark[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    mmlu: 88.7,
    humaneval: 90.2,
    math: 76.6,
    inputPrice: 2.5,
    outputPrice: 10.0,
    latencyP50: 450,
  },
];

const mockReleases: ReleaseItem[] = [
  {
    id: 'openai-abc123',
    provider: 'openai',
    title: 'GPT-4o update',
    link: 'https://openai.com/blog',
    date: '2026-06-25T00:00:00.000Z',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchAllStatuses).mockResolvedValue(mockStatuses);
  vi.mocked(fetchAllReleases).mockResolvedValue(mockReleases);
  vi.mocked(fetchBenchmarks).mockResolvedValue(mockBenchmarks);
  vi.mocked(getCachedSnapshot).mockResolvedValue(null);
  vi.mocked(appendStatusHistory).mockImplementation(
    async (_provider, entry) => [entry],
  );
});

describe('runDataAgent', () => {
  it('returns a valid DashboardSnapshot with all fields', async () => {
    const snapshot = await runDataAgent();
    expect(snapshot.fetchedAt).toBeTruthy();
    expect(snapshot.statuses).toHaveLength(3);
    expect(snapshot.benchmarks).toHaveLength(1);
    expect(snapshot.releases).toHaveLength(1);
    expect(Array.isArray(snapshot.activity)).toBe(true);
  });

  it('computes uptime from history', async () => {
    vi.mocked(appendStatusHistory).mockResolvedValue([
      { timestamp: '2026-06-25T00:00:00.000Z', status: 'operational' },
      { timestamp: '2026-06-24T00:00:00.000Z', status: 'operational' },
    ]);
    const snapshot = await runDataAgent();
    expect(snapshot.statuses[0].uptime30d).toBe(100);
  });

  it('computes partial uptime correctly from mixed history', async () => {
    vi.mocked(appendStatusHistory).mockResolvedValue([
      { timestamp: '2026-06-25T00:00:00.000Z', status: 'operational' },
      { timestamp: '2026-06-24T00:00:00.000Z', status: 'degraded' },
    ]);
    const snapshot = await runDataAgent();
    // 1 operational out of 2 = 50%
    expect(snapshot.statuses[0].uptime30d).toBe(50);
  });

  it('detects price change and emits activity event', async () => {
    const prev: DashboardSnapshot = {
      fetchedAt: '2026-06-24T23:00:00.000Z',
      statuses: [],
      benchmarks: [{ ...mockBenchmarks[0], inputPrice: 5.0 }],
      releases: [],
      activity: [],
    };
    vi.mocked(getCachedSnapshot).mockResolvedValue(prev);

    const snapshot = await runDataAgent();
    const priceEvent = snapshot.activity.find((e) => e.type === 'price_change');
    expect(priceEvent).toBeDefined();
    expect(priceEvent?.provider).toBe('openai');
  });

  it('detects new incident and emits activity event', async () => {
    vi.mocked(fetchAllStatuses).mockResolvedValue([
      {
        provider: 'openai',
        status: 'degraded',
        lastChecked: '2026-06-25T00:00:00.000Z',
      },
      {
        provider: 'anthropic',
        status: 'operational',
        lastChecked: '2026-06-25T00:00:00.000Z',
      },
      {
        provider: 'google',
        status: 'operational',
        lastChecked: '2026-06-25T00:00:00.000Z',
      },
    ]);
    const prev: DashboardSnapshot = {
      fetchedAt: '2026-06-24T23:00:00.000Z',
      statuses: [
        {
          provider: 'openai',
          status: 'operational',
          uptime30d: 100,
          lastChecked: '2026-06-24T23:00:00.000Z',
          history: [],
        },
      ],
      benchmarks: [],
      releases: [],
      activity: [],
    };
    vi.mocked(getCachedSnapshot).mockResolvedValue(prev);

    const snapshot = await runDataAgent();
    const incident = snapshot.activity.find((e) => e.type === 'incident');
    expect(incident).toBeDefined();
    expect(incident?.provider).toBe('openai');
  });

  it('carries forward existing activity (max 50 events)', async () => {
    const existingActivity = Array.from({ length: 50 }, (_, i) => ({
      id: `event-${i}`,
      provider: 'openai' as const,
      type: 'release' as const,
      title: `Release ${i}`,
      description: '',
      date: '2026-06-24T00:00:00.000Z',
    }));
    vi.mocked(getCachedSnapshot).mockResolvedValue({
      fetchedAt: '2026-06-24T23:00:00.000Z',
      statuses: [],
      benchmarks: [],
      releases: [],
      activity: existingActivity,
    });

    const snapshot = await runDataAgent();
    expect(snapshot.activity.length).toBeLessThanOrEqual(50);
  });
});
