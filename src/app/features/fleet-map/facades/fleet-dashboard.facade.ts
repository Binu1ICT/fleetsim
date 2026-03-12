import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import {
  DEFAULT_SIMULATION_SETTINGS,
  HAUL_ROAD_TO_DUMP,
  SIMULATION_SETTING_LIMITS,
  SITE_DIMENSIONS
} from '../../../constants/simulation.constants';
import { LEGEND_ITEMS, MAP_ZONES } from '../../../constants/fleet-map.constants';
import { TRUCK_STATUS } from '../../../constants/truck-status.constants';
import { SimulationService } from '../../../core/services/simulation.service';
import { FleetStore } from '../../../core/store/fleet.store';
import type { DashboardTileId, MapTruckViewModel, SimulationSettingsViewModel } from '../../../interfaces/fleet-map.interfaces';
import {
  createDashboardTile,
  createMapTruckViewModel,
  createMapZoneViewModel,
  createStatusFilterOptions,
  filterTrucks,
  readDashboardTileOrder,
  summarizeFleet,
  toPercent,
  writeDashboardTileOrder
} from '../components/fleet-map.utils';

const ALL_STATUSES = Object.values(TRUCK_STATUS);

@Injectable()
/** Coordinates dashboard view state, filtering, hover state, and simulation commands. */
export class FleetDashboardFacade {
  private readonly store = inject(FleetStore);
  private readonly simulationService = inject(SimulationService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  /** Static legend items rendered by the legend component. */
  readonly legendItems = LEGEND_ITEMS;
  /** Static zone view models rendered by the map canvas. */
  readonly mapZones = MAP_ZONES.map(createMapZoneViewModel);
  /** Toolbar limits for user-adjustable simulation settings. */
  readonly simulationLimits = SIMULATION_SETTING_LIMITS;
  /** Live truck collection from the fleet store. */
  readonly trucks = this.store.trucks;
  /** Current running state of the simulation loop. */
  readonly running = signal(this.simulationService.isRunning());
  /** Live region text used for accessibility announcements. */
  readonly accessibilityAnnouncement = signal('');
  /** Current truck id search term. */
  readonly searchTerm = signal('');
  /** Set of currently active truck status filters. */
  readonly selectedStatuses = signal<readonly (typeof ALL_STATUSES)[number][]>(ALL_STATUSES);
  /** Persisted order of the summary KPI tiles. */
  readonly dashboardTileOrder = signal<DashboardTileId[]>(readDashboardTileOrder(this.isBrowser));
  /** Id of the truck currently hovered or focused on the map. */
  readonly hoveredTruckId = signal<string | undefined>(undefined);

  /** Current simulation settings exposed to the toolbar. */
  readonly settings = computed<SimulationSettingsViewModel>(() => this.simulationService.getSettings());
  /** Trucks visible after applying the active search and status filters. */
  readonly visibleTrucks = computed(() => filterTrucks(this.trucks(), this.searchTerm(), this.selectedStatuses()));
  /** Count of trucks visible in the current filtered view. */
  readonly truckCount = computed(() => this.visibleTrucks().length);
  /** Count of all trucks currently seeded in the simulation. */
  readonly totalTruckCount = computed(() => this.trucks().length);
  /** Aggregated fleet metrics derived from the visible truck collection. */
  readonly fleetSummary = computed(() => summarizeFleet(this.visibleTrucks()));
  /** Ordered dashboard tile view models derived from the summary metrics. */
  readonly dashboardTiles = computed(() => this.dashboardTileOrder().map(tileId => createDashboardTile(tileId, this.fleetSummary())));
  /** Percentage-based truck marker view models for the static map. */
  readonly mapTrucks = computed(() => this.visibleTrucks().map(createMapTruckViewModel));
  /** Lookup table used to resolve a hovered truck by id. */
  readonly mapTrucksById = computed(() => new Map(this.mapTrucks().map(truck => [truck.id, truck] as const)));
  /** Truck currently hovered or focused in the map canvas. */
  readonly hoveredTruck = computed(() => this.resolveTruckById(this.hoveredTruckId()));
  /** Toolbar filter chips derived from current fleet state. */
  readonly statusFilters = computed(() => createStatusFilterOptions(this.trucks(), this.selectedStatuses()));
  /** Indicates whether any fleet filter is currently active. */
  readonly hasActiveFilters = computed(() => this.searchTerm().trim().length > 0 || this.selectedStatuses().length !== ALL_STATUSES.length);
  /** Contextual empty-state message for the map and telemetry list. */
  readonly emptyStateMessage = computed(() => {
    if (!this.trucks().length) {
      return 'No trucks are available in the current simulation.';
    }

    if (!this.visibleTrucks().length) {
      return 'No trucks match the current filter and search criteria.';
    }

    return '';
  });
  /** SVG polyline points that render the haul road on the map. */
  readonly haulRoadPolylinePoints = HAUL_ROAD_TO_DUMP
    .map(({ x, y }) => `${toPercent(x, SITE_DIMENSIONS.width)},${toPercent(y, SITE_DIMENSIONS.height)}`)
    .join(' ');

  /** Starts or pauses the simulation and announces the new state. */
  toggleSimulation(): void {
    if (this.simulationService.isRunning()) {
      this.simulationService.stop();
      this.running.set(false);
      this.announce('Simulation paused.');
      return;
    }

    this.simulationService.start();
    this.running.set(true);
    this.announce('Simulation running.');
  }

  /** Reorders the summary tiles and persists the new tile order. */
  reorderDashboardTiles(previousIndex: number, currentIndex: number, title?: string): void {
    if (previousIndex === currentIndex) {
      return;
    }

    const nextOrder = [...this.dashboardTileOrder()];
    const [movedTile] = nextOrder.splice(previousIndex, 1);
    nextOrder.splice(currentIndex, 0, movedTile);
    this.dashboardTileOrder.set(nextOrder);
    writeDashboardTileOrder(this.isBrowser, nextOrder);

    if (title) {
      this.announce(`${title} tile moved to position ${currentIndex + 1} of ${nextOrder.length}.`);
    }
  }

  /** Updates the truck id search term used by the dashboard filters. */
  setSearchTerm(value: string): void {
    this.searchTerm.set(value);
  }

  /** Toggles a status filter while ensuring at least one status remains active. */
  toggleStatusFilter(status: (typeof ALL_STATUSES)[number]): void {
    const current = this.selectedStatuses();
    const isActive = current.includes(status);

    if (isActive && current.length === 1) {
      this.announce('At least one status filter must remain active.');
      return;
    }

    this.selectedStatuses.set(
      isActive
        ? current.filter(currentStatus => currentStatus !== status)
        : [...current, status]
    );
  }

  /** Resets the search term and status filters to their default values. */
  clearFilters(): void {
    this.searchTerm.set('');
    this.selectedStatuses.set(ALL_STATUSES);
    this.announce('Filters cleared.');
  }

  /** Stores the truck id currently hovered or focused in the map canvas. */
  showTruckHover(truckId: string): void {
    this.hoveredTruckId.set(truckId);
  }

  /** Clears hover state when the active truck loses hover or focus. */
  hideTruckHover(truckId?: string): void {
    if (!truckId || this.hoveredTruckId() === truckId) {
      this.hoveredTruckId.set(undefined);
    }
  }

  /** Applies a new fleet size and reseeds the simulation when needed. */
  updateTruckCount(truckCount: number): void {
    this.simulationService.updateSettings({ truckCount });
    this.running.set(this.simulationService.isRunning());
    this.announce(`Simulation reseeded with ${truckCount} trucks.`);
  }

  /** Applies a new tick interval and restarts the simulation loop if required. */
  updateTickMs(tickMs: number): void {
    this.simulationService.updateSettings({ tickMs });
    this.running.set(this.simulationService.isRunning());
    this.announce(`Simulation speed updated to one tick every ${tickMs} milliseconds.`);
  }

  /** Applies a new dump dwell duration to the simulation engine. */
  updateDumpDwellTicks(dumpDwellTicks: number): void {
    this.simulationService.updateSettings({ dumpDwellTicks });
    this.announce(`Dump dwell time updated to ${dumpDwellTicks} ticks.`);
  }

  /** Restores the default scenario settings and clears active filters. */
  resetScenario(): void {
    this.simulationService.updateSettings(DEFAULT_SIMULATION_SETTINGS);
    this.searchTerm.set('');
    this.selectedStatuses.set(ALL_STATUSES);
    this.running.set(this.simulationService.isRunning());
    this.announce('Simulation scenario reset to the default configuration.');
  }

  /** Resolves the current hovered truck from the marker lookup map. */
  private resolveTruckById(truckId: string | undefined): MapTruckViewModel | undefined {
    if (!truckId) {
      return undefined;
    }

    return this.mapTrucksById().get(truckId);
  }

  /** Sends a message through the polite live region for assistive technologies. */
  private announce(message: string): void {
    this.accessibilityAnnouncement.set('');
    queueMicrotask(() => this.accessibilityAnnouncement.set(message));
  }
}
