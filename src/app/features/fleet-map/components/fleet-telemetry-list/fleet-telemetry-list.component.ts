import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Truck } from '../../../../core/models/truck.model';

@Component({
  selector: 'fleet-telemetry-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fleet-telemetry-list.component.html',
  styleUrl: './fleet-telemetry-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Displays the filtered fleet telemetry list beside the map canvas. */
export class FleetTelemetryListComponent {
  /** Trucks currently visible after dashboard filtering. */
  readonly trucks = input.required<readonly Truck[]>();
  /** Empty-state helper copy shown when no trucks match the filters. */
  readonly emptyStateMessage = input('');
  /** Assistive supporting text announced above the telemetry list. */
  readonly headline = input('');
}
