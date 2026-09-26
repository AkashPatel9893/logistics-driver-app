/**
 * In-process stand-in for the driver WebSocket channel. Runs the backend's
 * time-based work every second and forwards the events it produces.
 */
import type { DriverEvent } from '@/lib/realtime/driver-events';

import { listen } from './driver/events';
import { tick } from './driver/scheduler';

const TICK_MS = 1_000;

export function subscribeMockDriverChannel(
  channel: string,
  onEvent: (event: DriverEvent) => void,
): () => void {
  const userId = channel.startsWith('driver:') ? channel.slice('driver:'.length) : null;
  if (!userId) return () => {};

  const unlisten = listen(userId, onEvent);
  const interval = setInterval(() => tick(userId), TICK_MS);
  return () => {
    clearInterval(interval);
    unlisten();
  };
}
