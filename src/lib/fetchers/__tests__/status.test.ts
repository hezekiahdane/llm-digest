import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/mocks/server';
import { fetchAllStatuses } from '../status';

const NOW = '2026-06-25T00:00:00.000Z';

describe('fetchAllStatuses', () => {
  it('returns operational for all providers when no incidents', async () => {
    const results = await fetchAllStatuses(NOW);
    expect(results).toHaveLength(3);
    expect(results.every((r) => r.lastChecked === NOW)).toBe(true);
    // openai + anthropic + google are operational; meta may be operational or unknown
    expect(results.every((r) => r.status === 'operational')).toBe(true);
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

  it('returns degraded for Google when active incident exists (top-level array)', async () => {
    server.use(
      http.get('https://status.cloud.google.com/incidents.json', () =>
        // Google returns a top-level array, not { items: [] }
        HttpResponse.json([{ end: null, severity: 'medium' }]),
      ),
    );
    const results = await fetchAllStatuses(NOW);
    const google = results.find((r) => r.provider === 'google');
    expect(google?.status).toBe('degraded');
  });

  it('returns outage for Google when high-severity active incident exists', async () => {
    server.use(
      http.get('https://status.cloud.google.com/incidents.json', () =>
        HttpResponse.json([{ end: null, severity: 'high' }]),
      ),
    );
    const results = await fetchAllStatuses(NOW);
    const google = results.find((r) => r.provider === 'google');
    expect(google?.status).toBe('outage');
  });

  it('returns unknown when a provider fetch fails', async () => {
    server.use(
      http.get('https://status.openai.com/api/v2/summary.json', () =>
        HttpResponse.error(),
      ),
    );
    const results = await fetchAllStatuses(NOW);
    const openai = results.find((r) => r.provider === 'openai');
    expect(openai?.status).toBe('unknown');
  });
});
