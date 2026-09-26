/**
 * Keeps the Android floating bubble in step with the driver's state: shown
 * only while online and the app is in the background.
 *
 * - When tapped: Expands a floating card directly on the driver's screen
 *   with the list of incoming delivery requests and active trip status,
 *   instead of forcing the phone to switch apps.
 * - When a new request arrives: The request pops up right on that floating list.
 * - Tapping an offer's "View & Accept" button opens the request details in the app.
 *
 * Driven imperatively so it continues working while the app is backgrounded.
 */
import { AppState } from 'react-native';

import type { DriverJob, JobOffer } from '@/lib/api/models';
import { formatDistance, formatMinutes, formatRupees, placeName } from '@/lib/format';

import {
  canDrawOverlays,
  hideBubble,
  isBubbleSupported,
  updateBubbleOverlay,
  type BubbleActiveJobItem,
  type BubbleOfferItem,
  type BubbleOverlayData,
} from '../../modules/floating-bubble';

const SCHEME = 'logisticsdriverapp://';

const STAGE: Partial<Record<DriverJob['status'], string>> = {
  heading_to_pickup: 'To pickup',
  arrived_at_pickup: 'At pickup',
  pickup_complete: 'To drop',
  arrived_at_drop: 'At drop',
};

const state = {
  isOnline: false,
  job: null as DriverJob | null,
  offers: [] as JobOffer[],
  seenOfferIds: new Set<string>(),
  pendingAutoExpand: false,
};

function sync(): void {
  if (!isBubbleSupported) return;
  // Read live rather than cached: a missed change event must not strand the bubble.
  const inBackground = AppState.currentState !== 'active';
  if (!state.isOnline || !inBackground || !canDrawOverlays()) {
    void hideBubble();
    return;
  }

  // Filter out any offers whose expiry time has elapsed
  const now = Date.now();
  const activeOffers = state.offers.filter((o) => Date.parse(o.expiresAt) > now);

  // Check if a new offer arrived that hasn't been seen yet
  let hasNewOffer = false;
  for (const offer of activeOffers) {
    if (!state.seenOfferIds.has(offer.id)) {
      state.seenOfferIds.add(offer.id);
      hasNewOffer = true;
    }
  }

  const autoExpand = state.pendingAutoExpand || hasNewOffer;
  state.pendingAutoExpand = false;

  const formattedOffers: BubbleOfferItem[] = activeOffers.map((offer) => ({
    id: offer.id,
    orderNumber: offer.orderNumber,
    vehicleName: offer.vehicle.name,
    earning: formatRupees(offer.driverEarning),
    pickupAddress: placeName(offer.pickup.label),
    dropAddress: placeName(offer.drop.label),
    pickupDistance:
      offer.pickupDistanceKm !== null
        ? `${formatDistance(offer.pickupDistanceKm)} to pickup`
        : 'Nearby pickup',
    tripDistance: `${formatDistance(offer.tripDistanceKm)} · ${formatMinutes(offer.estimatedMinutes)}`,
    estimatedTime: formatMinutes(offer.estimatedMinutes),
    deepLink: `${SCHEME}incoming-job?offerId=${offer.id}`,
  }));

  let formattedJob: BubbleActiveJobItem | null = null;
  if (state.job) {
    const target =
      state.job.status === 'heading_to_pickup' || state.job.status === 'arrived_at_pickup'
        ? state.job.pickup
        : state.job.drop;
    formattedJob = {
      id: state.job.id,
      orderNumber: state.job.number,
      stageTitle: STAGE[state.job.status] ?? 'On a trip',
      targetAddress: placeName(target.label),
      customerName: state.job.sender.name,
      earning: formatRupees(state.job.driverEarning),
      deepLink: `${SCHEME}active-delivery`,
    };
  }

  let summaryTitle = "You're online";
  let summarySubtitle = 'Finding requests';
  let highlight = false;

  if (formattedOffers.length > 0) {
    const count = formattedOffers.length;
    summaryTitle = `${count} new request${count > 1 ? 's' : ''} · ${formattedOffers[0].earning}`;
    summarySubtitle = formattedOffers[0].pickupDistance;
    highlight = true;
  } else if (formattedJob) {
    summaryTitle = formattedJob.stageTitle;
    summarySubtitle = formattedJob.targetAddress;
    highlight = (state.job?.unreadMessages ?? 0) > 0;
  }

  const payload: BubbleOverlayData = {
    isOnline: state.isOnline,
    summaryTitle,
    summarySubtitle,
    defaultDeepLink: `${SCHEME}home`,
    highlight,
    autoExpand,
    offers: formattedOffers,
    activeJob: formattedJob,
  };

  void updateBubbleOverlay(payload);
}

/**
 * Re-evaluates the bubble. Called on every background GPS fix, which also
 * catches the overlay permission being granted while the app is backgrounded.
 */
export function refreshBubble(): void {
  sync();
}

let started = false;

/** Starts following app foreground/background changes. Safe to call repeatedly. */
export function startBubbleTracking(): void {
  if (started || !isBubbleSupported) return;
  started = true;
  AppState.addEventListener('change', () => sync());
}

export function setBubbleOnline(isOnline: boolean): void {
  state.isOnline = isOnline;
  sync();
}

export function setBubbleJob(job: DriverJob | null): void {
  state.job = job && job.status !== 'delivered' && job.status !== 'cancelled' ? job : null;
  sync();
}

/** Sets the list of available offers. */
export function setBubbleOffers(offers: JobOffer[]): void {
  const now = Date.now();
  const valid = offers.filter((o) => Date.parse(o.expiresAt) > now);

  // If a new offer was added, mark for auto-expand
  const hasUnseen = valid.some((o) => !state.seenOfferIds.has(o.id));
  if (hasUnseen) {
    state.pendingAutoExpand = true;
  }

  state.offers = valid;
  sync();
}

/** Adds or updates an incoming offer. Auto-expands the list on the driver's screen. */
export function addBubbleOffer(offer: JobOffer): void {
  if (Date.parse(offer.expiresAt) <= Date.now()) return;
  if (!state.seenOfferIds.has(offer.id)) {
    state.pendingAutoExpand = true;
  }
  state.offers = [...state.offers.filter((o) => o.id !== offer.id), offer];
  sync();
}

/** Removes an expired or rejected offer. */
export function removeBubbleOffer(offerId: string): void {
  state.offers = state.offers.filter((o) => o.id !== offerId);
  sync();
}

/** Backwards-compatible single offer setter. */
export function setBubbleOffer(offer: JobOffer | null): void {
  setBubbleOffers(offer ? [offer] : []);
}

export {
  canDrawOverlays,
  isBubbleSupported,
  openOverlaySettings,
} from '../../modules/floating-bubble';
