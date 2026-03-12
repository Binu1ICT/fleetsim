import { DUMP_ZONE, LOADING_ZONE, SimulationZone } from './simulation.constants';
import {
  DashboardTileId,
  LegendItemViewModel,
  StatusMetricConfig,
  ZoneConfig
} from '../interfaces/fleet-map.interfaces';

/** Default visual order for the summary KPI tiles. */
export const DEFAULT_DASHBOARD_TILE_ORDER: readonly DashboardTileId[] = [
  'fleet-size',
  'active-units',
  'average-speed',
  'status-mix'
];

/** Local storage key used to persist the summary tile order. */
export const DASHBOARD_TILE_STORAGE_KEY = 'fleet-map.dashboard-tile-order';

/** Metadata used to build status mix tiles and status filter chips. */
export const STATUS_METRIC_CONFIG: readonly StatusMetricConfig[] = [
  {
    label: 'Loading',
    key: 'loading',
    className: 'status--loading',
    markerClass: 'legend-marker-circle--loading'
  },
  {
    label: 'Hauling',
    key: 'hauling',
    className: 'status--hauling',
    markerClass: 'legend-marker-circle--hauling'
  },
  {
    label: 'Dumping',
    key: 'dumping',
    className: 'status--dumping',
    markerClass: 'legend-marker-circle--dumping'
  },
  {
    label: 'Idle',
    key: 'idle',
    className: 'status--idle',
    markerClass: 'legend-marker-circle--idle'
  }
];

/** Legend entries derived from the shared status metadata. */
export const LEGEND_ITEMS: readonly LegendItemViewModel[] = STATUS_METRIC_CONFIG.map(({ label, markerClass }) => ({
  label: label.toUpperCase(),
  markerClass
}));

/** CSS class mapping for zone styling tokens on the static map. */
export const ZONE_CLASS_BY_FILL_TOKEN: Record<ZoneConfig['fillColorToken'], string> = {
  '--map-zone-loading-fill': 'map-zone-card--loading',
  '--map-zone-dump-fill': 'map-zone-card--dumping'
};

/** Creates a normalized zone configuration from simulation coordinates. */
function createZoneConfig(zone: SimulationZone, label: string, fillColorToken: ZoneConfig['fillColorToken']): ZoneConfig {
  return {
    x: zone.x,
    y: zone.y,
    width: zone.w,
    height: zone.h,
    label,
    fillColorToken
  };
}

/** Static map zones rendered in the fleet map canvas. */
export const MAP_ZONES: readonly ZoneConfig[] = [
  createZoneConfig(LOADING_ZONE, 'Stockpile Lot 1', '--map-zone-loading-fill'),
  createZoneConfig(DUMP_ZONE, 'Stockpile Lot 2', '--map-zone-dump-fill')
];
