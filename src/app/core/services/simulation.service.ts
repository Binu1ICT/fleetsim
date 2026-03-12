import { Injectable, NgZone, OnDestroy, inject } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import {
  ACTIVE_SPEED_RANGE,
  DUMP_DWELL_TICKS,
  DUMP_RECENTER_FACTOR,
  DUMP_ZONE,
  DUMP_ROUTE_MOVEMENT_FACTOR,
  HAUL_ROAD_TO_DUMP,
  HAUL_ROAD_TO_LOAD,
  INITIAL_MOVING_SPEED_RANGE,
  INITIAL_STATUSES,
  INITIAL_TRUCK_COUNT,
  INITIAL_X_RANGE,
  INITIAL_Y_RANGE,
  JITTER_RANGE,
  LOAD_ROUTE_MOVEMENT_FACTOR,
  LOADING_ZONE,
  RETURN_IDLE_CHANCE,
  SimulationDestination,
  SimulationPoint,
  SimulationZone,
  SIMULATION_TICK_MS,
  WAYPOINT_PROXIMITY_THRESHOLD
} from '../constants/simulation.constants';
import { FleetStore } from '../store/fleet.store';
import { Truck } from '../models/truck.model';
import { TRUCK_STATUS } from '../constants/truck-status.constants';

@Injectable({ providedIn: 'root' })
/**
 * Drives the truck movement simulation.
 * Manages the simulation loop, route progression, zone transitions,
 * and synchronized updates to the fleet store.
 */
export class SimulationService implements OnDestroy {
  private readonly loadingZone = LOADING_ZONE;
  private readonly dumpZone = DUMP_ZONE;
  private readonly dumpZoneCenter = this.zoneCenter(this.dumpZone);
  private readonly truckDwellTime = new Map<string, number>();
  private readonly truckDestination = new Map<string, SimulationDestination>();
  private readonly truckPathIndex = new Map<string, number>();
  private readonly truckPath = new Map<string, readonly SimulationPoint[]>();

  private readonly store = inject(FleetStore);
  private readonly ngZone = inject(NgZone);

  private tickSub?: Subscription;

  /** Seeds the initial fleet and starts the simulation loop when the service is created. */
  constructor() {
    this.initFleet();
    this.start();
  }

  /** Release the simulation subscription when Angular destroys the service. */
  ngOnDestroy(): void {
    this.stop();
  }

  /** Start the simulation loop when it is not already running. */
  start(): void {
    if (this.tickSub && !this.tickSub.closed) {
      return;
    }
    this.ngZone.runOutsideAngular(() => {
      this.tickSub = interval(SIMULATION_TICK_MS).subscribe({
        next: () => {
          this.ngZone.run(() => this.tick());
        },
        error: (error: unknown) => this.handleSimulationError('Tick interval error', error)
      });
    });
  }

  /** Stop the simulation loop and release the subscription. */
  stop(): void {
    try {
      this.tickSub?.unsubscribe();
      this.tickSub = undefined;
    } catch (error) {
      this.handleSimulationError('Failed to stop simulation', error);
    }
  }

  /** Return whether the simulation loop is active. */
  isRunning(): boolean {
    return !!this.tickSub && !this.tickSub.closed;
  }

  /** Seed the store with an initial fleet state. */
  initFleet(): void {
    try {
      const trucks = Array.from({ length: INITIAL_TRUCK_COUNT }, (_, index) => this.createInitialTruck(index + 1));

      trucks.forEach(truck => {
        this.setDestination(truck.id, this.destinationForStatus(truck.status));
      });

      this.store.set(trucks);
    } catch (error) {
      this.handleSimulationError('Fleet initialization failed', error);
    }
  }

  /** Advance every truck by one simulation tick. */
  tick(): void {
    try {
      const trucks = this.store.trucks();
      if (!trucks?.length) {
        return;
      }

      this.store.set(trucks.map(truck => this.move(truck)));
    } catch (error) {
      this.handleSimulationError('Simulation tick failed', error);
    }
  }

