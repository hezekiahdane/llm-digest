import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ProviderStatusData } from '@/types/dashboard';
import { StatusGrid } from '../StatusGrid';

const MOCK_STATUSES: ProviderStatusData[] = [
  {
    provider: 'openai',
    status: 'operational',
    uptime30d: 99.9,
    lastChecked: '2026-06-25T00:00:00.000Z',
    history: [],
  },
  {
    provider: 'anthropic',
    status: 'degraded',
    uptime30d: 95.0,
    lastChecked: '2026-06-25T00:00:00.000Z',
    history: [],
  },
  {
    provider: 'google',
    status: 'outage',
    uptime30d: 88.0,
    lastChecked: '2026-06-25T00:00:00.000Z',
    history: [],
  },
];

describe('StatusGrid', () => {
  it('renders a card for each provider', () => {
    render(<StatusGrid statuses={MOCK_STATUSES} />);
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
    expect(screen.getByText('Anthropic')).toBeInTheDocument();
    expect(screen.getByText('Google')).toBeInTheDocument();
  });

  it('displays uptime percentages', () => {
    render(<StatusGrid statuses={MOCK_STATUSES} />);
    expect(screen.getByText(/99\.9.*uptime/i)).toBeInTheDocument();
  });

  it('shows operational status label', () => {
    render(<StatusGrid statuses={MOCK_STATUSES} />);
    expect(screen.getByText('Operational')).toBeInTheDocument();
  });

  it('shows degraded status label', () => {
    render(<StatusGrid statuses={MOCK_STATUSES} />);
    expect(screen.getByText('Degraded')).toBeInTheDocument();
  });

  it('shows outage status label', () => {
    render(<StatusGrid statuses={MOCK_STATUSES} />);
    expect(screen.getByText('Outage')).toBeInTheDocument();
  });
});
