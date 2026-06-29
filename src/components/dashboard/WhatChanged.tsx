import { PROVIDER_LABELS } from '@/lib/constants';
import type { ActivityEvent, ActivityEventType } from '@/types/dashboard';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const TYPE_LABEL: Record<ActivityEventType, string> = {
  release: 'New Model',
  incident: 'Incident',
  incident_resolved: 'Resolved',
  price_change: 'Price Change',
  benchmark_change: 'Benchmark',
};

const TYPE_COLOR: Record<ActivityEventType, string> = {
  release: 'bg-indigo-500/20 text-indigo-400',
  incident: 'bg-red-500/20 text-red-400',
  incident_resolved: 'bg-emerald-500/20 text-emerald-400',
  price_change: 'bg-amber-500/20 text-amber-400',
  benchmark_change: 'bg-purple-500/20 text-purple-400',
};

const PROVIDER_DOT: Record<string, string> = {
  openai: 'bg-emerald-400',
  anthropic: 'bg-orange-400',
  google: 'bg-blue-400',
};

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface WhatChangedProps {
  events: ActivityEvent[];
}

export function WhatChanged({ events }: WhatChangedProps) {
  const cutoff = Date.now() - SEVEN_DAYS_MS;
  const filtered = events
    .filter((e) => new Date(e.date).getTime() >= cutoff)
    .slice(0, 6);

  return (
    <div className="overflow-hidden rounded-xl bg-slate-900">
      <div className="border-b border-slate-800 px-5 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
          What Changed
        </h2>
      </div>
      {filtered.length === 0 ? (
        <p className="px-5 py-6 text-sm text-slate-600">
          No changes in the last 7 days.
        </p>
      ) : (
        <ul className="divide-y divide-slate-800">
          {filtered.map((event) => (
            <li
              key={event.id}
              className="flex items-start justify-between gap-4 px-5 py-4"
            >
              <div className="flex min-w-0 flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 flex-shrink-0 rounded-full ${PROVIDER_DOT[event.provider] ?? 'bg-slate-500'}`}
                  />
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLOR[event.type]}`}
                  >
                    {TYPE_LABEL[event.type]}
                  </span>
                  <span className="text-xs text-slate-600">
                    {PROVIDER_LABELS[event.provider] ?? event.provider}
                  </span>
                </div>
                {event.link ? (
                  <a
                    href={event.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-sm font-medium text-slate-200 hover:text-white"
                  >
                    {event.title}
                  </a>
                ) : (
                  <p className="truncate text-sm font-medium text-slate-200">
                    {event.title}
                  </p>
                )}
              </div>
              <time className="shrink-0 text-xs text-slate-600">
                {relativeTime(event.date)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
