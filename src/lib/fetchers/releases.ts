import { XMLParser } from 'fast-xml-parser';
import type { Provider, ReleaseItem } from '@/types/dashboard';

interface RssItem {
  title: string;
  link: string;
  pubDate?: string;
  guid?: string | { '#text': string };
}

interface RssFeed {
  rss: { channel: { item: RssItem | RssItem[] } };
}

const FEEDS: Array<{ provider: Provider; url: string }> = [
  { provider: 'openai', url: 'https://openai.com/news/rss.xml' },
  { provider: 'anthropic', url: 'https://www.anthropic.com/rss.xml' },
  { provider: 'google', url: 'https://blog.google/products/gemini/rss' },
  { provider: 'meta', url: 'https://ai.meta.com/blog/rss' },
];

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

function extractGuid(guid: RssItem['guid']): string {
  if (!guid) return '';
  if (typeof guid === 'string') return guid;
  return guid['#text'] ?? '';
}

async function fetchFeed(
  provider: Provider,
  url: string,
): Promise<ReleaseItem[]> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  const parsed: RssFeed = parser.parse(xml);
  const rawItems = parsed.rss?.channel?.item;
  if (!rawItems) return [];

  const items = Array.isArray(rawItems) ? rawItems : [rawItems];

  return items.slice(0, 5).map((item) => {
    const guid = extractGuid(item.guid) || item.link;
    return {
      id: `${provider}-${Buffer.from(guid).toString('base64').slice(0, 16)}`,
      provider,
      title: item.title,
      link: item.link,
      date: item.pubDate
        ? new Date(item.pubDate).toISOString()
        : new Date(0).toISOString(),
    };
  });
}

export async function fetchAllReleases(): Promise<ReleaseItem[]> {
  const results = await Promise.allSettled(
    FEEDS.map(({ provider, url }) => fetchFeed(provider, url)),
  );

  const all = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));

  return all
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 20);
}
