import { InjectionToken } from '@angular/core';
import { DEFAULT_SIMULATION_SETTINGS, type SimulationSettings } from '../../constants/simulation.constants';

/** Injection token that exposes default runtime simulation settings. */
export const SIMULATION_SETTINGS = new InjectionToken<SimulationSettings>('SIMULATION_SETTINGS', {
  factory: () => DEFAULT_SIMULATION_SETTINGS
});
