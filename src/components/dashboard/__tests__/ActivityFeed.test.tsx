import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ActivityEvent } from '@/types/dashboard';
import { ActivityFeed } from '../ActivityFeed';

const MOCK_EVENTS: ActivityEvent[] = [
  {
    id: 'e1',
    provider: 'openai',
    type: 'release',
    title: 'GPT-5 launched',
    description: 'New release.',
    date: '2026-06-25T00:00:00.000Z',
    link: 'https://openai.com',
  },
  {
    id: 'e2',
    provider: 'anthropic',
    type: 'incident',
    title: 'Anthropic API degraded',
    description: 'Incident in progress.',
    date: '2026-06-24T12:00:00.000Z',
  },
  {
    id: 'e3',
    provider: 'google',
    type: 'price_change',
    title: 'Gemini pricing updated',
    description: 'Price changed.',
    date: '2026-06-24T06:00:00.000Z',
  },
];

describe('ActivityFeed', () => {
  it('renders all events', () => {
    render(<ActivityFeed events={MOCK_EVENTS} />);
    expect(screen.getByText('GPT-5 launched')).toBeInTheDocument();
    expect(screen.getByText('Anthropic API degraded')).toBeInTheDocument();
    expect(screen.getByText('Gemini pricing updated')).toBeInTheDocument();
  });

  it('renders event type badges', () => {
    render(<ActivityFeed events={MOCK_EVENTS} />);
    expect(screen.getByText('Release')).toBeInTheDocument();
    expect(screen.getByText('Incident')).toBeInTheDocument();
    expect(screen.getByText('Price')).toBeInTheDocument();
  });

  it('renders empty state when no events', () => {
    render(<ActivityFeed events={[]} />);
    expect(screen.getByText(/no recent activity/i)).toBeInTheDocument();
  });
});
