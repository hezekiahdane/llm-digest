'use client';

import { useState } from 'react';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { BenchmarkData } from '@/types/dashboard';

type Tab = 'mmlu' | 'humaneval' | 'math' | 'latency';

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'mmlu', label: 'Quality Index' },
  { key: 'humaneval', label: 'Coding Index' },
  { key: 'math', label: 'Math' },
  { key: 'latency', label: 'Speed (ms/token)' },
];

type BenchmarkField = 'mmlu' | 'humaneval' | 'math' | 'latencyP50';

const TAB_FIELD: Record<Tab, BenchmarkField> = {
  mmlu: 'mmlu',
  humaneval: 'humaneval',
  math: 'math',
  latency: 'latencyP50',
};

interface BenchmarkPanelProps {
  benchmarks: BenchmarkData[];
}

export function BenchmarkPanel({ benchmarks }: BenchmarkPanelProps) {
  const [active, setActive] = useState<Tab>('mmlu');

  const field = TAB_FIELD[active];
  const data = benchmarks
    .map((m) => ({ name: m.name, value: m[field] }))
    .filter((d): d is { name: string; value: number } => d.value !== null)
    .sort((a, b) => b.value - a.value);

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-base font-semibold">Benchmark Performance</h2>
      <div className="mb-4 flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
              active === tab.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
          <XAxis type="number" tick={{ fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11 }}
            width={80}
          />
          <Tooltip
            formatter={(v) => (typeof v === 'number' ? v.toFixed(1) : v)}
          />
          <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
