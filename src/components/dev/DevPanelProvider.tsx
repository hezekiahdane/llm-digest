'use client';

import { createContext, useCallback, useEffect, useState } from 'react';
import { DevPanel } from './DevPanel';
import type { DevPanelConfig } from './index';

export interface DevPanelContextValue {
  isOpen: boolean;
  togglePanel: () => void;
  debugToggles: Record<string, boolean>;
  setDebugToggle: (id: string, value: boolean) => void;
  simulatedStates: Record<string, string>;
  setSimulatedState: (id: string, state: string) => void;
  config: DevPanelConfig;
}

// Null-safe fallback returned by useDevPanel() when called outside the provider.
// The context itself is null by default (createContext(null)) for TypeScript strictness.
export const defaultDevPanelState: DevPanelContextValue = {
  isOpen: false,
  togglePanel: () => {},
  debugToggles: {},
  setDebugToggle: () => {},
  simulatedStates: {},
  setSimulatedState: () => {},
  config: { projectName: '', pages: [] },
};

export const DevPanelContext = createContext<DevPanelContextValue | null>(null);

interface DevPanelProviderProps {
  config: DevPanelConfig;
  children: React.ReactNode;
}

export function DevPanelProvider({ config, children }: DevPanelProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [debugToggles, setDebugToggles] = useState<Record<string, boolean>>({});
  const [simulatedStates, setSimulatedStates] = useState<
    Record<string, string>
  >({});

  const togglePanel = useCallback(() => setIsOpen((prev) => !prev), []);

  const setDebugToggle = useCallback((id: string, value: boolean) => {
    setDebugToggles((prev) => ({ ...prev, [id]: value }));
  }, []);

  const setSimulatedState = useCallback((id: string, state: string) => {
    setSimulatedStates((prev) => ({ ...prev, [id]: state }));
  }, []);

  // Apply debug CSS classes to document.body
  useEffect(() => {
    for (const [id, enabled] of Object.entries(debugToggles)) {
      const toggle = config.debugToggles?.find((t) => t.id === id);
      if (!toggle) continue;
      if (enabled) {
        document.body.classList.add(toggle.cssClass);
      } else {
        document.body.classList.remove(toggle.cssClass);
      }
    }
    return () => {
      for (const [id, enabled] of Object.entries(debugToggles)) {
        if (!enabled) continue;
        const toggle = config.debugToggles?.find((t) => t.id === id);
        if (toggle) document.body.classList.remove(toggle.cssClass);
      }
    };
  }, [debugToggles, config.debugToggles]);

  // Keyboard listener — backtick toggles panel. Cleaned up on unmount.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '`') togglePanel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [togglePanel]);

  return (
    <DevPanelContext.Provider
      value={{
        isOpen,
        togglePanel,
        debugToggles,
        setDebugToggle,
        simulatedStates,
        setSimulatedState,
        config,
      }}
    >
      {children}
      <DevPanel
        ctx={{
          isOpen,
          togglePanel,
          debugToggles,
          setDebugToggle,
          simulatedStates,
          setSimulatedState,
          config,
        }}
      />
    </DevPanelContext.Provider>
  );
}
