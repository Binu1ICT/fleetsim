import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDragPlaceholder, CdkDragPreview, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { SimulationService } from '../../../core/services/simulation.service';
import { FleetStore } from '../../../core/store/fleet.store';
import { TRUCK_STATUS } from '../../../core/constants/truck-status.constants';
import { Truck } from '../../../core/models/truck.model';

interface ZoneConfig {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly label: string;
  readonly fillColorToken: string;
  readonly strokeColorToken: string;
  readonly labelOffsetY?: number;
}

type DashboardTileId = 'fleet-size' | 'active-units' | 'average-speed' | 'status-mix';
type StatusSummaryKey = 'loading' | 'hauling' | 'dumping' | 'idle';
type TruckStatusColorToken =
  | '--map-status-loading'
  | '--map-status-hauling'
  | '--map-status-dumping'
  | '--map-status-idle'
  | '--map-status-default';

interface FleetSummaryViewModel {
  readonly total: number;
  readonly active: number;
  readonly avgSpeed: number;
  readonly loading: number;
  readonly hauling: number;
  readonly dumping: number;
  readonly idle: number;
}

interface StatusMetricViewModel {
  readonly label: string;
  readonly value: number;
  readonly className: string;
}

interface LegendItemViewModel {
  readonly label: string;
  readonly markerClass: string;
}

interface StatusMetricConfig {
  readonly label: string;
  readonly key: StatusSummaryKey;
  readonly className: string;
  readonly markerClass: string;
}

interface DashboardTileViewModel {
  readonly id: DashboardTileId;
  readonly title: string;
  readonly caption: string;
  readonly kind: 'metric' | 'status';
  readonly value?: string;
  readonly statusMetrics?: readonly StatusMetricViewModel[];
}

interface SiteCoordinate {
  readonly x: number;
  readonly y: number;
}

interface MapZoneViewModel {
  readonly label: string;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  readonly className: string;
}

interface MapTruckViewModel extends Truck {
  readonly left: number;
  readonly top: number;
  readonly title: string;
}

const DEFAULT_DASHBOARD_TILE_ORDER: readonly DashboardTileId[] = [
  'fleet-size',
  'active-units',
  'average-speed',
  'status-mix'
];

const SITE_WIDTH = 1000;
const SITE_HEIGHT = 800;

