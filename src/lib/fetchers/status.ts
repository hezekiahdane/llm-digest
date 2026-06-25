import type {
  Provider,
  ProviderStatus,
  RawProviderStatus,
} from '@/types/dashboard';

interface StatuspageResponse {
  status: { indicator: 'none' | 'minor' | 'major' | 'critical' };
}

interface GoogleStatusResponse {
  items: Array<{ end?: string | null; severity?: string }>;
}

const STATUSPAGE_PROVIDERS: Array<{ provider: Provider; url: string }> = [
  { provider: 'openai', url: 'https://status.openai.com/api/v2/summary.json' },
  {
    provider: 'anthropic',
    url: 'https://status.anthropic.com/api/v2/summary.json',
  },
  { provider: 'meta', url: 'https://metastatus.com/api/v2/summary.json' },
];

function indicatorToStatus(indicator: string): ProviderStatus {
  if (indicator === 'none') return 'operational';
  if (indicator === 'minor') return 'degraded';
  return 'outage';
}

async function fetchStatuspageStatus(
  provider: Provider,
  url: string,
  now: string,
): Promise<RawProviderStatus> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: StatuspageResponse = await res.json();
  return {
    provider,
    status: indicatorToStatus(data.status.indicator),
    lastChecked: now,
  };
}

async function fetchGoogleStatus(now: string): Promise<RawProviderStatus> {
  const res = await fetch('https://status.cloud.google.com/incidents.json', {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: GoogleStatusResponse = await res.json();
  const active = data.items.filter(
    (i) => i.end === null || i.end === undefined,
  );
  let status: ProviderStatus = 'operational';
  if (active.length > 0) {
    status = active.some((i) => i.severity === 'high') ? 'outage' : 'degraded';
  }
  return { provider: 'google', status, lastChecked: now };
}

export async function fetchAllStatuses(
  now: string,
): Promise<RawProviderStatus[]> {
  const statuspagePromises = STATUSPAGE_PROVIDERS.map(({ provider, url }) =>
    fetchStatuspageStatus(provider, url, now),
  );

  const results = await Promise.allSettled([
    ...statuspagePromises,
    fetchGoogleStatus(now),
  ]);

  const providers: Provider[] = ['openai', 'anthropic', 'meta', 'google'];

  return results.map((result, i) => {
    if (result.status === 'fulfilled') return result.value;
    return {
      provider: providers[i],
      status: 'unknown' as ProviderStatus,
      lastChecked: now,
    };
  });
}
