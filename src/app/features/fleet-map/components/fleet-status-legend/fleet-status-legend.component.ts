import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import type { LegendItemViewModel } from '../../../../interfaces/fleet-map.interfaces';

@Component({
  selector: 'fleet-status-legend',
  standalone: true,
  imports: [MatExpansionModule],
  templateUrl: './fleet-status-legend.component.html',
  styleUrl: './fleet-status-legend.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Wraps the expandable legend that explains truck status colors and markers. */
export class FleetStatusLegendComponent {
  /** Legend entries rendered inside the accordion panel. */
  readonly legendItems = input.required<readonly LegendItemViewModel[]>();
}
