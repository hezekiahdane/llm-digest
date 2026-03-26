'use client';

import type { DevPanelStateSimulator } from '../index';

interface StateSimSectionProps {
  simulators: DevPanelStateSimulator[];
  activeStates: Record<string, string>;
  onStateChange: (id: string, state: string) => void;
}

export function StateSimSection({
  simulators,
  activeStates,
  onStateChange,
}: StateSimSectionProps) {
  return (
    <div className="border-b border-neutral-800 py-2">
      <p className="px-4 pb-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-600">
        State Simulator
      </p>
      {simulators.map((sim) => (
        <div key={sim.id} className="px-4 pb-2">
          <p className="mb-1.5 text-[10px] uppercase tracking-wider text-neutral-600">
            {sim.label}
          </p>
          <div className="flex gap-1">
            {sim.states.map((state) => {
              const isActive = activeStates[sim.id] === state;
              return (
                <button
                  key={state}
                  type="button"
                  onClick={() => onStateChange(sim.id, state)}
                  className={`flex-1 rounded border px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                    isActive
                      ? 'border-blue-500 bg-blue-900/30 text-blue-300'
                      : 'border-neutral-700 bg-neutral-800 text-neutral-500 hover:border-neutral-600'
                  }`}
                >
                  {state}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
