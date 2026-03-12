/**
 * Truck status constants
 * Used throughout the application to represent different states of a truck
 */
export const TRUCK_STATUS = {
  LOADING: 'LOADING',
  IDLE: 'IDLE',
  DUMPING: 'DUMPING',
  HAULING: 'HAULING'
} as const;

/** Union type of all supported truck status values. */
export type TruckStatusType = typeof TRUCK_STATUS[keyof typeof TRUCK_STATUS];
