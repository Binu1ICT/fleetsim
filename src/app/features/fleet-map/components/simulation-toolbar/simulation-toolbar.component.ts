import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { SimulationSettingsViewModel, StatusFilterOptionViewModel } from '../../../../interfaces/fleet-map.interfaces';
import type { TruckStatus } from '../../../../core/models/truck.model';
import { SIMULATION_SETTING_LIMITS } from '../../../../constants/simulation.constants';

@Component({
  selector: 'fleet-simulation-toolbar',
  standalone: true,
  templateUrl: './simulation-toolbar.component.html',
  styleUrl: './simulation-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Presents the main simulation controls, filters, and runtime tuning inputs. */
export class SimulationToolbarComponent {
  /** Indicates whether the simulation loop is currently running. */
  readonly running = input.required<boolean>();
  /** Number of trucks currently visible after filters are applied. */
  readonly truckCount = input.required<number>();
  /** Total number of trucks currently seeded in the simulation. */
  readonly totalTruckCount = input.required<number>();
  /** Current truck id search value. */
  readonly searchTerm = input('');
  /** Indicates whether any fleet filters are active. */
  readonly hasActiveFilters = input(false);
  /** Current runtime simulation settings. */
  readonly settings = input.required<SimulationSettingsViewModel>();
  /** Status filter chip view models. */
  readonly filters = input.required<readonly StatusFilterOptionViewModel[]>();
  /** Slider limits used by the toolbar controls. */
  readonly limits = input<typeof SIMULATION_SETTING_LIMITS>(SIMULATION_SETTING_LIMITS);

  /** Emitted when the user toggles the simulation state. */
  readonly toggleSimulation = output<void>();
  /** Emitted when the user changes the search term. */
  readonly searchTermChange = output<string>();
  /** Emitted when the user toggles a status filter. */
  readonly statusToggle = output<TruckStatus>();
  /** Emitted when the user clears all active filters. */
  readonly clearFilters = output<void>();
  /** Emitted when the fleet size slider changes. */
  readonly truckCountChange = output<number>();
  /** Emitted when the tick interval slider changes. */
  readonly tickMsChange = output<number>();
  /** Emitted when the dump dwell time slider changes. */
  readonly dumpDwellTicksChange = output<number>();
  /** Emitted when the user resets the simulation scenario. */
  readonly resetScenario = output<void>();

  /** Reads the search input value and forwards it to the container. */
  handleSearchInput(event: Event): void {
    this.searchTermChange.emit((event.target as HTMLInputElement).value);
  }

  /** Forwards a status filter toggle to the container. */
  handleStatusToggle(status: TruckStatus): void {
    this.statusToggle.emit(status);
  }

  /** Reads the fleet size slider value and emits it as a number. */
  handleTruckCountInput(event: Event): void {
    this.truckCountChange.emit(Number((event.target as HTMLInputElement).value));
  }

  /** Reads the tick interval slider value and emits it as a number. */
  handleTickMsInput(event: Event): void {
    this.tickMsChange.emit(Number((event.target as HTMLInputElement).value));
  }

  /** Reads the dump dwell slider value and emits it as a number. */
  handleDumpDwellInput(event: Event): void {
    this.dumpDwellTicksChange.emit(Number((event.target as HTMLInputElement).value));
  }
}
