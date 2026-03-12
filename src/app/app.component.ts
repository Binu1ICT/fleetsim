import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { UiPreferencesService } from './core/services/ui-preferences.service';
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
export class AppComponent {
  private readonly preferences = inject(UiPreferencesService);

  /** Exposes the active theme mode for the header toggle. */
  readonly themeMode = this.preferences.themeMode;

  /** Applies the selected theme mode from the header switch. */
  toggleTheme(enabled: boolean): void {
    this.preferences.setThemeMode(enabled ? 'dark' : 'light');
  }
}
