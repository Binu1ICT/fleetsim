import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, effect, inject, signal } from '@angular/core';
import type { ContrastMode, DensityMode, ThemeMode } from '../../interfaces/fleet-map.interfaces';

/** Local storage keys used to persist UI preferences between sessions. */
const STORAGE_KEYS = {
  theme: 'fleet.preferences.theme',
  density: 'fleet.preferences.density',
  contrast: 'fleet.preferences.contrast',
  reducedMotion: 'fleet.preferences.reduced-motion'
} as const;

@Injectable({ providedIn: 'root' })
/** Manages persisted theme and accessibility preferences for the application shell. */
export class UiPreferencesService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  /** Active theme mode synchronized to the document root. */
  readonly themeMode = signal<ThemeMode>(this.readStoredValue<ThemeMode>(STORAGE_KEYS.theme, ['light', 'dark'], 'light'));
  /** Active density mode synchronized to the document root. */
  readonly densityMode = signal<DensityMode>(this.readStoredValue<DensityMode>(STORAGE_KEYS.density, ['comfortable', 'compact'], 'comfortable'));
  /** Active contrast mode synchronized to the document root. */
  readonly contrastMode = signal<ContrastMode>(this.readStoredValue<ContrastMode>(STORAGE_KEYS.contrast, ['default', 'high'], 'default'));
  /** Whether reduced motion should be applied across the document. */
  readonly reducedMotion = signal<boolean>(this.readStoredBoolean(STORAGE_KEYS.reducedMotion, false));

  /** Reactively applies persisted preferences to the document element. */
  constructor() {
    effect(() => {
      this.applyDocumentPreferences({
        theme: this.themeMode(),
        density: this.densityMode(),
        contrast: this.contrastMode(),
        reducedMotion: this.reducedMotion()
      });
    });
  }

  /** Updates and persists the active theme mode. */
  setThemeMode(mode: ThemeMode): void {
    this.themeMode.set(mode);
    this.storeValue(STORAGE_KEYS.theme, mode);
  }

  /** Updates and persists the active density mode. */
  setDensityMode(mode: DensityMode): void {
    this.densityMode.set(mode);
    this.storeValue(STORAGE_KEYS.density, mode);
  }

  /** Updates and persists the active contrast mode. */
  setContrastMode(mode: ContrastMode): void {
    this.contrastMode.set(mode);
    this.storeValue(STORAGE_KEYS.contrast, mode);
  }

  /** Updates and persists the reduced-motion preference. */
  setReducedMotion(enabled: boolean): void {
    this.reducedMotion.set(enabled);
    this.storeValue(STORAGE_KEYS.reducedMotion, JSON.stringify(enabled));
  }

  /** Applies the current UI preferences as data attributes on the document root. */
  private applyDocumentPreferences(preferences: {
    theme: ThemeMode;
    density: DensityMode;
    contrast: ContrastMode;
    reducedMotion: boolean;
  }): void {
    const root = this.document?.documentElement;
    if (!root) {
      return;
    }

    root.dataset.theme = preferences.theme;
    root.dataset.density = preferences.density;
    root.dataset.contrast = preferences.contrast;
    root.dataset.motion = preferences.reducedMotion ? 'reduced' : 'default';
  }

  /** Reads a persisted string value when it matches the supplied whitelist. */
  private readStoredValue<T extends string>(key: string, validValues: readonly T[], fallback: T): T {
    if (!this.isBrowser) {
      return fallback;
    }

    const value = localStorage.getItem(key);
    return value && validValues.includes(value as T) ? (value as T) : fallback;
  }

  /** Reads a persisted boolean preference value from local storage. */
  private readStoredBoolean(key: string, fallback: boolean): boolean {
    if (!this.isBrowser) {
      return fallback;
    }

    const value = localStorage.getItem(key);
    return value === null ? fallback : value === 'true';
  }

  /** Persists a string preference value when running in the browser. */
  private storeValue(key: string, value: string): void {
    if (!this.isBrowser) {
      return;
    }

    localStorage.setItem(key, value);
  }
}
