import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WhatChanged } from '../WhatChanged';
import type { ActivityEvent } from '@/types/dashboard';

const NOW = new Date().toISOString();

const EVENTS: ActivityEvent[] = [
  { id: '1', provider: 'openai', type: 'release', title: 'GPT-5 released', description: '', date: NOW, link: 'https://example.com' },
  { id: '2', provider: 'anthropic', type: 'incident', title: 'API degraded', description: '', date: NOW },
];

describe('WhatChanged', () => {
  it('renders event titles', () => {
    render(<WhatChanged events={EVENTS} />);
    expect(screen.getByText('GPT-5 released')).toBeInTheDocument();
    expect(screen.getByText('API degraded')).toBeInTheDocument();
  });

  it('renders event type badges', () => {
    render(<WhatChanged events={EVENTS} />);
    expect(screen.getByText('New Model')).toBeInTheDocument();
    expect(screen.getByText('Incident')).toBeInTheDocument();
  });

  it('renders empty state when no events', () => {
    render(<WhatChanged events={[]} />);
    expect(screen.getByText('No changes in the last 7 days.')).toBeInTheDocument();
  });

  it('renders link for events with link', () => {
    render(<WhatChanged events={EVENTS} />);
    const link = screen.getByRole('link', { name: 'GPT-5 released' });
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('caps at 6 items', () => {
    const many: ActivityEvent[] = Array.from({ length: 10 }, (_, i) => ({
      id: String(i), provider: 'openai' as const, type: 'release' as const,
      title: `Release ${i}`, description: '', date: NOW,
    }));
    render(<WhatChanged events={many} />);
    const items = screen.getAllByText(/Release \d/);
    expect(items).toHaveLength(6);
  });
});
