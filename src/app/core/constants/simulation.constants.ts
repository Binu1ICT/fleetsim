import { TRUCK_STATUS } from './truck-status.constants';

export type SimulationDestination = 'dump' | 'load';

export interface SimulationPoint {
  readonly x: number;
  readonly y: number;
}

export interface SimulationZone {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export const SIMULATION_TICK_MS = 1000;
export const INITIAL_TRUCK_COUNT = 3;
export const DUMP_DWELL_TICKS = 3;
export const DUMP_RECENTER_FACTOR = 0.1;
export const DUMP_RECENTER_JITTER = 5;
export const WAYPOINT_PROXIMITY_THRESHOLD = 25;
export const DUMP_ROUTE_MOVEMENT_FACTOR = 0.6;
export const LOAD_ROUTE_MOVEMENT_FACTOR = 0.5;
export const RETURN_IDLE_CHANCE = 0.2;

export const INITIAL_X_RANGE = { min: 100, max: 900 } as const;
export const INITIAL_Y_RANGE = { min: 100, max: 700 } as const;
export const INITIAL_MOVING_SPEED_RANGE = { min: 20, max: 60 } as const;
export const ACTIVE_SPEED_RANGE = { min: 25, max: 60 } as const;
export const JITTER_RANGE = { min: -DUMP_RECENTER_JITTER, max: DUMP_RECENTER_JITTER } as const;

export const LOADING_ZONE: SimulationZone = { x: 80, y: 80, w: 160, h: 160 };
export const DUMP_ZONE: SimulationZone = { x: 820, y: 580, w: 160, h: 160 };

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

export const INITIAL_STATUSES = [
  TRUCK_STATUS.LOADING,
  TRUCK_STATUS.HAULING,
  TRUCK_STATUS.IDLE,
  TRUCK_STATUS.DUMPING
] as const;
