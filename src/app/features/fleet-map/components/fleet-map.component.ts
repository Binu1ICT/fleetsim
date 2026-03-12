import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { SimulationService } from '../../../core/services/simulation.service';
import { FleetMapCanvasComponent } from './fleet-map-canvas/fleet-map-canvas.component';
import { FleetStatusLegendComponent } from './fleet-status-legend/fleet-status-legend.component';
import { FleetSummaryTilesComponent } from './fleet-summary-tiles/fleet-summary-tiles.component';
import { FleetTelemetryListComponent } from './fleet-telemetry-list/fleet-telemetry-list.component';
import { SimulationToolbarComponent } from './simulation-toolbar/simulation-toolbar.component';
import { FleetDashboardFacade } from '../facades/fleet-dashboard.facade';

@Component({
  selector: 'fleet-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    SimulationToolbarComponent,
    FleetSummaryTilesComponent,
    FleetStatusLegendComponent,
    FleetTelemetryListComponent,
    FleetMapCanvasComponent
  ],
  providers: [FleetDashboardFacade],
  templateUrl: './fleet-map.component.html',
  styleUrl: './fleet-map.component.scss'
})
/**
 * Presents the live fleet dashboard, including summary tiles, legend,
 * truck telemetry, and the static site map view.
 */
export class FleetMapComponent implements OnInit, OnDestroy {
  readonly facade = inject(FleetDashboardFacade);
  readonly tileDragStartDelay = { touch: 140, mouse: 0 };

  private readonly sim = inject(SimulationService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly beforeUnloadHandler = () => this.stopSimulationSafely();

  ngOnInit(): void {
    if (this.isBrowser) {
      window.addEventListener('beforeunload', this.beforeUnloadHandler);
    }
  }

  ngOnDestroy(): void {
    if (this.isBrowser) {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
    }

    this.stopSimulationSafely();
  }

  /** Stops the simulation while swallowing teardown errors during browser unload. */
  private stopSimulationSafely(): void {
    try {
      this.sim.stop();
      this.facade.running.set(false);
    } catch (error) {
      console.error('[FleetMapComponent] Error stopping simulation', error);
    }
  }
}

