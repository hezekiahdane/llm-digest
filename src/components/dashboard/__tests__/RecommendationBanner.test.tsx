import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RecommendationBanner } from '../RecommendationBanner';
import type { Recommendation } from '@/lib/recommendation';

const REC: Recommendation = {
  modelId: 'claude-sonnet-4-6',
  modelName: 'Claude Sonnet 4.6',
  provider: 'anthropic',
  reason: 'Best price-to-performance among operational models today',
};

describe('RecommendationBanner', () => {
  it('renders model name when recommendation is provided', () => {
    render(<RecommendationBanner recommendation={REC} providerStatus="operational" />);
    expect(screen.getByText('Claude Sonnet 4.6')).toBeInTheDocument();
  });

  it('renders reason text', () => {
    render(<RecommendationBanner recommendation={REC} providerStatus="operational" />);
    expect(screen.getByText('Best price-to-performance among operational models today')).toBeInTheDocument();
  });

  it('renders fallback state when recommendation is null', () => {
    render(<RecommendationBanner recommendation={null} providerStatus="unknown" />);
    expect(screen.getByText('No recommendation available')).toBeInTheDocument();
  });

  it('renders provider status badge', () => {
    render(<RecommendationBanner recommendation={REC} providerStatus="operational" />);
    expect(screen.getByText('Operational')).toBeInTheDocument();
  });
});
