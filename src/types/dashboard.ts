export type Provider = 'openai' | 'anthropic' | 'google';
export type ProviderStatus = 'operational' | 'degraded' | 'outage' | 'unknown';
export type ActivityEventType =
  | 'release'
  | 'incident'
  | 'incident_resolved'
  | 'price_change'
  | 'benchmark_change';

export interface StatusEntry {
  timestamp: string;
  status: ProviderStatus;
}

export interface ProviderStatusData {
  provider: Provider;
  status: ProviderStatus;
  uptime30d: number;
  lastChecked: string;
  history: StatusEntry[];
}

export interface BenchmarkData {
  id: string;
  name: string;
  provider: Provider;
  mmlu: number | null;
  humaneval: number | null;
  math: number | null;
  inputPrice: number | null;
  outputPrice: number | null;
  latencyP50: number | null;
}

export interface ReleaseItem {
  id: string;
  provider: Provider;
  title: string;
  link: string;
  date: string;
}

export interface ActivityEvent {
  id: string;
  provider: Provider;
  type: ActivityEventType;
  title: string;
  description: string;
  date: string;
  link?: string;
}

export interface DashboardSnapshot {
  fetchedAt: string;
  statuses: ProviderStatusData[];
  benchmarks: BenchmarkData[];
  releases: ReleaseItem[];
  activity: ActivityEvent[];
}

/** Raw output from the status fetcher — history managed by data agent */
export interface RawProviderStatus {
  provider: Provider;
  status: ProviderStatus;
  lastChecked: string;
}

/** Raw output from the benchmarks fetcher */
export interface RawBenchmark {
  id: string;
  name: string;
  provider: Provider;
  mmlu: number | null;
  humaneval: number | null;
  math: number | null;
  inputPrice: number | null;
  outputPrice: number | null;
  latencyP50: number | null;
}
