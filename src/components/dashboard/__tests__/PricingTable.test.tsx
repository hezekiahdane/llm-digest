import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { BenchmarkData } from '@/types/dashboard';
import { PricingTable } from '../PricingTable';

const MOCK_BENCHMARKS: BenchmarkData[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    mmlu: 88.7,
    humaneval: 90.2,
    math: 76.6,
    inputPrice: 2.5,
    outputPrice: 10.0,
    latencyP50: 450,
  },
  {
    id: 'claude-sonnet-4-6',
    name: 'Claude Sonnet 4.6',
    provider: 'anthropic',
    mmlu: 91.2,
    humaneval: null,
    math: null,
    inputPrice: 3.0,
    outputPrice: 15.0,
    latencyP50: null,
  },
];

describe('PricingTable', () => {
  it('renders a row for each model', () => {
    render(<PricingTable benchmarks={MOCK_BENCHMARKS} />);
    expect(screen.getByText('GPT-4o')).toBeInTheDocument();
    expect(screen.getByText('Claude Sonnet 4.6')).toBeInTheDocument();
  });

  it('formats prices with dollar sign', () => {
    render(<PricingTable benchmarks={MOCK_BENCHMARKS} />);
    expect(screen.getByText('$2.50')).toBeInTheDocument();
    expect(screen.getByText('$10.00')).toBeInTheDocument();
  });

  it('shows dash for null prices', () => {
    const noPrice = [
      { ...MOCK_BENCHMARKS[0], inputPrice: null, outputPrice: null },
    ];
    render(<PricingTable benchmarks={noPrice} />);
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });
});
