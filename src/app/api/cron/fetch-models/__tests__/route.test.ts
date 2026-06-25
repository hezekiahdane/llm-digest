import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DashboardSnapshot } from '@/types/dashboard';

vi.mock('@/lib/agents/data-agent', () => ({
  runDataAgent: vi.fn(),
}));
vi.mock('@/lib/cache', () => ({
  setCachedSnapshot: vi.fn(),
}));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { runDataAgent } from '@/lib/agents/data-agent';
import { setCachedSnapshot } from '@/lib/cache';
import { GET } from '../route';

const MOCK_SNAPSHOT: DashboardSnapshot = {
  fetchedAt: '2026-06-25T00:00:00.000Z',
  statuses: [],
  benchmarks: [],
  releases: [],
  activity: [],
};

function makeRequest(secret: string | null) {
  return new Request('http://localhost/api/cron/fetch-models', {
    method: 'GET',
    headers: secret ? { Authorization: `Bearer ${secret}` } : {},
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = 'test-secret';
  vi.mocked(runDataAgent).mockResolvedValue(MOCK_SNAPSHOT);
  vi.mocked(setCachedSnapshot).mockResolvedValue(undefined);
});

describe('GET /api/cron/fetch-models', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const res = await GET(makeRequest(null));
    expect(res.status).toBe(401);
  });

  it('returns 401 when secret is wrong', async () => {
    const res = await GET(makeRequest('wrong-secret'));
    expect(res.status).toBe(401);
  });

  it('runs data agent and writes to cache on valid secret', async () => {
    const res = await GET(makeRequest('test-secret'));
    expect(res.status).toBe(200);
    expect(runDataAgent).toHaveBeenCalledOnce();
    expect(setCachedSnapshot).toHaveBeenCalledWith(MOCK_SNAPSHOT);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.fetchedAt).toBe(MOCK_SNAPSHOT.fetchedAt);
  });

  it('returns 500 if data agent throws', async () => {
    vi.mocked(runDataAgent).mockRejectedValue(new Error('fetch failed'));
    const res = await GET(makeRequest('test-secret'));
    expect(res.status).toBe(500);
  });
});
