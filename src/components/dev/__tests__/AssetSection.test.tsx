import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/utils';
import type { DevPanelAsset } from '../index';
import { AssetSection } from '../sections/AssetSection';

const assets: DevPanelAsset[] = [
  { label: 'Hero Image', value: '/hero/wisedrive-hero.jpg' },
];

describe('AssetSection', () => {
  it('renders asset label', () => {
    render(<AssetSection assets={assets} />);
    expect(screen.getByText('Hero Image')).toBeDefined();
  });

  it('renders asset value path', () => {
    render(<AssetSection assets={assets} />);
    expect(screen.getByText('/hero/wisedrive-hero.jpg')).toBeDefined();
  });
});
