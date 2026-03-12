import { Truck } from '../core/models/truck.model';

export interface ZoneConfig {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly label: string;
  readonly fillColorToken: string;
}

export type DashboardTileId = 'fleet-size' | 'active-units' | 'average-speed' | 'status-mix';
export type StatusSummaryKey = 'loading' | 'hauling' | 'dumping' | 'idle';

export interface FleetSummaryViewModel {
  readonly total: number;
  readonly active: number;
  readonly avgSpeed: number;
  readonly loading: number;
  readonly hauling: number;
  readonly dumping: number;
  readonly idle: number;
}

export interface StatusMetricViewModel {
  readonly label: string;
  readonly value: number;
  readonly className: string;
}

export interface LegendItemViewModel {
  readonly label: string;
  readonly markerClass: string;
}

export interface StatusMetricConfig {
  readonly label: string;
  readonly key: StatusSummaryKey;
  readonly className: string;
  readonly markerClass: string;
}

export interface DashboardTileViewModel {
  readonly id: DashboardTileId;
  readonly title: string;
  readonly caption: string;
  readonly kind: 'metric' | 'status';
  readonly value?: string;
  readonly statusMetrics?: readonly StatusMetricViewModel[];
}

export interface MapZoneViewModel {
  readonly label: string;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  readonly className: string;
}

export interface MapTruckViewModel extends Truck {
  readonly left: number;
  readonly top: number;
  readonly title: string;
}
