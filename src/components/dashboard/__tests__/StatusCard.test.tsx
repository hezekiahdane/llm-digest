import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusCard } from '../StatusCard';
import type { ProviderStatusData } from '@/types/dashboard';

const BASE: ProviderStatusData = {
  provider: 'openai',
  status: 'operational',
  uptime30d: 99.9,
  lastChecked: '2026-06-29T00:00:00Z',
  history: [],
};

describe('StatusCard', () => {
  it('renders provider label', () => {
    render(<StatusCard data={BASE} />);
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
  });

  it('renders operational status', () => {
    render(<StatusCard data={BASE} />);
    expect(screen.getByText('Operational')).toBeInTheDocument();
  });

  it('renders degraded status', () => {
    render(<StatusCard data={{ ...BASE, status: 'degraded' }} />);
    expect(screen.getByText('Degraded')).toBeInTheDocument();
  });

  it('shows no-history message when history is empty', () => {
    render(<StatusCard data={{ ...BASE, history: [] }} />);
    expect(screen.getByText('No history yet')).toBeInTheDocument();
  });

  it('renders sparkline dots for last 7 history entries', () => {
    const history = Array.from({ length: 10 }, (_, i) => ({
      timestamp: `2026-06-2${i}T00:00:00Z`,
      status: 'operational' as const,
    }));
    render(<StatusCard data={{ ...BASE, history }} />);
    // Should render 7 dots (last 7 of 10)
    const dots = document.querySelectorAll('[title]');
    expect(dots).toHaveLength(7);
  });
});
