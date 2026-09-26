import type { GeoPoint } from '@/lib/api/models';
import { distanceKm } from '@/lib/geo';

import { COMMISSION_RATE, type RideRate } from './seed';

// Straight-line distance understates road distance; a routing API replaces this.
const ROAD_DISTANCE_FACTOR = 1.3;
const MIN_BILLABLE_KM = 1;
/** Average city speed for goods vehicles, used for trip time estimates. */
const AVERAGE_SPEED_KMPH = 22;
/** Loading/unloading time added to every trip estimate. */
const HANDLING_MINUTES = 10;

export function roadDistanceKm(from: GeoPoint, to: GeoPoint): number {
  const km = Math.max(MIN_BILLABLE_KM, distanceKm(from, to) * ROAD_DISTANCE_FACTOR);
  return Math.round(km * 10) / 10;
}

export function fareFor(rate: RideRate, km: number): number {
  return Math.round(rate.baseFare + rate.perKmRate * km);
}

export function commissionFor(fare: number): number {
  return Math.round(fare * COMMISSION_RATE);
}

export function tripMinutes(km: number): number {
  return Math.round((km / AVERAGE_SPEED_KMPH) * 60) + HANDLING_MINUTES;
}
