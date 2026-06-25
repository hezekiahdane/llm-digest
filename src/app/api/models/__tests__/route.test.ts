import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DashboardSnapshot } from '@/types/dashboard';

vi.mock('@/lib/cache', () => ({
  getCachedSnapshot: vi.fn(),
}));

import { getCachedSnapshot } from '@/lib/cache';
import { GET } from '../route';

const MOCK_SNAPSHOT: DashboardSnapshot = {
  fetchedAt: '2026-06-25T00:00:00.000Z',
  statuses: [],
  benchmarks: [],
  releases: [],
  activity: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/models', () => {
  it('returns 503 when cache is empty', async () => {
    vi.mocked(getCachedSnapshot).mockResolvedValue(null);
    const req = new Request('http://localhost/api/models');
    const res = await GET(req);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it('returns 200 with snapshot when cache is populated', async () => {
    vi.mocked(getCachedSnapshot).mockResolvedValue(MOCK_SNAPSHOT);
    const req = new Request('http://localhost/api/models');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.fetchedAt).toBe(MOCK_SNAPSHOT.fetchedAt);
  });

  it('returns 500 when KV throws', async () => {
    vi.mocked(getCachedSnapshot).mockRejectedValue(new Error('KV error'));
    const req = new Request('http://localhost/api/models');
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});
