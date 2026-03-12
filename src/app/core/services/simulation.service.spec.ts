import { TestBed } from '@angular/core/testing';
import { INITIAL_TRUCK_COUNT } from '../constants/simulation.constants';
import { TRUCK_STATUS } from '../constants/truck-status.constants';
import { Truck } from '../models/truck.model';
import { FleetStore } from '../store/fleet.store';
import { SimulationService } from './simulation.service';

describe('SimulationService', () => {
  let service: SimulationService;
  let mockStore: jasmine.SpyObj<Pick<FleetStore, 'set' | 'update' | 'trucks'>>;

  beforeEach(() => {
    mockStore = jasmine.createSpyObj<Pick<FleetStore, 'set' | 'update' | 'trucks'>>('FleetStore', ['set', 'update', 'trucks']);
    mockStore.trucks.and.returnValue([]);

    TestBed.configureTestingModule({
      providers: [
        SimulationService,
        { provide: FleetStore, useValue: mockStore }
      ]
    });

    service = TestBed.inject(SimulationService);
  });

  afterEach(() => {
    try { service.stop(); } catch { }
  });

  it('should initialize fleet on construction', () => {
    expect(mockStore.set).toHaveBeenCalled();
  });

  it('should seed the configured number of trucks with valid ids and statuses', () => {
    const seededTrucks = mockStore.set.calls.mostRecent().args[0] as Truck[];

    expect(seededTrucks.length).toBe(INITIAL_TRUCK_COUNT);
    seededTrucks.forEach((truck, index) => {
      expect(truck.id).toBe(`T-${(index + 1).toString().padStart(3, '0')}`);
      expect(Object.values(TRUCK_STATUS)).toContain(truck.status);
      expect(typeof truck.x).toBe('number');
      expect(typeof truck.y).toBe('number');
      expect(typeof truck.speed).toBe('number');
    });
  });

  it('move should return a truck object with numeric coordinates and valid status', () => {
    const truck = { id: 'T-001', x: 100, y: 100, speed: 0, status: 'LOADING' };
    const updated = service.move(truck as any);
    expect(typeof updated.x).toBe('number');
    expect(typeof updated.y).toBe('number');
    expect(['LOADING','HAULING','DUMPING','IDLE']).toContain(updated.status);
  });

  it('should batch truck updates into a single store.set call during tick', () => {
    const trucks: Truck[] = [
      { id: 'T-001', x: 100, y: 100, speed: 0, status: TRUCK_STATUS.LOADING },
      { id: 'T-002', x: 200, y: 200, speed: 30, status: TRUCK_STATUS.HAULING }
    ];
    mockStore.trucks.and.returnValue(trucks);
    mockStore.set.calls.reset();

    service.tick();

    expect(mockStore.set).toHaveBeenCalledTimes(1);
    const updatedTrucks = mockStore.set.calls.mostRecent().args[0] as Truck[];
    expect(updatedTrucks.length).toBe(trucks.length);
    expect(updatedTrucks.map(truck => truck.id)).toEqual(trucks.map(truck => truck.id));
  });
});
