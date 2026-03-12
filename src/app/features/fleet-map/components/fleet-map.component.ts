import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, EffectRef, ElementRef, OnDestroy, OnInit, computed, effect, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDragPlaceholder, CdkDragPreview, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { Loader } from '@googlemaps/js-api-loader';
import { SimulationService } from '../../../core/services/simulation.service';
import { FleetStore } from '../../../core/store/fleet.store';
import { TRUCK_STATUS } from '../../../core/constants/truck-status.constants';
import { Truck } from '../../../core/models/truck.model';
import { environment } from '../../../../environments/environment';

type OverlayPaneName = 'overlayLayer' | 'floatPane';

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

interface TruckMarkerView {
  readonly marker: google.maps.marker.AdvancedMarkerElement;
  readonly element: HTMLDivElement;
}

interface SiteCoordinate {
  readonly x: number;
  readonly y: number;
}

const DEFAULT_DASHBOARD_TILE_ORDER: readonly DashboardTileId[] = [
  'fleet-size',
  'active-units',
  'average-speed',
  'status-mix'
];

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
 * truck telemetry, and the interactive Google map view.
 */
export class FleetMapComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly mapContainer = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');
  readonly hoverTelemetryTemplate = viewChild.required<ElementRef<HTMLTemplateElement>>('hoverTelemetryTemplate');
  readonly legendItems = LEGEND_ITEMS;

  readonly store = inject(FleetStore);
  private readonly sim = inject(SimulationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dashboardTileStorageKey = 'fleet-map.dashboard-tile-order';

  private unloadHandler?: () => void;
  private map?: google.maps.Map;
  private mapLoader?: Loader;
  private mapInitPromise?: Promise<void>;
  private readonly trucksEffect: EffectRef;
  private readonly markers = new Map<string, TruckMarkerView>();
  private readonly labelOverlays = new Map<string, google.maps.OverlayView>();
  private readonly zoneOverlays: google.maps.OverlayView[] = [];
  private readonly truckDetails = new Map<string, Truck>();
  private hoverOverlay?: google.maps.OverlayView;
  private hoveredTruckId?: string;
  private mapReady = false;

  private readonly mapCenter: google.maps.LatLngLiteral = { lat: -23.0, lng: 119.0 };
  private readonly latSpan = 0.01;
  private readonly lngSpan = 0.015;
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

  /** Creates the reactive effect that keeps map markers synchronized with store updates. */
  constructor() {
    this.trucksEffect = effect(() => {
      const trucks = this.store.trucks();
      if (!this.mapReady) return;
      this.syncTrucks(trucks);
    });

    this.destroyRef.onDestroy(() => this.trucksEffect.destroy());
  }

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
   * Initialize the Google Map once the view is ready.
   */
  ngAfterViewInit(): void {
    this.initMap();
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
    
    // Clean up overlays
    this.labelOverlays.forEach(overlay => overlay.setMap(null));
    this.labelOverlays.clear();
    this.zoneOverlays.forEach(overlay => overlay.setMap(null));
    this.zoneOverlays.length = 0;
    
    if (this.unloadHandler) {
      window.removeEventListener('beforeunload', this.unloadHandler);
      this.unloadHandler = undefined;
    }

    this.hoverOverlay?.setMap(null);
    this.hoverOverlay = undefined;
    this.hoveredTruckId = undefined;
  }

  /** Whether the simulation is currently running. */
  readonly running = signal(false);
  readonly accessibilityAnnouncement = signal('');
  readonly tileDragStartDelay = { touch: 140, mouse: 0 };
  readonly dashboardTileOrder = signal<DashboardTileId[]>([...DEFAULT_DASHBOARD_TILE_ORDER]);
  readonly fleetSummary = computed<FleetSummaryViewModel>(() => {
    return this.summarizeFleet(this.store.trucks());
  });
  readonly dashboardTiles = computed<DashboardTileViewModel[]>(() => {
    const summary = this.fleetSummary();

    return this.dashboardTileOrder().map(tileId => this.createDashboardTile(tileId, summary));
  });

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

  /** Lazily initializes Google Maps and hydrates the fleet overlays once ready. */
  private initMap(): void {
    if (this.map || this.mapInitPromise) {
      return;
    }

    if (!environment.googleMapsApiKey) {
      console.warn('[FleetMapComponent] Google Maps API key is missing. Set it in environment.ts.');
      return;
    }

    const container = this.mapContainer().nativeElement;

    this.mapInitPromise = this.initializeMap(container)
      .then(() => {
        if (!this.map) {
          return;
        }

        this.drawZones();
        this.mapReady = true;
        this.syncTrucks(this.store.trucks());
      })
      .catch((error: unknown) => {
        console.error('[FleetMapComponent] Failed to load Google Maps API', error);
      })
      .finally(() => {
        this.mapInitPromise = undefined;
      });
  }

  /** Loads the required Google Maps libraries and creates the map instance. */
  private async initializeMap(container: HTMLDivElement): Promise<void> {
    const loader = this.getMapLoader();
    const { Map: GoogleMap } = await loader.importLibrary('maps') as google.maps.MapsLibrary;

    await loader.importLibrary('marker');

    if (!container.isConnected || this.map) {
      return;
    }

    this.map = new GoogleMap(container, this.createMapOptions());
  }

  /** Returns the shared Google Maps loader configured for this feature. */
  private getMapLoader(): Loader {
    if (!this.mapLoader) {
      this.mapLoader = new Loader({
        apiKey: environment.googleMapsApiKey,
        version: 'weekly',
        libraries: ['marker']
      });
    }

    return this.mapLoader;
  }

  /** Builds the base Google Maps options used for the fleet map canvas. */
  private createMapOptions(): google.maps.MapOptions {
    return {
      center: this.mapCenter,
      zoom: 16,
      mapId: environment.googleMapsMapId,
      mapTypeId: 'terrain',
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: 'greedy'
    };
  }

  /** Draws operational zones, labels, and haul-road overlays onto the map. */
  private drawZones(): void {
    if (!this.map) return;

    this.zones.forEach(zone => {
      this.drawZone(zone);
      this.addZoneLabel(zone.x, zone.y, zone.width, zone.height, zone.label, zone.labelOffsetY);
    });

    this.drawHaulRoads();
  }

  /** Renders a rectangular operational zone using themed fill and stroke colors. */
  private drawZone(zone: ZoneConfig): void {
    if (!this.map) return;

    const bounds = this.zoneBounds(zone.x, zone.y, zone.width, zone.height);
    const fillColor = this.themeColor(zone.fillColorToken);
    const strokeColor = this.themeColor(zone.strokeColorToken);

    new google.maps.Rectangle({
      map: this.map,
      bounds,
      fillColor,
      fillOpacity: 0.25,
      strokeColor,
      strokeOpacity: 0.8,
      strokeWeight: 2
    });
  }

  /** Places a labeled overlay near the center of a zone for quick identification. */
  private addZoneLabel(x: number, y: number, w: number, h: number, text: string, offsetY = -20): void {
    if (!this.map) return;

    const labelPosition = this.toLatLng(x + w / 2, y + offsetY);
    const overlay = this.createZoneTagOverlay(labelPosition, text);
    overlay.setMap(this.map);
    this.zoneOverlays.push(overlay);
  }

  /** Creates the DOM overlay used to display a styled zone tag on the map. */
  private createZoneTagOverlay(position: google.maps.LatLngLiteral, text: string): google.maps.OverlayView {
    return this.createDomOverlay(position, 'overlayLayer', 'map-zone-tag', element => {
      element.textContent = text;
    });
  }

  /** Draws the main haul road polyline that visually connects operating areas. */
  private drawHaulRoads(): void {
    if (!this.map) return;

    const haulRoadPath = HAUL_ROAD_COORDINATES.map(({ x, y }) => this.toLatLng(x, y));

    new google.maps.Polyline({
      path: haulRoadPath,
      geodesic: true,
      strokeColor: this.themeColor('--map-road-stroke'),
      strokeOpacity: 0.6,
      strokeWeight: 4,
      map: this.map,
      icons: [{
        icon: {
          path: 'M 0,-1 0,1',
          strokeOpacity: 1,
          scale: 3
        },
        offset: '0',
        repeat: '20px'
      }]
    });
  }

  /** Reconciles rendered truck markers and overlays with the latest fleet state. */
  private syncTrucks(trucks: Truck[]): void {
    if (!this.map) {
      return;
    }

    const nextIds = new Set(trucks.map(truck => truck.id));

    for (const [id, markerView] of this.markers.entries()) {
      if (!nextIds.has(id)) {
        markerView.marker.map = null;
        this.markers.delete(id);
        this.labelOverlays.get(id)?.setMap(null);
        this.labelOverlays.delete(id);
        this.truckDetails.delete(id);

        if (this.hoveredTruckId === id) {
          this.hoverOverlay?.setMap(null);
          this.hoverOverlay = undefined;
          this.hoveredTruckId = undefined;
        }
      }
    }

    trucks.forEach(truck => this.upsertTruck(truck));
  }

  /** Creates or updates a truck marker, label, and hover state for a single truck. */
  private upsertTruck(truck: Truck): void {
    if (!this.map) return;

    const position = this.toLatLng(truck.x, truck.y);
    const title = `${truck.id} - ${truck.status} - ${truck.speed} km/h`;

    const existingMarker = this.markers.get(truck.id);
    const markerView = existingMarker ?? this.createTruckMarker(truck, position, title);

    if (!existingMarker) {
      this.attachMarkerHover(markerView.element, truck.id);
    }

    this.updateTruckMarker(markerView, truck, position, title);
    this.markers.set(truck.id, markerView);
    this.truckDetails.set(truck.id, truck);

    if (this.hoveredTruckId === truck.id) {
      this.showTelemetryHover(truck.id);
    }

    this.updateLabelOverlay(truck.id, position);
  }

  /** Creates a DOM-backed advanced marker element for a truck. */
  private createTruckMarker(
    truck: Truck,
    position: google.maps.LatLngLiteral,
    title: string
  ): TruckMarkerView {
    const element = document.createElement('div');
    const marker = new google.maps.marker.AdvancedMarkerElement({
      map: this.map,
      position,
      title,
      content: element
    });

    const markerView = { marker, element };
    this.updateTruckMarker(markerView, truck, position, title);
    return markerView;
  }

  /** Applies latest position, title, and status styling to an existing truck marker. */
  private updateTruckMarker(
    markerView: TruckMarkerView,
    truck: Truck,
    position: google.maps.LatLngLiteral,
    title: string
  ): void {
    markerView.marker.map = this.map;
    markerView.marker.position = position;
    markerView.marker.title = title;
    markerView.element.className = `truck-map-marker status--${truck.status.toLowerCase()}`;
    markerView.element.setAttribute('role', 'img');
    markerView.element.setAttribute('aria-label', title);
    markerView.element.innerHTML = '<span class="truck-map-marker__dot" aria-hidden="true"></span>';
  }

  /** Wires hover interactions so truck telemetry appears while the marker is focused by pointer. */
  private attachMarkerHover(markerElement: HTMLDivElement, truckId: string): void {
    markerElement.addEventListener('mouseenter', () => {
      this.showTelemetryHover(truckId);
    });

    markerElement.addEventListener('mouseleave', () => {
      if (this.hoveredTruckId === truckId) {
        this.hideTelemetryHover();
      }
    });
  }

  /** Shows the telemetry hover card for the specified truck on the map. */
  private showTelemetryHover(truckId: string): void {
    const truck = this.truckDetails.get(truckId);
    if (!truck || !this.map) return;

    this.hideTelemetryHover();
    this.hoveredTruckId = truckId;

    const position = this.toLatLng(truck.x, truck.y);
    const content = this.renderTelemetryHoverContent(truck);

    this.hoverOverlay = this.createTelemetryOverlay(position, content);
    this.hoverOverlay.setMap(this.map);
  }

  /** Removes the currently displayed telemetry hover overlay from the map. */
  private hideTelemetryHover(): void {
    this.hoverOverlay?.setMap(null);
    this.hoverOverlay = undefined;
    this.hoveredTruckId = undefined;
  }

  /** Clones and populates the hover-card template with live truck telemetry values. */
  private renderTelemetryHoverContent(truck: Truck): HTMLElement | null {
    const templateElement = this.hoverTelemetryTemplate().nativeElement;

    const fragment = templateElement.content.cloneNode(true) as DocumentFragment;
    const root = fragment.firstElementChild as HTMLElement | null;
    if (!root) {
      return null;
    }

    const idElement = root.querySelector<HTMLElement>('[data-role="truck-id"]');
    const statusElement = root.querySelector<HTMLElement>('[data-role="truck-status"]');
    const speedElement = root.querySelector<HTMLElement>('[data-role="truck-speed"]');
    const xElement = root.querySelector<HTMLElement>('[data-role="truck-x"]');
    const yElement = root.querySelector<HTMLElement>('[data-role="truck-y"]');

    if (idElement) idElement.textContent = truck.id;
    if (statusElement) {
      statusElement.textContent = truck.status;
      statusElement.className = `map-hover-status status--${truck.status.toLowerCase()}`;
    }
    if (speedElement) speedElement.textContent = `${truck.speed} km/h`;
    if (xElement) xElement.textContent = `${truck.x.toFixed(0)}`;
    if (yElement) yElement.textContent = `${truck.y.toFixed(0)}`;

    return root;
  }

  /** Creates the overlay container used for the floating telemetry card. */
  private createTelemetryOverlay(position: google.maps.LatLngLiteral, content: HTMLElement | null): google.maps.OverlayView {
    return this.createDomOverlay(position, 'floatPane', 'map-hover-overlay', element => {
      if (content) {
        element.replaceChildren(content);
      }
    });
  }

  /** Converts site coordinates into Google Maps latitude and longitude values. */
  private toLatLng(x: number, y: number): google.maps.LatLngLiteral {
    const xRatio = x / 1000;
    const yRatio = y / 800;

    return {
      lat: this.mapCenter.lat + (0.5 - yRatio) * this.latSpan,
      lng: this.mapCenter.lng + (xRatio - 0.5) * this.lngSpan
    };
  }

  /** Builds geographic bounds for a rectangular zone from site coordinate inputs. */
  private zoneBounds(x: number, y: number, w: number, h: number): google.maps.LatLngBoundsLiteral {
    const northWest = this.toLatLng(x, y);
    const southEast = this.toLatLng(x + w, y + h);

    return {
      north: northWest.lat,
      south: southEast.lat,
      east: southEast.lng,
      west: northWest.lng
    };
  }

  /** Creates the overlay used to render the text label beside a truck marker. */
  private createLabelOverlay(position: google.maps.LatLngLiteral, text: string): google.maps.OverlayView {
    return this.createDomOverlay(
      position,
      'overlayLayer',
      'truck-map-label',
      element => {
        element.textContent = text;
      },
      { x: 0, y: 0 }
    );
  }

  /** Replaces the existing truck label overlay so its screen position stays current. */
  private updateLabelOverlay(truckId: string, position: google.maps.LatLngLiteral): void {
    if (!this.map) return;

    const oldOverlay = this.labelOverlays.get(truckId);
    if (oldOverlay) {
      oldOverlay.setMap(null);
    }

    const overlay = this.createLabelOverlay(position, truckId);
    overlay.setMap(this.map);
    this.labelOverlays.set(truckId, overlay);
  }

  /** Creates a generic DOM-backed Google Maps overlay with optional pixel offset support. */
  private createDomOverlay(
    position: google.maps.LatLngLiteral,
    paneName: OverlayPaneName,
    className: string,
    renderContent: (element: HTMLDivElement) => void,
    offset: { x: number; y: number } = { x: 0, y: 0 }
  ): google.maps.OverlayView {
    const overlay = new google.maps.OverlayView();
    let element: HTMLDivElement | undefined;

    overlay.onAdd = function() {
      element = document.createElement('div');
      element.className = className;
      renderContent(element);

      const panes = this.getPanes();
      panes?.[paneName]?.appendChild(element);
    };

    overlay.draw = function() {
      const projection = this.getProjection();
      if (!projection || !element) {
        return;
      }

      const pixelPosition = projection.fromLatLngToDivPixel(new google.maps.LatLng(position.lat, position.lng));
      if (pixelPosition) {
        element.style.left = `${pixelPosition.x + offset.x}px`;
        element.style.top = `${pixelPosition.y + offset.y}px`;
      }
    };

    overlay.onRemove = function() {
      if (element?.parentNode) {
        element.parentNode.removeChild(element);
      }

      element = undefined;
    };

    return overlay;
  }

  /** Reads a CSS custom property from the document root and returns its trimmed value. */
  private themeColor(variableName: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
  }
}

