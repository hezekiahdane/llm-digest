import type { DevPanelConfig } from '@/components/dev';

/**
 * Dev Panel configuration for this project.
 * Replace the pages array with your actual routes and statuses.
 * All sections except `pages` are optional — remove what you don't need.
 */
export const devPanelConfig: DevPanelConfig = {
  projectName: 'My App',

  pages: [{ label: 'Homepage', path: '/', status: 'active' }],

  debugToggles: [
    { id: 'outlines', label: 'Debug outlines', cssClass: 'debug-outlines' },
    { id: 'grid', label: 'Grid overlay', cssClass: 'debug-grid' },
    { id: 'breakpoint', label: 'Show breakpoint', cssClass: 'debug-bp' },
  ],

  // stateSimulators: [],  // Uncomment and configure per project
  // assets: [],           // Uncomment and configure per project
};
