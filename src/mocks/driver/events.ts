/**
 * Server → driver push. The real backend publishes these on the driver's
 * WebSocket channel `driver:<userId>`; the mock fans them out in-process.
 */
import type { DriverEvent } from '@/lib/realtime/driver-events';

type Listener = (event: DriverEvent) => void;

const listeners = new Map<string, Set<Listener>>();

export function listen(userId: string, listener: Listener): () => void {
  const set = listeners.get(userId) ?? new Set<Listener>();
  set.add(listener);
  listeners.set(userId, set);
  return () => {
    set.delete(listener);
    if (set.size === 0) listeners.delete(userId);
  };
}

export function emit(userId: string, event: DriverEvent): void {
  // Deliver after the current request finishes, like a socket frame would. A
  // microtask rather than setTimeout: Android pauses JS timers in the background.
  void Promise.resolve().then(() => listeners.get(userId)?.forEach((listener) => listener(event)));
}
