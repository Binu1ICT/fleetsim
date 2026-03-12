import { FleetStore } from './fleet.store';
import { Truck } from '../models/truck.model';
import { TRUCK_STATUS } from '../../constants/truck-status.constants';

/** Verifies fleet state mutations and validation error handling. */
describe('FleetStore', () => {
  let store: FleetStore;

  beforeEach(() => {
    spyOn(console, 'error');
    store = new FleetStore();
  });

  it('should set and return trucks', () => {
    const trucks: Truck[] = [
      { id: 'T-001', x: 100, y: 100, speed: 0, status: TRUCK_STATUS.LOADING }
    ];

    store.set(trucks);

    const current = store.trucks();
    expect(current.length).toBe(1);
    expect(current[0].id).toBe('T-001');
  });

  it('should update an existing truck', () => {
    const trucks: Truck[] = [
      { id: 'T-001', x: 100, y: 100, speed: 0, status: TRUCK_STATUS.LOADING }
    ];
    store.set(trucks);

    const updated: Truck = { id: 'T-001', x: 200, y: 200, speed: 30, status: TRUCK_STATUS.HAULING };
    store.update(updated);

    const current = store.trucks();
    expect(current[0].x).toBe(200);
    expect(current[0].status).toBe(TRUCK_STATUS.HAULING);
  });

  it('should record error on invalid set input', () => {
    store.set(null as never);
    const errors = store.errors();
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('Failed to set trucks');
  });

  it('should record error on invalid update input', () => {
    store.update({} as Truck);
    const errors = store.errors();
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('Failed to update truck');
  });
});
