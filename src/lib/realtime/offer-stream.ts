/**
 * Live dispatch offers over the backend's Server-Sent Events stream (`GET /partner/offers/stream`).
 * Read with Expo's native streaming fetch, so no SSE library is needed. Events land in the same
 * React Query cache that polling fills, and polling stays on as a slow safety net: delivery is
 * best-effort and the stream can drop at any time.
 */
import { fetch } from 'expo/fetch';

import { queryClient } from '@/lib/api/api-provider';
import { API_BASE_URL } from '@/lib/api/config';
import { jobsApi, mapJobOffer } from '@/lib/api/jobs';
import type { JobOffer } from '@/lib/api/models';
import { getToken } from '@/lib/auth/utils';
import { queryKeys } from '@/lib/queries/keys';

/** Waits between reconnect attempts; the last one repeats. */
const RECONNECT_DELAYS_MS = [1_000, 2_000, 5_000, 10_000, 30_000];
/**
 * The server pings every 15 s. Silence for longer means the connection stalled without closing,
 * so it is dropped: polling speeds up and a fresh stream is opened.
 */
const STALL_TIMEOUT_MS = 35_000;

let subscribers = 0;
let controller: AbortController | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
let failures = 0;
let live = false;
const liveListeners = new Set<() => void>();

function setLive(next: boolean) {
  if (live === next) return;
  live = next;
  liveListeners.forEach((listener) => listener());
}

export function isOfferStreamLive(): boolean {
  return live;
}

export function onOfferStreamLiveChange(listener: () => void): () => void {
  liveListeners.add(listener);
  return () => liveListeners.delete(listener);
}

/** Bad offer data is skipped rather than breaking the whole list. */
function toOffer(raw: unknown): JobOffer | null {
  try {
    return mapJobOffer(raw);
  } catch {
    return null;
  }
}

function handleEvent(event: string, data: string) {
  const payload = JSON.parse(data);
  if (event === 'snapshot' && Array.isArray(payload)) {
    // A fresh snapshot is the source of truth after every (re)connect.
    queryClient.setQueryData<JobOffer[]>(
      queryKeys.offers,
      payload.flatMap((raw) => toOffer(raw) ?? []),
    );
    failures = 0;
    setLive(true);
  } else if (event === 'offer_created') {
    const offer = toOffer(payload);
    if (!offer) return;
    // Events can arrive twice, so offers are keyed by id.
    queryClient.setQueryData<JobOffer[]>(queryKeys.offers, (current = []) => [
      offer,
      ...current.filter((o) => o.id !== offer.id),
    ]);
  } else if (event === 'offer_closed' && payload?.offer_id) {
    queryClient.setQueryData<JobOffer[]>(queryKeys.offers, (current = []) =>
      current.filter((o) => o.id !== String(payload.offer_id)),
    );
  }
}

/** Splits the text stream into SSE events: blocks separated by a blank line. */
function consume(buffer: string): string {
  const blocks = buffer.split(/\r?\n\r?\n/);
  const rest = blocks.pop() ?? '';
  for (const block of blocks) {
    let event = 'message';
    const data: string[] = [];
    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith(':')) continue; // keep-alive ping
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
    }
    if (data.length === 0) continue;
    try {
      handleEvent(event, data.join('\n'));
    } catch {
      // A malformed event is dropped; the next snapshot resyncs.
    }
  }
  return rest;
}

function scheduleReconnect() {
  setLive(false);
  if (subscribers === 0) return;
  const delay = RECONNECT_DELAYS_MS[Math.min(failures, RECONNECT_DELAYS_MS.length - 1)];
  failures += 1;
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(connect, delay);
}

async function connect() {
  const token = getToken()?.accessToken;
  if (!token || subscribers === 0) return;
  const abort = new AbortController();
  controller = abort;
  try {
    const res = await fetch(`${API_BASE_URL}/partner/offers/stream`, {
      headers: {
        Accept: 'text/event-stream',
        Authorization: `Bearer ${token}`,
        'X-Client-App': 'driver',
      },
      signal: abort.signal,
    });
    if (res.status === 401) {
      // A normal request refreshes an expired token (or ends the session); then try again.
      await jobsApi.getOffers().catch(() => undefined);
      throw new Error('unauthorized');
    }
    if (!res.ok || !res.body) throw new Error(`stream ${res.status}`);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let stallTimer: ReturnType<typeof setTimeout> | undefined;
    const armStallTimer = () => {
      clearTimeout(stallTimer);
      stallTimer = setTimeout(() => abort.abort(), STALL_TIMEOUT_MS);
    };
    armStallTimer();
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        armStallTimer();
        buffer = consume(buffer + decoder.decode(value, { stream: true }));
      }
    } finally {
      clearTimeout(stallTimer);
    }
  } catch {
    // Closed, offline or refused: handled below.
  }
  // A stall aborts this request while it is still the current one; a disconnect replaces it.
  if (controller === abort && subscribers > 0) scheduleReconnect();
}

function disconnect() {
  clearTimeout(reconnectTimer);
  controller?.abort();
  controller = null;
  failures = 0;
  setLive(false);
}

/** Keeps one shared stream open while anything subscribes; returns the unsubscribe. */
export function subscribeToOfferStream(): () => void {
  subscribers += 1;
  if (subscribers === 1) void connect();
  return () => {
    subscribers -= 1;
    if (subscribers === 0) disconnect();
  };
}
