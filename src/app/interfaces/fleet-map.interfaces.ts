import { Truck, TruckStatus } from '../core/models/truck.model';

/** Authoring-time zone configuration before it is converted for map rendering. */
export interface ZoneConfig {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly label: string;
  readonly fillColorToken: string;
}

/** Identifiers for the draggable summary tiles shown on the dashboard. */
export type DashboardTileId = 'fleet-size' | 'active-units' | 'average-speed' | 'status-mix';
/** Fleet summary keys used to map metrics into view models. */
export type StatusSummaryKey = 'loading' | 'hauling' | 'dumping' | 'idle';
/** Supported shell theme modes. */
export type ThemeMode = 'light' | 'dark';
/** Supported density modes for document-level spacing tokens. */
export type DensityMode = 'comfortable' | 'compact';
/** Supported contrast modes for document-level accessibility tokens. */
export type ContrastMode = 'default' | 'high';

/** Aggregate metrics displayed across the summary tiles. */
export interface FleetSummaryViewModel {
  readonly total: number;
  readonly active: number;
  readonly avgSpeed: number;
  readonly loading: number;
  readonly hauling: number;
  readonly dumping: number;
  readonly idle: number;
}

/** Small status metric displayed inside the status mix tile. */
export interface StatusMetricViewModel {
  readonly label: string;
  readonly value: number;
  readonly className: string;
}

/** Legend entry shown inside the status legend accordion. */
export interface LegendItemViewModel {
  readonly label: string;
  readonly markerClass: string;
}

/** Shared metadata used to derive status-specific UI elements. */
export interface StatusMetricConfig {
  readonly label: string;
  readonly key: StatusSummaryKey;
  readonly className: string;
  readonly markerClass: string;
}

/** View model for an individual dashboard summary tile. */
export interface DashboardTileViewModel {
  readonly id: DashboardTileId;
  readonly title: string;
  readonly caption: string;
  readonly kind: 'metric' | 'status';
  readonly value?: string;
  readonly statusMetrics?: readonly StatusMetricViewModel[];
}

/** Payload emitted when a summary tile is reordered. */
export interface DashboardTileMove {
  readonly previousIndex: number;
  readonly currentIndex: number;
  readonly title?: string;
}

/** Presentation model for a rendered site zone on the map canvas. */
export interface MapZoneViewModel {
  readonly label: string;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  readonly className: string;
}

/** Presentation model for a truck marker rendered on the map canvas. */
export interface MapTruckViewModel extends Truck {
  readonly left: number;
  readonly top: number;
  readonly title: string;
}

/** View model for a toolbar status filter chip. */
export interface StatusFilterOptionViewModel {
  readonly status: TruckStatus;
  readonly label: string;
  readonly count: number;
  readonly active: boolean;
  readonly className: string;
}

/** Narrow settings contract passed into the simulation toolbar. */
export interface SimulationSettingsViewModel {
  readonly truckCount: number;
  readonly tickMs: number;
  readonly dumpDwellTicks: number;
}
