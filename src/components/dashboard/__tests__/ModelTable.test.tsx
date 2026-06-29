import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ModelTable } from '../ModelTable';
import type { BenchmarkData } from '@/types/dashboard';

const BENCHMARKS: BenchmarkData[] = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', mmlu: 88.7, humaneval: 90.2, math: 76.6, inputPrice: 5.0, outputPrice: 20.0, latencyP50: null },
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', provider: 'anthropic', mmlu: 91.2, humaneval: 88.5, math: 80.1, inputPrice: 3.0, outputPrice: 15.0, latencyP50: null },
];

describe('ModelTable', () => {
  it('renders all model names', () => {
    render(<ModelTable benchmarks={BENCHMARKS} recommendedId={null} />);
    expect(screen.getByText('GPT-4o')).toBeInTheDocument();
    expect(screen.getByText('Claude Sonnet 4.6')).toBeInTheDocument();
  });

  it('renders star indicator for recommended model', () => {
    render(<ModelTable benchmarks={BENCHMARKS} recommendedId="gpt-4o" />);
    expect(screen.getByText('★')).toBeInTheDocument();
  });

  it('does not render star when no recommendation', () => {
    render(<ModelTable benchmarks={BENCHMARKS} recommendedId={null} />);
    expect(screen.queryByText('★')).not.toBeInTheDocument();
  });

  it('renders Best for tags', () => {
    render(<ModelTable benchmarks={BENCHMARKS} recommendedId={null} />);
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Cost-efficient')).toBeInTheDocument();
  });

  it('formats null prices as dash', () => {
    const benchmarks: BenchmarkData[] = [{ ...BENCHMARKS[0], inputPrice: null, outputPrice: null }];
    render(<ModelTable benchmarks={benchmarks} recommendedId={null} />);
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });
});
