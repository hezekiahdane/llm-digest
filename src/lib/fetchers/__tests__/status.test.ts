import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/mocks/server';
import { fetchAllStatuses } from '../status';

const NOW = '2026-06-25T00:00:00.000Z';

describe('fetchAllStatuses', () => {
  it('returns operational for all providers when no incidents', async () => {
    const results = await fetchAllStatuses(NOW);
    expect(results).toHaveLength(4);
    expect(results.every((r) => r.status === 'operational')).toBe(true);
    expect(results.every((r) => r.lastChecked === NOW)).toBe(true);
  });

  it('returns degraded for Anthropic when status is minor', async () => {
    server.use(
      http.get('https://status.anthropic.com/api/v2/summary.json', () =>
        HttpResponse.json({ status: { indicator: 'minor' }, incidents: [] }),
      ),
    );

    const results = await fetchAllStatuses(NOW);
    const anthropic = results.find((r) => r.provider === 'anthropic');
    expect(anthropic?.status).toBe('degraded');
  });

  it('returns outage for OpenAI when status is major', async () => {
    server.use(
      http.get('https://status.openai.com/api/v2/summary.json', () =>
        HttpResponse.json({ status: { indicator: 'major' }, incidents: [] }),
      ),
    );

    const results = await fetchAllStatuses(NOW);
    const openai = results.find((r) => r.provider === 'openai');
    expect(openai?.status).toBe('outage');
  });

  it('returns degraded for Google when active incident exists', async () => {
    server.use(
      http.get('https://status.cloud.google.com/incidents.json', () =>
        HttpResponse.json({
          items: [{ end: null, severity: 'medium' }],
        }),
      ),
    );

    const results = await fetchAllStatuses(NOW);
    const google = results.find((r) => r.provider === 'google');
    expect(google?.status).toBe('degraded');
  });

  it('returns unknown when a provider fetch fails', async () => {
    server.use(
      http.get('https://metastatus.com/api/v2/summary.json', () =>
        HttpResponse.error(),
      ),
    );

    const results = await fetchAllStatuses(NOW);
    const meta = results.find((r) => r.provider === 'meta');
    expect(meta?.status).toBe('unknown');
  });
});
