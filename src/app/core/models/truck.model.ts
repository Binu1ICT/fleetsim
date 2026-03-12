/**
 * Truck operational status.
 * - LOADING: Truck is at the loading zone, being loaded with material.
 * - HAULING: Truck is in transit from loading to dump zone with material.
 * - DUMPING: Truck is at the dump zone, dumping material.
 * - IDLE: Truck is idle, waiting or between operations.
 */
export type TruckStatus = 'LOADING' | 'HAULING' | 'DUMPING' | 'IDLE';

/**
 * Truck entity representing a vehicle in the fleet.
 * Tracks position, speed, current operation status, and identity.
 */
export interface Truck {
  /** Unique truck identifier */
  id: string;
  /** X coordinate on the 2D map (0-1000) */
  x: number;
  /** Y coordinate on the 2D map (0-800) */
  y: number;
  /** Current speed in km/h */
  speed: number;
  /** Current operational status */
  status: TruckStatus;
}
