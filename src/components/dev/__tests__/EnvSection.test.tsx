import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/utils';
import { EnvSection } from '../sections/EnvSection';

describe('EnvSection', () => {
  it('renders project name', () => {
    render(<EnvSection projectName="Wisedrive" locale="en" />);
    expect(screen.getByText('Wisedrive')).toBeDefined();
  });

  it('renders locale', () => {
    render(<EnvSection projectName="Wisedrive" locale="my" />);
    expect(screen.getByText('my')).toBeDefined();
  });

  it('renders environment label', () => {
    render(<EnvSection projectName="Wisedrive" locale="en" />);
    // NODE_ENV is 'test' in vitest — expect it to display
    expect(screen.getByText(/test|development|local/i)).toBeDefined();
  });
});
