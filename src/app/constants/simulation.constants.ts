import { TRUCK_STATUS } from './truck-status.constants';

/** Supported route destinations used by the simulation engine. */
export type SimulationDestination = 'dump' | 'load';

/** Cartesian point on the static operations map. */
export interface SimulationPoint {
  readonly x: number;
  readonly y: number;
}

/** Rectangular zone definition used for loading and dump areas. */
export interface SimulationZone {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** Fixed map dimensions for coordinate-to-percentage conversions. */
export interface SiteDimensions {
  readonly width: number;
  readonly height: number;
}

/** Runtime settings that can be adjusted from the simulation toolbar. */
export interface SimulationSettings {
  readonly truckCount: number;
  readonly tickMs: number;
  readonly dumpDwellTicks: number;
}

/** Default timer cadence for the simulation loop. */
export const SIMULATION_TICK_MS = 1000;
/** Initial number of trucks created when the app starts. */
export const INITIAL_TRUCK_COUNT = 3;
/** Number of ticks a truck remains in the dump zone before returning. */
export const DUMP_DWELL_TICKS = 3;
export const DUMP_RECENTER_FACTOR = 0.1;
export const DUMP_RECENTER_JITTER = 5;
export const WAYPOINT_PROXIMITY_THRESHOLD = 25;
export const DUMP_ROUTE_MOVEMENT_FACTOR = 0.6;
export const LOAD_ROUTE_MOVEMENT_FACTOR = 0.5;
export const RETURN_IDLE_CHANCE = 0.2;

/** Randomized spawn range for initial truck X coordinates. */
export const INITIAL_X_RANGE = { min: 100, max: 900 } as const;
/** Randomized spawn range for initial truck Y coordinates. */
export const INITIAL_Y_RANGE = { min: 100, max: 700 } as const;
/** Initial movement speed range for trucks that start in motion. */
export const INITIAL_MOVING_SPEED_RANGE = { min: 20, max: 60 } as const;
/** Active movement speed range for trucks traveling between zones. */
export const ACTIVE_SPEED_RANGE = { min: 25, max: 60 } as const;
/** Positional jitter applied while a truck is dwelling in the dump zone. */
export const JITTER_RANGE = { min: -DUMP_RECENTER_JITTER, max: DUMP_RECENTER_JITTER } as const;

/** Canvas dimensions for the static map presentation. */
export const SITE_DIMENSIONS: SiteDimensions = {
  width: 1000,
  height: 800
};

/** Loading area shown on the operations map. */
export const LOADING_ZONE: SimulationZone = { x: 80, y: 80, w: 160, h: 160 };
/** Dump area shown on the operations map. */
export const DUMP_ZONE: SimulationZone = { x: 820, y: 580, w: 160, h: 160 };

/** Waypoints used while trucks travel from the loading zone to the dump zone. */
export const HAUL_ROAD_TO_DUMP: readonly SimulationPoint[] = [
  { x: 160, y: 160 },
  { x: 220, y: 180 },
  { x: 290, y: 210 },
  { x: 360, y: 250 },
  { x: 430, y: 300 },
  { x: 500, y: 360 },
  { x: 570, y: 420 },
  { x: 640, y: 480 },
  { x: 710, y: 540 },
  { x: 780, y: 590 },
  { x: 850, y: 630 },
  { x: 900, y: 660 }
];

/** Waypoints used while trucks travel from the dump zone back to loading. */
export const HAUL_ROAD_TO_LOAD: readonly SimulationPoint[] = [
  { x: 900, y: 660 },
  { x: 830, y: 620 },
  { x: 760, y: 570 },
  { x: 690, y: 510 },
  { x: 620, y: 450 },
  { x: 550, y: 380 },
  { x: 480, y: 320 },
  { x: 410, y: 270 },
  { x: 340, y: 230 },
  { x: 270, y: 200 },
  { x: 200, y: 170 },
  { x: 160, y: 160 }
];

/** Seed statuses used to vary the starting simulation state. */
export const INITIAL_STATUSES = [
  TRUCK_STATUS.LOADING,
  TRUCK_STATUS.HAULING,
  TRUCK_STATUS.IDLE,
  TRUCK_STATUS.DUMPING
] as const;

/** Range limits for simulation settings exposed in the toolbar controls. */
export const SIMULATION_SETTING_LIMITS = {
  truckCount: { min: 1, max: 12, step: 1 },
  tickMs: { min: 300, max: 2000, step: 100 },
  dumpDwellTicks: { min: 1, max: 8, step: 1 }
} as const;

/** Default toolbar settings supplied through dependency injection. */
export const DEFAULT_SIMULATION_SETTINGS: SimulationSettings = {
  truckCount: INITIAL_TRUCK_COUNT,
  tickMs: SIMULATION_TICK_MS,
  dumpDwellTicks: DUMP_DWELL_TICKS
};
