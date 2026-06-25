import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/mocks/server';
import { fetchBenchmarks } from '../benchmarks';

describe('fetchBenchmarks', () => {
  it('returns benchmark data normalized to our schema', async () => {
    const results = await fetchBenchmarks();
    expect(results.length).toBeGreaterThan(0);
    for (const model of results) {
      expect(model.id).toBeTruthy();
      expect(model.name).toBeTruthy();
      expect(model.provider).toBeTruthy();
    }
  });

  it('returns only target models', async () => {
    const TARGET_IDS = [
      'gpt-4o',
      'gpt-4.1',
      'o3',
      'claude-opus-4',
      'claude-sonnet-4-6',
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'llama-4-maverick',
    ];
    const results = await fetchBenchmarks();
    for (const model of results) {
      expect(TARGET_IDS).toContain(model.id);
    }
  });

  it('maps provider correctly from API response', async () => {
    const results = await fetchBenchmarks();
    const openai = results.find((m) => m.id === 'gpt-4o');
    expect(openai?.provider).toBe('openai');
    const anthropic = results.find((m) => m.id === 'claude-sonnet-4-6');
    expect(anthropic?.provider).toBe('anthropic');
  });

  it('returns empty array when API is unavailable', async () => {
    server.use(
      http.get('https://artificialanalysis.ai/api/v1/models', () =>
        HttpResponse.error(),
      ),
    );
    const results = await fetchBenchmarks();
    expect(results).toEqual([]);
  });

  it('returns null for missing benchmark fields', async () => {
    server.use(
      http.get('https://artificialanalysis.ai/api/v1/models', () =>
        HttpResponse.json({
          models: [{ id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' }],
        }),
      ),
    );
    const results = await fetchBenchmarks();
    const model = results.find((m) => m.id === 'gpt-4o');
    expect(model?.mmlu).toBeNull();
    expect(model?.inputPrice).toBeNull();
  });
});
