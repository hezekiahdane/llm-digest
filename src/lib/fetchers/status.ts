import type {
  Provider,
  ProviderStatus,
  RawProviderStatus,
} from '@/types/dashboard';

interface StatuspageResponse {
  status: { indicator: 'none' | 'minor' | 'major' | 'critical' };
}

// Google Cloud Status returns a top-level array of incidents (not { items: [] })
interface GoogleIncident {
  end?: string | null;
  severity?: string;
}

const STATUSPAGE_PROVIDERS: Array<{ provider: Provider; url: string }> = [
  { provider: 'openai', url: 'https://status.openai.com/api/v2/summary.json' },
  {
    provider: 'anthropic',
    url: 'https://status.anthropic.com/api/v2/summary.json',
  },
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
  // Response is a top-level array of incidents, not { items: [] }
  const incidents: GoogleIncident[] = await res.json();
  const active = incidents.filter((i) => i.end === null || i.end === undefined);
  let status: ProviderStatus = 'operational';
  if (active.length > 0) {
    // Google Cloud incident severity values: 'low' | 'medium' | 'high'
    status = active.some((i) => i.severity === 'high') ? 'outage' : 'degraded';
  }
  return { provider: 'google', status, lastChecked: now };
}

async function fetchMetaStatus(now: string): Promise<RawProviderStatus> {
  // Meta AI does not have a public Statuspage — use their developer platform status
  const res = await fetch('https://developers.facebook.com/status/dashboard/', {
    cache: 'no-store',
  });
  // If the page loads (2xx), assume operational — outages are announced differently
  const status: ProviderStatus = res.ok ? 'operational' : 'unknown';
  return { provider: 'meta', status, lastChecked: now };
}

export async function fetchAllStatuses(
  now: string,
): Promise<RawProviderStatus[]> {
  const results = await Promise.allSettled([
    ...STATUSPAGE_PROVIDERS.map(({ provider, url }) =>
      fetchStatuspageStatus(provider, url, now),
    ),
    fetchGoogleStatus(now),
    fetchMetaStatus(now),
  ]);

  const providers: Provider[] = ['openai', 'anthropic', 'google', 'meta'];

  return results.map((result, i) => {
    if (result.status === 'fulfilled') return result.value;
    return {
      provider: providers[i],
      status: 'unknown',
      lastChecked: now,
    };
  });
}
