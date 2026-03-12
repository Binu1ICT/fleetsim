import { Injectable, signal, computed } from '@angular/core';
import { Truck } from '../models/truck.model';

@Injectable({ providedIn: 'root' })
export class FleetStore {
  private readonly _trucks = signal<Truck[]>([]);
  private readonly _errors = signal<string[]>([]);

  readonly trucks = computed(() => this._trucks());
  readonly errors = computed(() => this._errors());

  /** Replace the full fleet state. */
  set(trucks: Truck[]): void {
    try {
      if (!Array.isArray(trucks)) {
        throw new Error('Trucks must be an array');
      }
      this._trucks.set(trucks);
      this.clearErrors();
    } catch (error) {
      this.handleError(`Failed to set trucks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /** Replace one truck entry when the id already exists. */
  update(truck: Truck): void {
    try {
      if (!truck || !truck.id) {
        throw new Error('Invalid truck: missing id');
      }
      this._trucks.update(list =>
        list.map(t => t.id === truck.id ? truck : t)
      );
      this.clearErrors();
    } catch (error) {
      this.handleError(`Failed to update truck ${truck?.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /** Insert or replace a truck by id. */
  upsert(truck: Truck): void {
    try {
      if (!truck || !truck.id) {
        throw new Error('Invalid truck: missing id');
      }

      this._trucks.update(list => {
        const index = list.findIndex(t => t.id === truck.id);
        if (index === -1) {
          return [...list, truck];
        }
        const next = [...list];
        next[index] = truck;
        return next;
      });
      this.clearErrors();
    } catch (error) {
      this.handleError(`Failed to upsert truck ${truck?.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /** Insert or replace many trucks in a single state update. */
  upsertMany(trucks: Truck[]): void {
    try {
      if (!Array.isArray(trucks)) {
        throw new Error('Trucks must be an array');
      }

      this._trucks.update(current => {
        const byId = new Map(current.map(truck => [truck.id, truck]));
        for (const truck of trucks) {
          if (truck?.id) {
            byId.set(truck.id, truck);
          }
        }
        return Array.from(byId.values());
      });
      this.clearErrors();
    } catch (error) {
      this.handleError(`Failed to upsert trucks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /** Record a store error for diagnostics and UI display. */
  private handleError(message: string): void {
    console.error('[FleetStore Error]', message);
    this._errors.update(errors => [...errors, message]);
  }

  /** Clear all stored error messages. */
  private clearErrors(): void {
    this._errors.set([]);
  }
}
