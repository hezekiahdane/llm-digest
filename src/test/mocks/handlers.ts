import { HttpResponse, http } from 'msw';

const mockStatuspageResponse = (indicator: 'none' | 'minor' | 'major') => ({
  status: { indicator },
  incidents: [],
});

function buildRssItem(provider: string, index: number): string {
  const num = index + 1;
  return [
    '<item>',
    `<title>${provider} Update ${num}</title>`,
    `<link>https://${provider}.com/blog/${num}</link>`,
    '<pubDate>Wed, 25 Jun 2026 00:00:00 +0000</pubDate>',
    `<guid>https://${provider}.com/blog/${num}</guid>`,
    '</item>',
  ].join('');
}

function mockRssXml(provider: string, count: number): string {
  const items = Array.from({ length: count }, (_, i) =>
    buildRssItem(provider, i),
  ).join('');
  return `<?xml version="1.0"?><rss version="2.0"><channel>${items}</channel></rss>`;
}

export const handlers = [
  // Statuspage.io — OpenAI, Anthropic, Meta
  http.get('https://status.openai.com/api/v2/summary.json', () =>
    HttpResponse.json(mockStatuspageResponse('none')),
  ),
  http.get('https://status.anthropic.com/api/v2/summary.json', () =>
    HttpResponse.json(mockStatuspageResponse('none')),
  ),
  http.get('https://metastatus.com/api/v2/summary.json', () =>
    HttpResponse.json(mockStatuspageResponse('none')),
  ),
  // Google Cloud Status — returns a top-level array, not { items: [] }
  http.get('https://status.cloud.google.com/incidents.json', () =>
    HttpResponse.json([]),
  ),
  // Meta developer platform status
  http.get('https://developers.facebook.com/status/dashboard/', () =>
    HttpResponse.text('<html>ok</html>'),
  ),
  // RSS feeds
  http.get('https://openai.com/news/rss.xml', () =>
    HttpResponse.text(mockRssXml('openai', 3)),
  ),
  http.get('https://www.anthropic.com/rss.xml', () =>
    HttpResponse.text(mockRssXml('anthropic', 3)),
  ),
  http.get('https://blog.google/products/gemini/rss', () =>
    HttpResponse.text(mockRssXml('google', 3)),
  ),
  http.get('https://ai.meta.com/blog/rss', () =>
    HttpResponse.text(mockRssXml('meta', 3)),
  ),
  // OpenRouter — pricing source for benchmarks fetcher
  http.get('https://openrouter.ai/api/v1/models', () =>
    HttpResponse.json({
      data: [
        {
          id: 'openai/gpt-4o',
          pricing: { prompt: '0.0000025', completion: '0.00001' },
        },
        {
          id: 'openai/gpt-4.1',
          pricing: { prompt: '0.000002', completion: '0.000008' },
        },
        {
          id: 'openai/o3',
          pricing: { prompt: '0.000002', completion: '0.000008' },
        },
        {
          id: 'anthropic/claude-opus-4',
          pricing: { prompt: '0.000015', completion: '0.000075' },
        },
        {
          id: 'anthropic/claude-sonnet-4.6',
          pricing: { prompt: '0.000003', completion: '0.000015' },
        },
        {
          id: 'google/gemini-2.5-pro',
          pricing: { prompt: '0.00000125', completion: '0.00001' },
        },
        {
          id: 'google/gemini-2.5-flash',
          pricing: { prompt: '0.0000003', completion: '0.0000025' },
        },
        {
          id: 'meta-llama/llama-4-maverick',
          pricing: { prompt: '0.0000002', completion: '0.0000006' },
        },
      ],
    }),
  ),
];