  /** Log a simulation error with its calling context. */
  private handleSimulationError(context: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[SimulationService Error] ${context}: ${message}`);
  }

  /** Safely update a truck's position and status. */
  move(t: Truck): Truck {
    try {
      return this.moveInternal(t);
    } catch (error) {
      this.handleSimulationError(`Move failed for truck ${t?.id}`, error);
      return t;
    }
  }

  /** Choose the haul road that matches the current destination. */
  private generateRoadPath(destination: SimulationDestination): readonly SimulationPoint[] {
    return destination === 'dump' ? HAUL_ROAD_TO_DUMP : HAUL_ROAD_TO_LOAD;
  }

  /** Run the core movement logic for a truck. */
  private moveInternal(t: Truck): Truck {
    const inLoading = this.inZone(t.x, t.y, this.loadingZone);
    const inDump = this.inZone(t.x, t.y, this.dumpZone);
    const currentDestination = this.getDestination(t, inLoading, inDump);

    if (t.status === TRUCK_STATUS.DUMPING) {
      const dwell = (this.truckDwellTime.get(t.id) ?? 0) + 1;
      this.truckDwellTime.set(t.id, dwell);

      if (dwell < DUMP_DWELL_TICKS) {
        const x = t.x + (this.dumpZoneCenter.x - t.x) * DUMP_RECENTER_FACTOR + this.rand(JITTER_RANGE.min, JITTER_RANGE.max);
        const y = t.y + (this.dumpZoneCenter.y - t.y) * DUMP_RECENTER_FACTOR + this.rand(JITTER_RANGE.min, JITTER_RANGE.max);
        return { ...t, x, y, speed: 0, status: TRUCK_STATUS.DUMPING };
      }

      this.truckDwellTime.delete(t.id);
      this.prepareTruckForDestination(t.id, 'load');
    } else {
      this.truckDwellTime.delete(t.id);
    }

    const headingToDump = currentDestination === 'dump';
    const { path, pathIndex } = this.ensureTruckPath(t, currentDestination);
    const nextPosition = this.moveTowardsWaypoint(t, path, pathIndex, headingToDump);
    const { x, y } = nextPosition;

    if (this.inZone(x, y, this.dumpZone) && t.status !== TRUCK_STATUS.DUMPING) {
      return this.enterDumpState(t, x, y);
    }

    let status: Truck['status'];
    if (this.inZone(x, y, this.loadingZone)) {
      status = TRUCK_STATUS.LOADING;
      this.prepareTruckForDestination(t.id, 'dump');
    } else if (this.inZone(x, y, this.dumpZone)) {
      status = TRUCK_STATUS.DUMPING;
      this.prepareTruckForDestination(t.id, 'load');
    } else {
      status = this.resolveTravelStatus(headingToDump);
    }

    const speed = this.speedForStatus(status);

    return { ...t, x, y, speed, status };
  }

  /** Enter the dump state and prepare the return trip. */
  private enterDumpState(truck: Truck, x: number, y: number): Truck {
    this.truckDwellTime.set(truck.id, 1);
    this.prepareTruckForDestination(truck.id, 'load');

    return {
      ...truck,
      x,
      y,
      speed: 0,
      status: TRUCK_STATUS.DUMPING
    };
  }

  /** Resolve the current destination for a truck. */
  private getDestination(t: Truck, inLoading: boolean, inDump: boolean): SimulationDestination {
    if (inLoading) {
      this.setDestination(t.id, 'dump');
      return 'dump';
    }

    if (inDump || t.status === TRUCK_STATUS.DUMPING) {
      this.setDestination(t.id, 'load');
      return 'load';
    }

    const existing = this.truckDestination.get(t.id);
    if (existing) return existing;

    const initial = this.destinationForStatus(t.status);
    this.setDestination(t.id, initial);
    return initial;
  }

  /** Check whether a point falls inside a zone. */
  private inZone(x: number, y: number, zone: SimulationZone): boolean {
    return x >= zone.x && x <= zone.x + zone.w && y >= zone.y && y <= zone.y + zone.h;
  }

  /** Creates the initial telemetry snapshot for a truck using configured random ranges. */
  private createInitialTruck(index: number): Truck {
    const status = INITIAL_STATUSES[this.rand(0, INITIAL_STATUSES.length - 1)];

    return {
      id: `T-${index.toString().padStart(3, '0')}`,
      x: this.rand(INITIAL_X_RANGE.min, INITIAL_X_RANGE.max),
      y: this.rand(INITIAL_Y_RANGE.min, INITIAL_Y_RANGE.max),
      speed: this.isStationaryStatus(status) ? 0 : this.rand(INITIAL_MOVING_SPEED_RANGE.min, INITIAL_MOVING_SPEED_RANGE.max),
      status
    };
  }

  /** Ensures a truck has a valid haul-road path and current waypoint index. */
  private ensureTruckPath(t: Truck, destination: SimulationDestination): { path: readonly SimulationPoint[]; pathIndex: number } {
    let path = this.truckPath.get(t.id);
    let pathIndex = this.truckPathIndex.get(t.id) || 0;

    if (!path || pathIndex >= path.length - 1) {
      path = this.generateRoadPath(destination);
      pathIndex = this.findNearestWaypointIndex(path, t);
      this.truckPath.set(t.id, path);
      this.truckPathIndex.set(t.id, pathIndex);
    }

    return { path, pathIndex };
  }

  /** Moves a truck toward its next waypoint or advances to the next waypoint when close enough. */
  private moveTowardsWaypoint(t: Truck, path: readonly SimulationPoint[], pathIndex: number, headingToDump: boolean): SimulationPoint {
    const nextWaypoint = path[Math.min(pathIndex + 1, path.length - 1)];
    const dx = nextWaypoint.x - t.x;
    const dy = nextWaypoint.y - t.y;
    const distance = Math.hypot(dx, dy);

    if (distance < WAYPOINT_PROXIMITY_THRESHOLD) {
      this.truckPathIndex.set(t.id, pathIndex + 1);
      return nextWaypoint;
    }

    const movementFactor = headingToDump ? DUMP_ROUTE_MOVEMENT_FACTOR : LOAD_ROUTE_MOVEMENT_FACTOR;
    return {
      x: t.x + dx * movementFactor,
      y: t.y + dy * movementFactor
    };
  }

  /** Finds the closest waypoint on a route to the truck's current position. */
  private findNearestWaypointIndex(path: readonly SimulationPoint[], position: SimulationPoint): number {
    let closestIndex = 0;
    let minDistance = Infinity;

    for (let index = 0; index < path.length; index++) {
      const distance = Math.hypot(path[index].x - position.x, path[index].y - position.y);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    }

    return closestIndex;
  }

  /** Calculates the center point of a configured simulation zone. */
  private zoneCenter(zone: SimulationZone): SimulationPoint {
    return {
      x: zone.x + zone.w / 2,
      y: zone.y + zone.h / 2
    };
  }

  /** Clears any cached route and waypoint progress for a truck. */
  private clearTruckRoute(truckId: string): void {
    this.truckPath.delete(truckId);
    this.truckPathIndex.delete(truckId);
  }

  /** Update the current destination and reset any cached path progress. */
  private prepareTruckForDestination(truckId: string, destination: SimulationDestination): void {
    this.setDestination(truckId, destination);
    this.clearTruckRoute(truckId);
  }

  /** Stores the active destination a truck is currently traveling toward. */
  private setDestination(truckId: string, destination: SimulationDestination): void {
    this.truckDestination.set(truckId, destination);
  }

  /** Maps an operational status to the next logical travel destination. */
  private destinationForStatus(status: Truck['status']): SimulationDestination {
    return status === TRUCK_STATUS.LOADING || status === TRUCK_STATUS.IDLE ? 'dump' : 'load';
  }

  /** Resolves the in-transit status for a truck based on its current trip direction. */
  private resolveTravelStatus(headingToDump: boolean): Truck['status'] {
    if (headingToDump) {
      return TRUCK_STATUS.HAULING;
    }

    return Math.random() > RETURN_IDLE_CHANCE ? TRUCK_STATUS.HAULING : TRUCK_STATUS.IDLE;
  }

  /** Determines the speed to assign for the supplied operational status. */
  private speedForStatus(status: Truck['status']): number {
    return this.isStationaryStatus(status)
      ? 0
      : this.rand(ACTIVE_SPEED_RANGE.min, ACTIVE_SPEED_RANGE.max);
  }

  /** Indicates whether a status should keep the truck stationary. */
  private isStationaryStatus(status: Truck['status']): boolean {
    return status === TRUCK_STATUS.LOADING || status === TRUCK_STATUS.DUMPING || status === TRUCK_STATUS.IDLE;
  }

  /** Generate a random integer within the supplied range. */
  private rand(min: number, max: number): number {
    try {
      if (!Number.isFinite(min) || !Number.isFinite(max)) {
        throw new Error(`Invalid parameters: min=${min}, max=${max}`);
      }
      if (min > max) {
        [min, max] = [max, min];
      }
      return Math.floor(Math.random() * (max - min + 1)) + min;
    } catch (error) {
      console.error('[SimulationService] Random number generation failed:', error);
      return Math.floor((min + max) / 2);
    }
  }
}
