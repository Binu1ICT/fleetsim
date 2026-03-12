import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDragPlaceholder, CdkDragPreview, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { HAUL_ROAD_TO_DUMP, SITE_DIMENSIONS } from '../../../constants/simulation.constants';
import { SimulationService } from '../../../core/services/simulation.service';
import { FleetStore } from '../../../core/store/fleet.store';
import {
  DEFAULT_DASHBOARD_TILE_ORDER,
  LEGEND_ITEMS,
  MAP_ZONES
} from '../../../constants/fleet-map.constants';
import type {
  DashboardTileId,
  DashboardTileViewModel,
  FleetSummaryViewModel,
  MapTruckViewModel,
  MapZoneViewModel
} from '../../../interfaces/fleet-map.interfaces';
import {
  createDashboardTile,
  createMapTruckViewModel,
  createMapZoneViewModel,
  readDashboardTileOrder,
  summarizeFleet,
  toPercent,
  writeDashboardTileOrder
} from './fleet-map.utils';

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
  readonly mapZones: readonly MapZoneViewModel[] = MAP_ZONES.map(createMapZoneViewModel);

  readonly store = inject(FleetStore);
  readonly trucks = this.store.trucks;
  private readonly sim = inject(SimulationService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly beforeUnloadHandler = () => this.stopSimulationSafely();

  ngOnInit(): void {
    if (this.isBrowser) {
      window.addEventListener('beforeunload', this.beforeUnloadHandler);
      this.dashboardTileOrder.set(readDashboardTileOrder(this.isBrowser));
    }

    this.running.set(this.sim.isRunning());
  }

  ngOnDestroy(): void {
    if (this.isBrowser) {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
    }

    this.stopSimulationSafely();
  }

  /** Whether the simulation is currently running. */
  readonly running = signal(false);
  readonly accessibilityAnnouncement = signal('');
  readonly tileDragStartDelay = { touch: 140, mouse: 0 };
  readonly dashboardTileOrder = signal<DashboardTileId[]>([...DEFAULT_DASHBOARD_TILE_ORDER]);
  readonly hoveredTruckId = signal<string | undefined>(undefined);
  readonly truckCount = computed(() => this.trucks().length);
  readonly fleetSummary = computed<FleetSummaryViewModel>(() => summarizeFleet(this.trucks()));
  readonly dashboardTiles = computed<DashboardTileViewModel[]>(() => {
    const summary = this.fleetSummary();

    return this.dashboardTileOrder().map(tileId => createDashboardTile(tileId, summary));
  });
  readonly mapTrucks = computed<MapTruckViewModel[]>(() => this.trucks().map(createMapTruckViewModel));
  readonly mapTrucksById = computed(() => {
    return new Map(this.mapTrucks().map(truck => [truck.id, truck] as const));
  });
  readonly hoveredTruck = computed<MapTruckViewModel | undefined>(() => {
    const truckId = this.hoveredTruckId();
    return truckId ? this.mapTrucksById().get(truckId) : undefined;
  });
  readonly haulRoadPolylinePoints = HAUL_ROAD_TO_DUMP
    .map(({ x, y }) => `${toPercent(x, SITE_DIMENSIONS.width)},${toPercent(y, SITE_DIMENSIONS.height)}`)
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

  /** Updates tile order state, persists it, and announces the new position when needed. */
  private reorderDashboardTiles(previousIndex: number, currentIndex: number, title?: string): void {
    const nextOrder = [...this.dashboardTileOrder()];
    moveItemInArray(nextOrder, previousIndex, currentIndex);
    this.updateDashboardTileOrder(nextOrder);

    if (title) {
      this.announce(`${title} tile moved to position ${currentIndex + 1} of ${nextOrder.length}.`);
    }
  }

  /** Stores the user's dashboard tile order in local storage. */
  private persistDashboardTileOrder(tileOrder: readonly DashboardTileId[]): void {
    writeDashboardTileOrder(this.isBrowser, tileOrder);
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

  /** Stops the simulation while swallowing teardown errors during browser unload. */
  private stopSimulationSafely(): void {
    try {
      this.sim.stop();
    } catch (error) {
      console.error('[FleetMapComponent] Error stopping simulation', error);
    }
  }
}