const HAUL_ROAD_COORDINATES: readonly SiteCoordinate[] = [
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

const STATUS_METRIC_CONFIG: readonly StatusMetricConfig[] = [
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

const LEGEND_ITEMS: readonly LegendItemViewModel[] = STATUS_METRIC_CONFIG.map(({ label, markerClass }) => ({
  label: label.toUpperCase(),
  markerClass
}));

const STATUS_COLOR_TOKENS: Record<Truck['status'], TruckStatusColorToken> = {
  [TRUCK_STATUS.LOADING]: '--map-status-loading',
  [TRUCK_STATUS.HAULING]: '--map-status-hauling',
  [TRUCK_STATUS.DUMPING]: '--map-status-dumping',
  [TRUCK_STATUS.IDLE]: '--map-status-idle'
};

const ZONE_CLASS_BY_FILL_TOKEN: Record<ZoneConfig['fillColorToken'], string> = {
  '--map-zone-loading-fill': 'map-zone-card--loading',
  '--map-zone-dump-fill': 'map-zone-card--dumping'
};

@Component({
  selector: 'fleet-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CdkDropList, CdkDrag, CdkDragHandle, CdkDragPreview, CdkDragPlaceholder, MatCardModule, MatButtonModule, MatExpansionModule],
  templateUrl: './fleet-map.component.html',
  styleUrl: './fleet-map.component.scss'
})
/**
 * Presents the live fleet dashboard, including summary tiles, legend,
 * truck telemetry, and the static site map view.
 */
export class FleetMapComponent implements OnInit, OnDestroy {
  readonly legendItems = LEGEND_ITEMS;

  readonly store = inject(FleetStore);
  private readonly sim = inject(SimulationService);
  private readonly dashboardTileStorageKey = 'fleet-map.dashboard-tile-order';

  private unloadHandler?: () => void;

  private readonly zones: readonly ZoneConfig[] = [
    {
      x: 80,
      y: 80,
      width: 160,
      height: 160,
      label: 'Stockpile Lot 1',
      fillColorToken: '--map-zone-loading-fill',
      strokeColorToken: '--map-zone-loading-stroke'
    },
    {
      x: 820,
      y: 580,
      width: 160,
      height: 160,
      label: 'Stockpile Lot 2',
      fillColorToken: '--map-zone-dump-fill',
      strokeColorToken: '--map-zone-dump-stroke'
    }
  ];

  /**
   * Registers the beforeunload handler to stop simulation on page unload.
   */
  ngOnInit(): void {
    this.unloadHandler = () => {
      try { this.sim.stop(); } catch { /* ignore unload cleanup errors */ }
    };
    window.addEventListener('beforeunload', this.unloadHandler);
    this.dashboardTileOrder.set(this.restoreDashboardTileOrder());
    this.running.set(this.sim.isRunning());
  }

  /**
   * Stops the simulation and removes the beforeunload handler to prevent memory leaks.
   */
  ngOnDestroy(): void {
    try {
      this.sim.stop();
    } catch (e) {
      console.error('[FleetMapComponent] Error stopping simulation', e);
    }
    
    if (this.unloadHandler) {
      window.removeEventListener('beforeunload', this.unloadHandler);
      this.unloadHandler = undefined;
    }
  }

  /** Whether the simulation is currently running. */
  readonly running = signal(false);
  readonly accessibilityAnnouncement = signal('');
  readonly tileDragStartDelay = { touch: 140, mouse: 0 };
  readonly dashboardTileOrder = signal<DashboardTileId[]>([...DEFAULT_DASHBOARD_TILE_ORDER]);
  readonly hoveredTruckId = signal<string | undefined>(undefined);
  readonly fleetSummary = computed<FleetSummaryViewModel>(() => {
    return this.summarizeFleet(this.store.trucks());
  });
  readonly dashboardTiles = computed<DashboardTileViewModel[]>(() => {
    const summary = this.fleetSummary();

    return this.dashboardTileOrder().map(tileId => this.createDashboardTile(tileId, summary));
  });
  readonly mapZones: readonly MapZoneViewModel[] = this.zones.map(zone => this.createMapZone(zone));
  readonly mapTrucks = computed<MapTruckViewModel[]>(() => this.store.trucks().map(truck => this.createMapTruck(truck)));
  readonly hoveredTruck = computed<MapTruckViewModel | undefined>(() => {
    const truckId = this.hoveredTruckId();
    return truckId ? this.mapTrucks().find(truck => truck.id === truckId) : undefined;
  });
  readonly haulRoadPolylinePoints = HAUL_ROAD_COORDINATES
    .map(({ x, y }) => `${this.toPercent(x, SITE_WIDTH)},${this.toPercent(y, SITE_HEIGHT)}`)
    .join(' ');

  /** Reorders dashboard tiles after a drag-and-drop action completes. */
  dropDashboardTile(event: CdkDragDrop<DashboardTileViewModel[]>): void {
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    this.reorderDashboardTiles(event.previousIndex, event.currentIndex, this.dashboardTiles()[event.previousIndex]?.title);
  }

  /** Handles keyboard-based tile movement for accessible dashboard reordering. */
  handleTileKeyboardReorder(event: KeyboardEvent, index: number, title: string): void {
    const tileCount = this.dashboardTileOrder().length;
    let nextIndex = index;

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = Math.max(0, index - 1);
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = Math.min(tileCount - 1, index + 1);
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = tileCount - 1;
        break;
      default:
        return;
    }

    event.preventDefault();

    if (nextIndex !== index) {
      this.reorderDashboardTiles(index, nextIndex, title);
    }
  }

  /**
   * Toggle the running state of the simulation.
   * Calls start() or stop() on the service and updates local state.
   */
  toggleSimulation(): void {
    try {
      if (this.sim.isRunning()) {
        this.sim.stop();
        this.running.set(false);
        this.announce('Simulation paused.');
      } else {
        this.sim.start();
        this.running.set(true);
        this.announce('Simulation running.');
      }
    } catch (e) {
      console.error('[FleetMapComponent] Error toggling simulation:', e);
    }
  }

  /** Resolve the theme color used for a truck status. */
  statusColor(status: 'LOADING' | 'HAULING' | 'DUMPING' | 'IDLE'): string {
    return this.themeColor(STATUS_COLOR_TOKENS[status] ?? '--map-status-default');
  }

  /** Shows the hover card for the supplied truck id on the static site map. */
  showTruckHover(truckId: string): void {
    this.hoveredTruckId.set(truckId);
  }

  /** Hides the hover card when a truck marker is no longer being hovered. */
  hideTruckHover(truckId?: string): void {
    if (!truckId || this.hoveredTruckId() === truckId) {
      this.hoveredTruckId.set(undefined);
    }
  }

  /** Builds the view model for a dashboard tile based on the requested tile id. */
  private createDashboardTile(tileId: DashboardTileId, summary: FleetSummaryViewModel): DashboardTileViewModel {
    switch (tileId) {
      case 'fleet-size':
        return this.createMetricTile(tileId, 'Fleet size', 'Total trucks on site', `${summary.total}`);
      case 'active-units':
        return this.createMetricTile(tileId, 'Active units', 'Currently loading, hauling, or dumping', `${summary.active}`);
      case 'average-speed':
        return this.createMetricTile(tileId, 'Average speed', 'Across the current fleet state', `${summary.avgSpeed} km/h`);
      case 'status-mix':
        return {
          id: tileId,
          title: 'Status mix',
          caption: 'Distribution by operational state',
          kind: 'status',
          statusMetrics: this.createStatusMetrics(summary)
        };
    }
  }

  /** Creates a standard metric tile view model for the dashboard summary row. */
  private createMetricTile(
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

  /** Updates tile order state, persists it, and announces the new position when needed. */
  private reorderDashboardTiles(previousIndex: number, currentIndex: number, title?: string): void {
    const nextOrder = [...this.dashboardTileOrder()];
    moveItemInArray(nextOrder, previousIndex, currentIndex);
    this.updateDashboardTileOrder(nextOrder);

    if (title) {
      this.announce(`${title} tile moved to position ${currentIndex + 1} of ${nextOrder.length}.`);
    }
  }

  /** Transforms fleet summary counts into the status-mix tile metrics. */
  private createStatusMetrics(summary: FleetSummaryViewModel): StatusMetricViewModel[] {
    return STATUS_METRIC_CONFIG.map(({ label, key, className }) => ({
      label,
      value: summary[key],
      className
    }));
  }

  /** Aggregates raw truck telemetry into dashboard-ready fleet summary values. */
  private summarizeFleet(trucks: readonly Truck[]): FleetSummaryViewModel {
    const summary = trucks.reduce(
      (accumulator, truck) => {
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
      },
      {
        total: 0,
        active: 0,
        speedTotal: 0,
        loading: 0,
        hauling: 0,
        dumping: 0,
        idle: 0
      }
    );

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

  /** Stores the user's dashboard tile order in local storage. */
  private persistDashboardTileOrder(tileOrder: readonly DashboardTileId[]): void {
    localStorage.setItem(this.dashboardTileStorageKey, JSON.stringify(tileOrder));
  }

  /** Applies and persists a new dashboard tile order. */
  private updateDashboardTileOrder(tileOrder: DashboardTileId[]): void {
    this.dashboardTileOrder.set(tileOrder);
    this.persistDashboardTileOrder(tileOrder);
  }

  /** Publishes a message to the polite live region for assistive technologies. */
  private announce(message: string): void {
    this.accessibilityAnnouncement.set('');
    queueMicrotask(() => this.accessibilityAnnouncement.set(message));
  }

  /** Restores the saved tile order and falls back to the default layout when invalid. */
  private restoreDashboardTileOrder(): DashboardTileId[] {
    const savedOrder = localStorage.getItem(this.dashboardTileStorageKey);

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

  /** Converts a configured zone into percentage-based layout values for the static map. */
  private createMapZone(zone: ZoneConfig): MapZoneViewModel {
    return {
      label: zone.label,
      left: this.toPercent(zone.x, SITE_WIDTH),
      top: this.toPercent(zone.y, SITE_HEIGHT),
      width: this.toPercent(zone.width, SITE_WIDTH),
      height: this.toPercent(zone.height, SITE_HEIGHT),
      className: ZONE_CLASS_BY_FILL_TOKEN[zone.fillColorToken]
    };
  }

  /** Converts truck telemetry into percentage-based coordinates for the static map. */
  private createMapTruck(truck: Truck): MapTruckViewModel {
    return {
      ...truck,
      left: this.toPercent(truck.x, SITE_WIDTH),
      top: this.toPercent(truck.y, SITE_HEIGHT),
      title: `${truck.id} - ${truck.status} - ${truck.speed} km/h`
    };
  }

  /** Converts a site coordinate value into a percentage of the rendered map size. */
  private toPercent(value: number, max: number): number {
    return (value / max) * 100;
  }

  /** Reads a CSS custom property from the document root and returns its trimmed value. */
  private themeColor(variableName: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
  }
}

