/**
 * Driver realtime transport. The server pushes offers, job changes, chat and
 * payment events on `driver:<userId>` over a WebSocket (see docs/API.md). In
 * mock mode the in-app mock server emits the same events without a network.
 */
import { IS_MOCK_API, WS_URL } from '@/lib/api/config';
import { getToken } from '@/lib/auth/utils';
import { subscribeMockDriverChannel } from '@/mocks/realtime';

import type { DriverEvent } from './driver-events';

type Listener = (event: DriverEvent) => void;

const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

/** One shared socket; channels are (re)subscribed after every reconnect. */
class DriverSocket {
  private socket: WebSocket | null = null;
  private listeners = new Map<string, Set<Listener>>();
  private retries = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  subscribe(channel: string, listener: Listener): () => void {
    const set = this.listeners.get(channel) ?? new Set<Listener>();
    const isNewChannel = set.size === 0;
    set.add(listener);
    this.listeners.set(channel, set);

    this.ensureConnected();
    if (isNewChannel) this.send({ type: 'subscribe', channel });

    return () => {
      set.delete(listener);
      if (set.size > 0) return;
      this.listeners.delete(channel);
      this.send({ type: 'unsubscribe', channel });
      if (this.listeners.size === 0) this.close();
    };
  }

  private ensureConnected() {
    if (this.socket || !WS_URL) return;
    const token = getToken()?.accessToken;
    const socket = new WebSocket(token ? `${WS_URL}?token=${encodeURIComponent(token)}` : WS_URL);
    this.socket = socket;

    socket.onopen = () => {
      this.retries = 0;
      for (const channel of this.listeners.keys()) this.send({ type: 'subscribe', channel });
    };
    socket.onmessage = (message) => {
      try {
        const { channel, event } = JSON.parse(String(message.data)) as {
          channel: string;
          event: DriverEvent;
        };
        this.listeners.get(channel)?.forEach((listener) => listener(event));
      } catch {
        // Ignore malformed frames.
      }
    };
    socket.onclose = () => {
      this.socket = null;
      if (this.listeners.size > 0) this.scheduleReconnect();
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** this.retries);
    this.retries += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.ensureConnected();
    }, delay);
  }

  private send(message: object) {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message));
  }

  private close() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.socket?.close();
    this.socket = null;
  }
}

const socket = new DriverSocket();

export const driverChannel = (userId: string) => `driver:${userId}`;

/** Subscribes to the driver's channel; returns an unsubscribe function. */
export function subscribeToDriverChannel(channel: string, listener: Listener): () => void {
  return IS_MOCK_API
    ? subscribeMockDriverChannel(channel, listener)
    : socket.subscribe(channel, listener);
}
