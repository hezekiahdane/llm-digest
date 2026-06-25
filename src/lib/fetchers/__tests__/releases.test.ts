import { describe, expect, it } from 'vitest';
import { fetchAllReleases } from '../releases';

describe('fetchAllReleases', () => {
  it('returns releases from all 4 providers', async () => {
    const results = await fetchAllReleases();
    const providers = new Set(results.map((r) => r.provider));
    expect(providers.has('openai')).toBe(true);
    expect(providers.has('anthropic')).toBe(true);
    expect(providers.has('google')).toBe(true);
    expect(providers.has('meta')).toBe(true);
  });

  it('returns at most 20 items total', async () => {
    const results = await fetchAllReleases();
    expect(results.length).toBeLessThanOrEqual(20);
  });

  it('returns items sorted by date descending', async () => {
    const results = await fetchAllReleases();
    for (let i = 1; i < results.length; i++) {
      expect(new Date(results[i - 1].date).getTime()).toBeGreaterThanOrEqual(
        new Date(results[i].date).getTime(),
      );
    }
  });

  it('each item has required fields', async () => {
    const results = await fetchAllReleases();
    for (const item of results) {
      expect(item.id).toBeTruthy();
      expect(item.provider).toBeTruthy();
      expect(item.title).toBeTruthy();
      expect(item.link).toBeTruthy();
      expect(item.date).toBeTruthy();
    }
  });

  it('returns empty array when all feeds fail', async () => {
    const { server } = await import('@/test/mocks/server');
    const { http, HttpResponse } = await import('msw');
    server.use(
      http.get('https://openai.com/news/rss.xml', () => HttpResponse.error()),
      http.get('https://www.anthropic.com/rss.xml', () => HttpResponse.error()),
      http.get('https://blog.google/products/gemini/rss', () =>
        HttpResponse.error(),
      ),
      http.get('https://ai.meta.com/blog/rss', () => HttpResponse.error()),
    );
    const results = await fetchAllReleases();
    expect(results).toEqual([]);
  });
});
