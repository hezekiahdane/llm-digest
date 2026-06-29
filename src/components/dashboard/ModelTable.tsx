import { PROVIDER_LABELS } from '@/lib/constants';
import type { BenchmarkData } from '@/types/dashboard';

const BEST_FOR: Record<string, string> = {
  o3: 'Reasoning',
  'gpt-4.1': 'Coding',
  'gpt-4o': 'General',
  'claude-opus-4': 'Writing',
  'claude-sonnet-4-6': 'Cost-efficient',
  'gemini-2.5-pro': 'Multimodal',
  'gemini-2.5-flash': 'Speed',
};

const PROVIDER_DOT: Record<string, string> = {
  openai: 'bg-emerald-400',
  anthropic: 'bg-orange-400',
  google: 'bg-blue-400',
};

function formatPrice(price: number | null): string {
  if (price === null) return '—';
  return `$${price.toFixed(2)}`;
}

function formatMmlu(score: number | null): string {
  if (score === null) return '—';
  return score.toFixed(1);
}

interface ModelTableProps {
  benchmarks: BenchmarkData[];
  recommendedId: string | null;
}

export function ModelTable({ benchmarks, recommendedId }: ModelTableProps) {
  return (
    <div className="overflow-hidden rounded-xl bg-slate-900">
      <div className="border-b border-slate-800 px-5 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
          Model Comparison
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left text-xs text-slate-500">
              <th className="px-5 py-3 font-medium">Model</th>
              <th className="px-5 py-3 font-medium">Provider</th>
              <th className="px-5 py-3 text-right font-medium">Input $/M</th>
              <th className="px-5 py-3 text-right font-medium">Output $/M</th>
              <th className="px-5 py-3 text-right font-medium">MMLU</th>
              <th className="px-5 py-3 font-medium">Best for</th>
            </tr>
          </thead>
          <tbody>
            {benchmarks.map((m) => (
              <tr
                key={m.id}
                className={`border-b border-slate-800 last:border-0 ${
                  m.id === recommendedId
                    ? 'bg-indigo-500/5 ring-1 ring-inset ring-indigo-500/40'
                    : 'hover:bg-slate-800/50'
                }`}
              >
                <td className="px-5 py-3 font-medium text-white">
                  {m.id === recommendedId && (
                    <span className="mr-1.5 text-indigo-400">★</span>
                  )}
                  {m.name}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${PROVIDER_DOT[m.provider] ?? 'bg-slate-500'}`}
                    />
                    <span className="text-slate-400">
                      {PROVIDER_LABELS[m.provider] ?? m.provider}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-slate-300">
                  {formatPrice(m.inputPrice)}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-slate-300">
                  {formatPrice(m.outputPrice)}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-slate-300">
                  {formatMmlu(m.mmlu)}
                </td>
                <td className="px-5 py-3">
                  <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-300">
                    {BEST_FOR[m.id] ?? '—'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
