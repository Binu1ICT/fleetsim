import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FleetMapComponent } from './features/fleet-map/components/fleet-map.component';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FleetMapComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
/**
 * Root application shell.
 * Hosts the page chrome and renders the fleet dashboard feature.
 */
export class AppComponent {}
