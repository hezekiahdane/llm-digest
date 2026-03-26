import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/utils';
import type { DevPanelStateSimulator } from '../index';
import { StateSimSection } from '../sections/StateSimSection';

const simulators: DevPanelStateSimulator[] = [
  {
    id: 'contactForm',
    label: 'Contact Form',
    states: ['idle', 'success', 'error'],
  },
];

describe('StateSimSection', () => {
  it('renders simulator label and all state buttons', () => {
    render(
      <StateSimSection
        simulators={simulators}
        activeStates={{}}
        onStateChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Contact Form')).toBeDefined();
    expect(screen.getByText('idle')).toBeDefined();
    expect(screen.getByText('success')).toBeDefined();
    expect(screen.getByText('error')).toBeDefined();
  });

  it('calls onStateChange with correct id and state when button clicked', () => {
    const onStateChange = vi.fn();
    render(
      <StateSimSection
        simulators={simulators}
        activeStates={{}}
        onStateChange={onStateChange}
      />,
    );
    fireEvent.click(screen.getByText('success'));
    expect(onStateChange).toHaveBeenCalledWith('contactForm', 'success');
  });

  it('highlights the active state button', () => {
    render(
      <StateSimSection
        simulators={simulators}
        activeStates={{ contactForm: 'success' }}
        onStateChange={vi.fn()}
      />,
    );
    const btn = screen.getByText('success').closest('button');
    expect(btn?.className).toContain('border-blue-500');
  });
});
