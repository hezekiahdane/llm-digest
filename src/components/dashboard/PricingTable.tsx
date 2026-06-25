import type { BenchmarkData } from '@/types/dashboard';

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  meta: 'Meta',
};

const PROVIDER_COLORS: Record<string, string> = {
  openai: 'bg-emerald-100 text-emerald-800',
  anthropic: 'bg-orange-100 text-orange-800',
  google: 'bg-blue-100 text-blue-800',
  meta: 'bg-purple-100 text-purple-800',
};

function formatPrice(price: number | null): string {
  if (price === null) return '—';
  return `$${price.toFixed(2)}`;
}

interface PricingTableProps {
  benchmarks: BenchmarkData[];
}

export function PricingTable({ benchmarks }: PricingTableProps) {
  const sorted = [...benchmarks].sort((a, b) =>
    a.provider.localeCompare(b.provider),
  );

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <div className="border-b px-4 py-3">
        <h2 className="text-base font-semibold">Pricing per 1M Tokens</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
              <th className="px-4 py-2 font-medium">Provider</th>
              <th className="px-4 py-2 font-medium">Model</th>
              <th className="px-4 py-2 text-right font-medium">Input</th>
              <th className="px-4 py-2 text-right font-medium">Output</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((m) => (
              <tr
                key={m.id}
                className="border-b last:border-0 hover:bg-muted/30"
              >
                <td className="px-4 py-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs font-medium ${PROVIDER_COLORS[m.provider] ?? 'bg-gray-100 text-gray-800'}`}
                  >
                    {PROVIDER_LABELS[m.provider] ?? m.provider}
                  </span>
                </td>
                <td className="px-4 py-2 font-medium">{m.name}</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {formatPrice(m.inputPrice)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {formatPrice(m.outputPrice)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
