import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock @vercel/kv before any imports
vi.mock('@vercel/kv', () => {
  return {
    kv: {
      get: vi.fn(),
      set: vi.fn(),
    },
  };
});

describe('Cache layer', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('getCachedSnapshot', () => {
    it('returns null when cache is empty', async () => {
      const { kv } = await import('@vercel/kv');
      vi.mocked(kv.get).mockResolvedValue(null);

      const { getCachedSnapshot } = await import('../cache');
      const result = await getCachedSnapshot();
      expect(result).toBeNull();
      expect(vi.mocked(kv.get)).toHaveBeenCalledWith('snapshot');
    });

    it('returns cached snapshot when present', async () => {
      const { kv } = await import('@vercel/kv');

      const MOCK_SNAPSHOT = {
        fetchedAt: '2026-06-25T00:00:00.000Z',
        statuses: [],
        benchmarks: [],
        releases: [],
        activity: [],
      };

      vi.mocked(kv.get).mockResolvedValue(MOCK_SNAPSHOT);

      const { getCachedSnapshot } = await import('../cache');
      const result = await getCachedSnapshot();
      expect(result).toEqual(MOCK_SNAPSHOT);
    });
  });

  describe('setCachedSnapshot', () => {
    it('writes snapshot with 2-hour TTL', async () => {
      const { kv } = await import('@vercel/kv');
      vi.mocked(kv.set).mockResolvedValue('OK');

      const MOCK_SNAPSHOT = {
        fetchedAt: '2026-06-25T00:00:00.000Z',
        statuses: [],
        benchmarks: [],
        releases: [],
        activity: [],
      };

      const { setCachedSnapshot } = await import('../cache');
      await setCachedSnapshot(MOCK_SNAPSHOT);
      expect(vi.mocked(kv.set)).toHaveBeenCalledWith(
        'snapshot',
        MOCK_SNAPSHOT,
        {
          ex: 7200,
        },
      );
    });
  });

  describe('getStatusHistory', () => {
    it('returns empty array when no history exists', async () => {
      const { kv } = await import('@vercel/kv');
      vi.mocked(kv.get).mockResolvedValue(null);

      const { getStatusHistory } = await import('../cache');
      const result = await getStatusHistory('openai');
      expect(result).toEqual([]);
      expect(vi.mocked(kv.get)).toHaveBeenCalledWith('status-history:openai');
    });

    it('returns stored history', async () => {
      const { kv } = await import('@vercel/kv');

      const history = [
        { timestamp: '2026-06-25T00:00:00.000Z', status: 'operational' },
      ];
      vi.mocked(kv.get).mockResolvedValue(history);

      const { getStatusHistory } = await import('../cache');
      const result = await getStatusHistory('anthropic');
      expect(result).toEqual(history);
    });
  });

  describe('appendStatusHistory', () => {
    it('appends entry to existing history', async () => {
      const { kv } = await import('@vercel/kv');

      const existing = [
        { timestamp: '2026-06-24T23:00:00.000Z', status: 'operational' },
      ];
      vi.mocked(kv.get).mockResolvedValue(existing);
      vi.mocked(kv.set).mockResolvedValue('OK');

      const { appendStatusHistory } = await import('../cache');
      const newEntry = {
        timestamp: '2026-06-25T00:00:00.000Z',
        status: 'operational' as const,
      };
      const result = await appendStatusHistory('openai', newEntry);

      expect(result).toEqual([...existing, newEntry]);
      expect(vi.mocked(kv.set)).toHaveBeenCalledWith('status-history:openai', [
        ...existing,
        newEntry,
      ]);
    });

    it('caps history at 720 entries', async () => {
      const { kv } = await import('@vercel/kv');

      const existing = Array.from({ length: 720 }, (_, i) => ({
        timestamp: new Date(2026, 0, 1, i % 24).toISOString(),
        status: 'operational' as const,
      }));
      vi.mocked(kv.get).mockResolvedValue(existing);
      vi.mocked(kv.set).mockResolvedValue('OK');

      const { appendStatusHistory } = await import('../cache');
      const newEntry = {
        timestamp: '2026-06-25T00:00:00.000Z',
        status: 'operational' as const,
      };
      const result = await appendStatusHistory('openai', newEntry);

      expect(result).toHaveLength(720);
      expect(result[719]).toEqual(newEntry);
    });
  });
});
