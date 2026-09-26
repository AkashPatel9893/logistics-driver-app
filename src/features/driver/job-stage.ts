import type { OrderStatus } from '@/lib/api/models';

/** Short stage copy for the driver's current trip. */
export const JOB_STAGE_LABEL: Record<OrderStatus, string> = {
  searching: 'Waiting',
  heading_to_pickup: 'Heading to pickup',
  arrived_at_pickup: 'At pickup',
  pickup_complete: 'Heading to drop',
  arrived_at_drop: 'At drop',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

/** Which stop the driver is working towards. */
export function currentStop(status: OrderStatus): 'pickup' | 'drop' {
  return status === 'heading_to_pickup' || status === 'arrived_at_pickup' ? 'pickup' : 'drop';
}
