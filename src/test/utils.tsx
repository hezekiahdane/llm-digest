/**
 * Custom render helper that wraps components with necessary providers.
 * Use this instead of @testing-library/react's `render` directly.
 */

import { type RenderOptions, render } from '@testing-library/react';
import type { ReactElement } from 'react';

function AllProviders({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function customRender(ui: ReactElement, options: RenderOptions = {}) {
  return render(ui, {
    wrapper: ({ children }) => <AllProviders>{children}</AllProviders>,
    ...options,
  });
}

export * from '@testing-library/react';
export { customRender as render };
