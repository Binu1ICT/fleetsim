import { FleetStore } from './fleet.store';
import { Truck } from '../models/truck.model';

describe('FleetStore', () => {
  let store: FleetStore;

  beforeEach(() => {
    store = new FleetStore();
  });

  it('should set and return trucks', () => {
    const trucks: Truck[] = [
      { id: 'T-001', x: 100, y: 100, speed: 0, status: 'LOADING' }
    ];

    store.set(trucks);

    const current = store.trucks();
    expect(current.length).toBe(1);
    expect(current[0].id).toBe('T-001');
  });

  it('should update an existing truck', () => {
    const trucks: Truck[] = [
      { id: 'T-001', x: 100, y: 100, speed: 0, status: 'LOADING' }
    ];
    store.set(trucks);

    const updated: Truck = { id: 'T-001', x: 200, y: 200, speed: 30, status: 'HAULING' };
    store.update(updated);

    const current = store.trucks();
    expect(current[0].x).toBe(200);
    expect(current[0].status).toBe('HAULING');
  });

  it('should record error on invalid set input', () => {
    // @ts-ignore trigger invalid input
    store.set(null);
    const errors = store.errors();
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('Failed to set trucks');
  });

  it('should record error on invalid update input', () => {
    // @ts-ignore invalid truck
    store.update({});
    const errors = store.errors();
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('Failed to update truck');
  });
});
