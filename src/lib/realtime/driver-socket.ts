/**
 * Driver realtime transport. The backend has no per-driver socket: offers come over SSE (see
 * offer-stream.ts) and jobs, chat and payments are refetched by polling. Subscribing is therefore a no-op, so the app does not
 * loop on a socket the server rejects.
 */
import type { DriverEvent } from './driver-events';

type Listener = (event: DriverEvent) => void;

export const driverChannel = (userId: string) => `driver:${userId}`;

/** Subscribes to the driver's channel; returns an unsubscribe function. */
export function subscribeToDriverChannel(_channel: string, _listener: Listener): () => void {
  return () => {};
}
