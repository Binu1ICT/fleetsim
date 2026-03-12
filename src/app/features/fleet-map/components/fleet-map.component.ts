import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDragPlaceholder, CdkDragPreview, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { HAUL_ROAD_TO_DUMP, SITE_DIMENSIONS } from '../../../constants/simulation.constants';
import { SimulationService } from '../../../core/services/simulation.service';
import { FleetStore } from '../../../core/store/fleet.store';
import { TRUCK_STATUS } from '../../../constants/truck-status.constants';
import { Truck } from '../../../core/models/truck.model';
import {
  DASHBOARD_TILE_STORAGE_KEY,
  DEFAULT_DASHBOARD_TILE_ORDER,
  LEGEND_ITEMS,
  MAP_ZONES,
  STATUS_METRIC_CONFIG,
  ZONE_CLASS_BY_FILL_TOKEN
} from '../../../constants/fleet-map.constants';
import type {
  DashboardTileId,
  DashboardTileViewModel,
  FleetSummaryViewModel,
  MapTruckViewModel,
  MapZoneViewModel,
  StatusMetricViewModel,
  ZoneConfig
} from '../../../interfaces/fleet-map.interfaces';

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
  readonly mapZones: readonly MapZoneViewModel[] = MAP_ZONES.map(zone => this.createMapZone(zone));

  readonly store = inject(FleetStore);
  private readonly sim = inject(SimulationService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private beforeUnloadHandler?: () => void;

  ngOnInit(): void {
    if (this.isBrowser) {
      this.beforeUnloadHandler = () => {
        this.stopSimulationSafely();
      };

      window.addEventListener('beforeunload', this.beforeUnloadHandler);
      this.dashboardTileOrder.set(this.restoreDashboardTileOrder());
    }

    this.running.set(this.sim.isRunning());
  }

  ngOnDestroy(): void {
    if (this.isBrowser && this.beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
      this.beforeUnloadHandler = undefined;
    }

    this.stopSimulationSafely();
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
  readonly mapTrucks = computed<MapTruckViewModel[]>(() => this.store.trucks().map(truck => this.createMapTruck(truck)));
  readonly mapTrucksById = computed(() => {
    return new Map(this.mapTrucks().map(truck => [truck.id, truck] as const));
  });
  readonly hoveredTruck = computed<MapTruckViewModel | undefined>(() => {
    const truckId = this.hoveredTruckId();
    return truckId ? this.mapTrucksById().get(truckId) : undefined;
  });
  readonly haulRoadPolylinePoints = HAUL_ROAD_TO_DUMP
    .map(({ x, y }) => `${this.toPercent(x, SITE_DIMENSIONS.width)},${this.toPercent(y, SITE_DIMENSIONS.height)}`)
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
    if (!this.isBrowser) {
      return;
    }

    localStorage.setItem(DASHBOARD_TILE_STORAGE_KEY, JSON.stringify(tileOrder));
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
    if (!this.isBrowser) {
      return [...DEFAULT_DASHBOARD_TILE_ORDER];
    }

    const savedOrder = localStorage.getItem(DASHBOARD_TILE_STORAGE_KEY);

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
      left: this.toPercent(zone.x, SITE_DIMENSIONS.width),
      top: this.toPercent(zone.y, SITE_DIMENSIONS.height),
      width: this.toPercent(zone.width, SITE_DIMENSIONS.width),
      height: this.toPercent(zone.height, SITE_DIMENSIONS.height),
      className: ZONE_CLASS_BY_FILL_TOKEN[zone.fillColorToken]
    };
  }

  /** Converts truck telemetry into percentage-based coordinates for the static map. */
  private createMapTruck(truck: Truck): MapTruckViewModel {
    return {
      ...truck,
      left: this.toPercent(truck.x, SITE_DIMENSIONS.width),
      top: this.toPercent(truck.y, SITE_DIMENSIONS.height),
      title: this.createTruckTitle(truck)
    };
  }

  /** Builds the accessible title used for truck markers and hover state. */
  private createTruckTitle(truck: Pick<Truck, 'id' | 'status' | 'speed'>): string {
    return `${truck.id} - ${truck.status} - ${truck.speed} km/h`;
  }

  /** Stops the simulation while swallowing teardown errors during browser unload. */
  private stopSimulationSafely(): void {
    try {
      this.sim.stop();
    } catch (error) {
      console.error('[FleetMapComponent] Error stopping simulation', error);
    }
  }

  /** Converts a site coordinate value into a percentage of the rendered map size. */
  private toPercent(value: number, max: number): number {
    return (value / max) * 100;
  }
}

