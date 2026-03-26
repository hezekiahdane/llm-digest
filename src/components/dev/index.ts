export type PageStatus = 'active' | 'done' | 'wip' | 'todo';

export interface DevPanelPage {
  label: string;
  path: string;
  status: PageStatus;
}

export interface DevPanelDebugToggle {
  id: string;
  label: string;
  cssClass: string;
}

export interface DevPanelStateSimulator {
  id: string;
  label: string;
  states: string[];
}

export interface DevPanelAsset {
  label: string;
  value: string;
}

export interface DevPanelConfig {
  projectName: string;
  pages: DevPanelPage[];
  debugToggles?: DevPanelDebugToggle[];
  stateSimulators?: DevPanelStateSimulator[];
  assets?: DevPanelAsset[];
}

export { DevPanel } from './DevPanel';
export type { DevPanelContextValue } from './DevPanelProvider';
export { DevPanelProvider } from './DevPanelProvider';
export { useDevPanel } from './useDevPanel';
