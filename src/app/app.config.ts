import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { DEFAULT_SIMULATION_SETTINGS } from './constants/simulation.constants';
import { SIMULATION_SETTINGS } from './core/tokens/simulation-settings.token';

/** Application-wide providers for change detection and simulation defaults. */
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    { provide: SIMULATION_SETTINGS, useValue: DEFAULT_SIMULATION_SETTINGS }
  ]
};
