import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRedis = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
}));

vi.mock('@upstash/redis', () => ({
  Redis: vi.fn().mockImplementation(
    class {
      get = mockRedis.get;
      set = mockRedis.set;
    },
  ),
}));

import {
  appendStatusHistory,
  getCachedSnapshot,
  getStatusHistory,
  setCachedSnapshot,
} from '../cache';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getCachedSnapshot', () => {
  it('returns null when cache is empty', async () => {
    mockRedis.get.mockResolvedValue(null);
    const result = await getCachedSnapshot();
    expect(result).toBeNull();
    expect(mockRedis.get).toHaveBeenCalledWith('snapshot');
  });

  it('returns cached snapshot when present', async () => {
    const MOCK_SNAPSHOT = {
      fetchedAt: '2026-06-25T00:00:00.000Z',
      statuses: [],
      benchmarks: [],
      releases: [],
      activity: [],
    };
    mockRedis.get.mockResolvedValue(MOCK_SNAPSHOT);
    const result = await getCachedSnapshot();
    expect(result).toEqual(MOCK_SNAPSHOT);
  });
});

describe('setCachedSnapshot', () => {
  it('writes snapshot with 2-hour TTL', async () => {
    mockRedis.set.mockResolvedValue('OK');
    const MOCK_SNAPSHOT = {
      fetchedAt: '2026-06-25T00:00:00.000Z',
      statuses: [],
      benchmarks: [],
      releases: [],
      activity: [],
    };
    await setCachedSnapshot(MOCK_SNAPSHOT);
    expect(mockRedis.set).toHaveBeenCalledWith('snapshot', MOCK_SNAPSHOT, {
      ex: 7200,
    });
  });
});

describe('getStatusHistory', () => {
  it('returns empty array when no history exists', async () => {
    mockRedis.get.mockResolvedValue(null);
    const result = await getStatusHistory('openai');
    expect(result).toEqual([]);
    expect(mockRedis.get).toHaveBeenCalledWith('status-history:openai');
  });

  it('returns stored history', async () => {
    const history = [
      { timestamp: '2026-06-25T00:00:00.000Z', status: 'operational' },
    ];
    mockRedis.get.mockResolvedValue(history);
    const result = await getStatusHistory('anthropic');
    expect(result).toEqual(history);
  });
});

describe('appendStatusHistory', () => {
  it('appends entry to existing history', async () => {
    const existing = [
      { timestamp: '2026-06-24T23:00:00.000Z', status: 'operational' },
    ];
    mockRedis.get.mockResolvedValue(existing);
    mockRedis.set.mockResolvedValue('OK');

    const newEntry = {
      timestamp: '2026-06-25T00:00:00.000Z',
      status: 'operational' as const,
    };
    const result = await appendStatusHistory('openai', newEntry);

    expect(result).toEqual([...existing, newEntry]);
    expect(mockRedis.set).toHaveBeenCalledWith('status-history:openai', [
      ...existing,
      newEntry,
    ]);
  });

  it('caps history at 720 entries', async () => {
    const existing = Array.from({ length: 720 }, (_, i) => ({
      timestamp: new Date(2026, 0, 1, i % 24).toISOString(),
      status: 'operational' as const,
    }));
    mockRedis.get.mockResolvedValue(existing);
    mockRedis.set.mockResolvedValue('OK');

    const newEntry = {
      timestamp: '2026-06-25T00:00:00.000Z',
      status: 'operational' as const,
    };
    const result = await appendStatusHistory('openai', newEntry);

    expect(result).toHaveLength(720);
    expect(result[719]).toEqual(newEntry);
  });
});
