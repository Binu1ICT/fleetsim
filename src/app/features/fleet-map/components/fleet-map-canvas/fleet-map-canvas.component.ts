import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { MapTruckViewModel, MapZoneViewModel } from '../../../../interfaces/fleet-map.interfaces';

@Component({
  selector: 'fleet-map-canvas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fleet-map-canvas.component.html',
  styleUrl: './fleet-map-canvas.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Renders the static site map, map zones, and hoverable truck markers. */
export class FleetMapCanvasComponent {
  /** Static map zones shown on the canvas. */
  readonly mapZones = input.required<readonly MapZoneViewModel[]>();
  /** Truck markers currently visible on the map. */
  readonly trucks = input.required<readonly MapTruckViewModel[]>();
  /** Truck currently being hovered or focused. */
  readonly hoveredTruck = input<MapTruckViewModel | undefined>(undefined);
  /** SVG polyline points describing the haul-road path. */
  readonly haulRoadPolylinePoints = input.required<string>();
  /** Empty state message displayed when no trucks are in view. */
  readonly emptyStateMessage = input('');

  /** Emits when a truck marker is hovered or focused. */
  readonly truckHovered = output<string>();
  /** Emits when a truck marker hover or focus ends. */
  readonly truckHoverEnded = output<string | undefined>();
}
