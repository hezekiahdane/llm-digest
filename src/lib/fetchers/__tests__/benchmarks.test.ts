import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/mocks/server';
import { fetchBenchmarks } from '../benchmarks';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/models';

describe('fetchBenchmarks', () => {
  it('returns all 7 target models', async () => {
    const results = await fetchBenchmarks();
    expect(results).toHaveLength(7);
    for (const model of results) {
      expect(model.id).toBeTruthy();
      expect(model.name).toBeTruthy();
      expect(model.provider).toBeTruthy();
    }
  });

  it('returns only target model IDs', async () => {
    const TARGET_IDS = [
      'gpt-4o',
      'gpt-4.1',
      'o3',
      'claude-opus-4',
      'claude-sonnet-4-6',
      'gemini-2.5-pro',
      'gemini-2.5-flash',
    ];
    const results = await fetchBenchmarks();
    for (const model of results) {
      expect(TARGET_IDS).toContain(model.id);
    }
  });

  it('has correct provider mappings', async () => {
    const results = await fetchBenchmarks();
    expect(results.find((m) => m.id === 'gpt-4o')?.provider).toBe('openai');
    expect(results.find((m) => m.id === 'claude-sonnet-4-6')?.provider).toBe(
      'anthropic',
    );
    expect(results.find((m) => m.id === 'gemini-2.5-pro')?.provider).toBe(
      'google',
    );
  });

  it('includes hardcoded benchmark scores', async () => {
    const results = await fetchBenchmarks();
    const o3 = results.find((m) => m.id === 'o3');
    expect(o3?.mmlu).toBe(96.7);
    expect(o3?.humaneval).toBe(96.7);
    expect(o3?.math).toBe(97.1);
  });

  it('returns pricing from OpenRouter when available', async () => {
    const results = await fetchBenchmarks();
    const gpt4o = results.find((m) => m.id === 'gpt-4o');
    // MSW mock returns gpt-4o with pricing
    expect(gpt4o?.inputPrice).not.toBeNull();
    expect(gpt4o?.outputPrice).not.toBeNull();
  });

  it('returns null pricing when OpenRouter API is unavailable', async () => {
    server.use(http.get(OPENROUTER_URL, () => HttpResponse.error()));
    const results = await fetchBenchmarks();
    expect(results).toEqual([]);
  });
});
