import { SITE_DIMENSIONS } from '../../../constants/simulation.constants';
import { TRUCK_STATUS } from '../../../constants/truck-status.constants';
import { DASHBOARD_TILE_STORAGE_KEY, DEFAULT_DASHBOARD_TILE_ORDER, STATUS_METRIC_CONFIG, ZONE_CLASS_BY_FILL_TOKEN } from '../../../constants/fleet-map.constants';
import { Truck } from '../../../core/models/truck.model';
import type {
  DashboardTileId,
  DashboardTileViewModel,
  FleetSummaryViewModel,
  MapTruckViewModel,
  MapZoneViewModel,
  StatusMetricViewModel,
  ZoneConfig
} from '../../../interfaces/fleet-map.interfaces';

type FleetSummaryAccumulator = {
  -readonly [Key in keyof FleetSummaryViewModel]: FleetSummaryViewModel[Key];
} & {
  speedTotal: number;
};

const EMPTY_FLEET_SUMMARY: FleetSummaryAccumulator = {
  total: 0,
  active: 0,
  avgSpeed: 0,
  loading: 0,
  hauling: 0,
  dumping: 0,
  idle: 0,
  speedTotal: 0
};

export function summarizeFleet(trucks: readonly Truck[]): FleetSummaryViewModel {
  const summary = trucks.reduce<FleetSummaryAccumulator>((accumulator, truck) => {
    accumulator.total += 1;
    accumulator.speedTotal += truck.speed;

    if (truck.status !== TRUCK_STATUS.IDLE) {
      accumulator.active += 1;
    }

    switch (truck.status) {
      case TRUCK_STATUS.LOADING:
        accumulator.loading += 1;
        break;
      case TRUCK_STATUS.HAULING:
        accumulator.hauling += 1;
        break;
      case TRUCK_STATUS.DUMPING:
        accumulator.dumping += 1;
        break;
      case TRUCK_STATUS.IDLE:
        accumulator.idle += 1;
        break;
    }

    return accumulator;
  }, { ...EMPTY_FLEET_SUMMARY });

  return {
    total: summary.total,
    active: summary.active,
    avgSpeed: summary.total ? Math.round(summary.speedTotal / summary.total) : 0,
    loading: summary.loading,
    hauling: summary.hauling,
    dumping: summary.dumping,
    idle: summary.idle
  };
}

export function createDashboardTile(tileId: DashboardTileId, summary: FleetSummaryViewModel): DashboardTileViewModel {
  switch (tileId) {
    case 'fleet-size':
      return createMetricTile(tileId, 'Fleet size', 'Total trucks on site', `${summary.total}`);
    case 'active-units':
      return createMetricTile(tileId, 'Active units', 'Currently loading, hauling, or dumping', `${summary.active}`);
    case 'average-speed':
      return createMetricTile(tileId, 'Average speed', 'Across the current fleet state', `${summary.avgSpeed} km/h`);
    case 'status-mix':
      return {
        id: tileId,
        title: 'Status mix',
        caption: 'Distribution by operational state',
        kind: 'status',
        statusMetrics: createStatusMetrics(summary)
      };
  }
}

export function createStatusMetrics(summary: FleetSummaryViewModel): StatusMetricViewModel[] {
  return STATUS_METRIC_CONFIG.map(({ label, key, className }) => ({
    label,
    value: summary[key],
    className
  }));
}

export function restoreDashboardTileOrder(savedOrder: string | null): DashboardTileId[] {
  if (!savedOrder) {
    return [...DEFAULT_DASHBOARD_TILE_ORDER];
  }

  try {
    const parsedOrder = JSON.parse(savedOrder);

    if (!Array.isArray(parsedOrder)) {
      return [...DEFAULT_DASHBOARD_TILE_ORDER];
    }

    const validOrder = parsedOrder.filter((tileId): tileId is DashboardTileId =>
      DEFAULT_DASHBOARD_TILE_ORDER.includes(tileId as DashboardTileId)
    );

    if (validOrder.length !== DEFAULT_DASHBOARD_TILE_ORDER.length) {
      return [...DEFAULT_DASHBOARD_TILE_ORDER];
    }

    const uniqueOrder = [...new Set(validOrder)];

    return uniqueOrder.length === DEFAULT_DASHBOARD_TILE_ORDER.length
      ? uniqueOrder
      : [...DEFAULT_DASHBOARD_TILE_ORDER];
  } catch {
    return [...DEFAULT_DASHBOARD_TILE_ORDER];
  }
}

export function createMapZoneViewModel(zone: ZoneConfig): MapZoneViewModel {
  return {
    label: zone.label,
    left: toPercent(zone.x, SITE_DIMENSIONS.width),
    top: toPercent(zone.y, SITE_DIMENSIONS.height),
    width: toPercent(zone.width, SITE_DIMENSIONS.width),
    height: toPercent(zone.height, SITE_DIMENSIONS.height),
    className: ZONE_CLASS_BY_FILL_TOKEN[zone.fillColorToken]
  };
}

export function createMapTruckViewModel(truck: Truck): MapTruckViewModel {
  return {
    ...truck,
    left: toPercent(truck.x, SITE_DIMENSIONS.width),
    top: toPercent(truck.y, SITE_DIMENSIONS.height),
    title: createTruckTitle(truck)
  };
}

export function createTruckTitle(truck: Pick<Truck, 'id' | 'status' | 'speed'>): string {
  return `${truck.id} - ${truck.status} - ${truck.speed} km/h`;
}

export function readDashboardTileOrder(isBrowser: boolean): DashboardTileId[] {
  return isBrowser
    ? restoreDashboardTileOrder(localStorage.getItem(DASHBOARD_TILE_STORAGE_KEY))
    : [...DEFAULT_DASHBOARD_TILE_ORDER];
}

export function writeDashboardTileOrder(isBrowser: boolean, tileOrder: readonly DashboardTileId[]): void {
  if (!isBrowser) {
    return;
  }

  localStorage.setItem(DASHBOARD_TILE_STORAGE_KEY, JSON.stringify(tileOrder));
}

function createMetricTile(
  id: Exclude<DashboardTileId, 'status-mix'>,
  title: string,
  caption: string,
  value: string
): DashboardTileViewModel {
  return {
    id,
    title,
    caption,
    kind: 'metric',
    value
  };
}

export function toPercent(value: number, max: number): number {
  return (value / max) * 100;
}
