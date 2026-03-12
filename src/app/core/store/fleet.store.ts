import { Injectable, signal, computed } from '@angular/core';
import { Truck } from '../models/truck.model';

@Injectable({ providedIn: 'root' })
/** Signal-backed store that owns fleet telemetry and mutation diagnostics. */
export class FleetStore {
  private readonly _trucks = signal<Truck[]>([]);
  private readonly _errors = signal<string[]>([]);

  /** Read-only fleet collection exposed to consumers. */
  readonly trucks = computed(() => this._trucks());
  /** Read-only list of validation or mutation errors. */
  readonly errors = computed(() => this._errors());

  /** Replace the full fleet state. */
  set(trucks: Truck[]): void {
    this.executeStoreOperation('set trucks', () => {
      this.assertTruckList(trucks);
      this._trucks.set(trucks);
      this.clearErrors();
    });
  }

  /** Replace one truck entry when the id already exists. */
  update(truck: Truck): void {
    this.executeStoreOperation(`update truck ${truck?.id}`, () => {
      this.assertTruck(truck);
      this._trucks.update(list => this.replaceTruckById(list, truck));
      this.clearErrors();
    });
  }

  /** Insert or replace a truck by id. */
  upsert(truck: Truck): void {
    this.executeStoreOperation(`upsert truck ${truck?.id}`, () => {
      this.assertTruck(truck);
      this._trucks.update(list => this.upsertTruckById(list, truck));
      this.clearErrors();
    });
  }

  /** Insert or replace many trucks in a single state update. */
  upsertMany(trucks: Truck[]): void {
    this.executeStoreOperation('upsert trucks', () => {
      this.assertTruckList(trucks);
      this._trucks.update(current => {
        const byId = new Map(current.map(truck => [truck.id, truck] as const));

        for (const truck of trucks) {
          byId.set(truck.id, truck);
        }

        return Array.from(byId.values());
      });
      this.clearErrors();
    });
  }

  /** Execute a store mutation and record a readable error when it fails. */
  private executeStoreOperation(context: string, operation: () => void): void {
    try {
      operation();
    } catch (error) {
      this.handleError(`Failed to ${context}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /** Ensure an individual truck is valid before mutating state. */
  private assertTruck(truck: Truck): asserts truck is Truck {
    if (!truck || !truck.id) {
      throw new Error('Invalid truck: missing id');
    }
  }

  /** Ensure an array of trucks is provided and that every item has an id. */
  private assertTruckList(trucks: Truck[]): void {
    if (!Array.isArray(trucks)) {
      throw new Error('Trucks must be an array');
    }

    for (const truck of trucks) {
      this.assertTruck(truck);
    }
  }

  /** Replace an existing truck by id while preserving the rest of the list. */
  private replaceTruckById(list: Truck[], truck: Truck): Truck[] {
    return list.map(currentTruck => currentTruck.id === truck.id ? truck : currentTruck);
  }

  /** Insert a truck when absent, otherwise replace the existing entry. */
  private upsertTruckById(list: Truck[], truck: Truck): Truck[] {
    const index = list.findIndex(currentTruck => currentTruck.id === truck.id);

    if (index === -1) {
      return [...list, truck];
    }

    const next = [...list];
    next[index] = truck;
    return next;
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
