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
  StatusFilterOptionViewModel,
  StatusMetricViewModel,
  ZoneConfig
} from '../../../interfaces/fleet-map.interfaces';

/** Mutable accumulator used while reducing a fleet into summary metrics. */
type FleetSummaryAccumulator = {
  -readonly [Key in keyof FleetSummaryViewModel]: FleetSummaryViewModel[Key];
} & {
  speedTotal: number;
};

/** Empty accumulator seed used for fleet summary reduction. */
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

/** Aggregates a truck list into dashboard summary metrics. */
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

/** Creates the summary tile view model for a given tile identifier. */
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

/** Maps fleet summary data into the status metric cards shown in the status tile. */
export function createStatusMetrics(summary: FleetSummaryViewModel): StatusMetricViewModel[] {
  return STATUS_METRIC_CONFIG.map(({ label, key, className }) => ({
    label,
    value: summary[key],
    className
  }));
}

/** Restores a saved tile order while validating completeness and uniqueness. */
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

/** Converts a raw zone configuration into percentage-based map coordinates. */
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

/** Converts a truck model into a percentage-based map marker view model. */
export function createMapTruckViewModel(truck: Truck): MapTruckViewModel {
  return {
    ...truck,
    left: toPercent(truck.x, SITE_DIMENSIONS.width),
    top: toPercent(truck.y, SITE_DIMENSIONS.height),
    title: createTruckTitle(truck)
  };
}

/** Builds an accessible marker label for a truck on the map. */
export function createTruckTitle(truck: Pick<Truck, 'id' | 'status' | 'speed'>): string {
  return `${truck.id} - ${truck.status} - ${truck.speed} km/h`;
}

/** Filters trucks by search term and active status selection. */
export function filterTrucks(
  trucks: readonly Truck[],
  searchTerm: string,
  activeStatuses: readonly Truck['status'][]
): Truck[] {
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const allowedStatuses = new Set(activeStatuses);

  return trucks.filter(truck => {
    const matchesSearch = !normalizedSearchTerm || truck.id.toLowerCase().includes(normalizedSearchTerm);
    const matchesStatus = allowedStatuses.has(truck.status);
    return matchesSearch && matchesStatus;
  });
}

/** Creates the status filter chip view models from current fleet state. */
export function createStatusFilterOptions(
  trucks: readonly Truck[],
  activeStatuses: readonly Truck['status'][]
): StatusFilterOptionViewModel[] {
  const activeStatusSet = new Set(activeStatuses);

  return STATUS_METRIC_CONFIG.map(({ label, key, className }) => {
    const status = key.toUpperCase() as Truck['status'];
    return {
      status,
      label,
      count: trucks.filter(truck => truck.status === status).length,
      active: activeStatusSet.has(status),
      className
    };
  });
}

/** Reads the persisted dashboard tile order in browser environments. */
export function readDashboardTileOrder(isBrowser: boolean): DashboardTileId[] {
  return isBrowser
    ? restoreDashboardTileOrder(localStorage.getItem(DASHBOARD_TILE_STORAGE_KEY))
    : [...DEFAULT_DASHBOARD_TILE_ORDER];
}

  /** Persists the dashboard tile order when local storage is available. */
export function writeDashboardTileOrder(isBrowser: boolean, tileOrder: readonly DashboardTileId[]): void {
  if (!isBrowser) {
    return;
  }

  localStorage.setItem(DASHBOARD_TILE_STORAGE_KEY, JSON.stringify(tileOrder));
}

/** Creates a simple metric-style summary tile view model. */
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

/** Converts an absolute coordinate into a percentage of the supplied maximum. */
export function toPercent(value: number, max: number): number {
  return (value / max) * 100;
}
