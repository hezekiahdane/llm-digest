import type { ActivityEvent, ActivityEventType } from '@/types/dashboard';

const TYPE_LABEL: Record<ActivityEventType, string> = {
  release: 'Release',
  incident: 'Incident',
  incident_resolved: 'Resolved',
  price_change: 'Price',
  benchmark_change: 'Benchmark',
};

const TYPE_COLOR: Record<ActivityEventType, string> = {
  release: 'bg-blue-100 text-blue-800',
  incident: 'bg-red-100 text-red-800',
  incident_resolved: 'bg-green-100 text-green-800',
  price_change: 'bg-yellow-100 text-yellow-800',
  benchmark_change: 'bg-purple-100 text-purple-800',
};

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  meta: 'Meta',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface ActivityFeedProps {
  events: ActivityEvent[];
}

export function ActivityFeed({ events }: ActivityFeedProps) {
  if (events.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-3 text-base font-semibold">Recent Activity</h2>
        <p className="text-sm text-muted-foreground">
          No recent activity to display.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <div className="border-b px-4 py-3">
        <h2 className="text-base font-semibold">Recent Activity</h2>
      </div>
      <ul className="divide-y">
        {events.map((event) => (
          <li key={event.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs font-medium ${TYPE_COLOR[event.type]}`}
                  >
                    {TYPE_LABEL[event.type]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {PROVIDER_LABELS[event.provider] ?? event.provider}
                  </span>
                </div>
                {event.link ? (
                  <a
                    href={event.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium hover:underline"
                  >
                    {event.title}
                  </a>
                ) : (
                  <p className="text-sm font-medium">{event.title}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {event.description}
                </p>
              </div>
              <time className="shrink-0 text-xs text-muted-foreground">
                {formatDate(event.date)}
              </time>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
