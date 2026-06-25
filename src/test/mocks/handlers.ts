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
  // Google Cloud Status
  http.get('https://status.cloud.google.com/incidents.json', () =>
    HttpResponse.json({ items: [] }),
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
  // Artificial Analysis
  http.get('https://artificialanalysis.ai/api/v1/models', () =>
    HttpResponse.json({
      models: [
        {
          id: 'gpt-4o',
          name: 'GPT-4o',
          provider: 'openai',
          quality_index: 88.7,
          coding_index: 90.2,
          math_index: 76.6,
          input_price: 2.5,
          output_price: 10.0,
          median_output_tokens_per_second: 2.2,
        },
        {
          id: 'claude-sonnet-4-6',
          name: 'Claude Sonnet 4.6',
          provider: 'anthropic',
          quality_index: 91.2,
          coding_index: 88.5,
          math_index: 80.1,
          input_price: 3.0,
          output_price: 15.0,
          median_output_tokens_per_second: 1.9,
        },
      ],
    }),
  ),
];
